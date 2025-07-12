import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateMealSuggestions, generateGroceryList } from "./grok";
import { 
  insertUserPreferencesSchema,
  insertMealSchema,
  insertUserMealSelectionSchema,
  insertGroceryListSchema,
  type Meal 
} from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Master admin login route
  app.post('/api/auth/admin-login', async (req, res) => {
    const { username, password } = req.body;
    
    // Simple admin credentials (you can change these)
    if (username === 'admin' && password === 'planmyplates2025') {
      // Create or get admin user
      let adminUser = await storage.getUser('admin-master');
      if (!adminUser) {
        adminUser = await storage.upsertUser({
          id: 'admin-master',
          email: 'admin@planmyplates.com',
          firstName: 'Master',
          lastName: 'Admin',
          profileImageUrl: null,
          mealCredits: 999999,
          subscriptionPlan: 'premium',
          subscriptionStatus: 'active'
        });
      }

      // Set session
      req.session.adminUser = adminUser;
      res.json({ success: true, user: adminUser });
    } else {
      res.status(401).json({ message: "Invalid admin credentials" });
    }
  });

  // Admin logout
  app.post('/api/auth/admin-logout', (req, res) => {
    req.session.adminUser = null;
    res.json({ success: true });
  });

  // Create unlimited user endpoint (admin only)
  app.post('/api/admin/create-unlimited-user', async (req: any, res) => {
    try {
      // Check admin session
      if (!req.session?.adminUser) {
        return res.status(401).json({ message: "Admin access required" });
      }

      const { userId, email, firstName, lastName } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }

      // Create or update user with unlimited credits
      const unlimitedUser = await storage.upsertUser({
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "premium", // Give premium status
        subscriptionPlan: "unlimited",
        mealCredits: 999999, // Virtually unlimited
        totalMealsUsed: 0,
      });

      res.json({ 
        success: true, 
        user: unlimitedUser,
        message: `User ${userId} created with unlimited credits` 
      });
    } catch (error) {
      console.error("Error creating unlimited user:", error);
      res.status(500).json({ message: "Failed to create unlimited user" });
    }
  });

  // Helper function to get user ID from session or auth
  const getUserId = (req: any) => {
    if (req.session?.adminUser) {
      return req.session.adminUser.id;
    }
    return req.user?.claims?.sub;
  };

  // Custom auth middleware that supports admin sessions
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.adminUser) {
      return next(); // Admin session is valid
    }
    return isAuthenticated(req, res, next); // Use regular auth
  };

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for admin session first
      if (req.session.adminUser) {
        return res.json(req.session.adminUser);
      }

      // Regular auth check
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subscription management
  app.post('/api/get-or-create-subscription', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object' && subscription.latest_invoice.payment_intent) {
          const paymentIntent = typeof subscription.latest_invoice.payment_intent === 'string' 
            ? await stripe.paymentIntents.retrieve(subscription.latest_invoice.payment_intent)
            : subscription.latest_invoice.payment_intent;

          return res.json({
            subscriptionId: subscription.id,
            clientSecret: paymentIntent.client_secret,
          });
        }
      }

      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_default', // User needs to set this from Stripe dashboard
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Create meal-based subscription
  app.post('/api/create-subscription', requireAuth, async (req: any, res) => {
    const userId = getUserId(req);
    const { planId } = req.body;
    
    let user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Define meal plans and their Stripe price mapping
    const mealPlans = {
      basic: { meals: 20, priceId: process.env.STRIPE_PRICE_BASIC || 'price_basic' },
      standard: { meals: 40, priceId: process.env.STRIPE_PRICE_STANDARD || 'price_standard' },
      premium: { meals: 60, priceId: process.env.STRIPE_PRICE_PREMIUM || 'price_premium' }
    };

    const selectedPlan = mealPlans[planId as keyof typeof mealPlans];
    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret,
        });
        return;
      } catch (error) {
        console.error("Error retrieving existing subscription:", error);
      }
    }
    
    if (!user.email) {
      return res.status(400).json({ message: 'No user email on file' });
    }

    try {
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, customerId, "");
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: selectedPlan.priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          planId,
          mealCredits: selectedPlan.meals.toString(),
        },
      });

      await storage.updateUserStripeInfo(user.id, customerId, subscription.id);
      
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;
  
      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Stripe subscription error:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // User preferences
  app.get('/api/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || { proteinPreferences: [], cuisinePreferences: [], allergyPreferences: [] });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validated = insertUserPreferencesSchema.parse({
        ...req.body,
        userId
      });
      
      const preferences = await storage.upsertUserPreferences(validated);
      res.json(preferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Meal suggestions with credit deduction
  app.post('/api/meals/suggestions', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get preferences from user's stored preferences, not request body
      const preferences = await storage.getUserPreferences(userId);
      const proteinPreferences = preferences?.proteinPreferences || [];
      const cuisinePreferences = preferences?.cuisinePreferences || [];
      const allergyPreferences = preferences?.allergyPreferences || [];
      const count = req.body.count || 6;

      // Skip credit check for admin users and unlimited users
      if (user.id !== 'admin-master' && user.subscriptionPlan !== 'unlimited' && user.mealCredits < count) {
        return res.status(402).json({ 
          message: "Insufficient meal credits",
          creditsAvailable: user.mealCredits,
          creditsRequired: count,
          redirectTo: "/subscribe"
        });
      }

      const suggestions = await generateMealSuggestions(
        proteinPreferences,
        cuisinePreferences,
        allergyPreferences,
        count
      );

      // Store meals in database for future reference
      const savedMeals = await Promise.all(
        suggestions.map(async (suggestion) => {
          try {
            const mealData = insertMealSchema.parse({
              title: suggestion.title,
              description: suggestion.description,
              cuisine: suggestion.cuisine,
              protein: suggestion.protein,
              cookingTime: suggestion.cookingTime,
              rating: suggestion.rating?.toString(),
              ingredients: suggestion.ingredients,
              instructions: suggestion.instructions,
              imageUrl: suggestion.imageUrl,
              imageDescription: suggestion.imageDescription,
              sourceUrl: suggestion.sourceUrl,
            });
            
            return await storage.createMeal(mealData);
          } catch (error) {
            console.error("Error saving meal:", error);
            return null;
          }
        })
      );

      // Deduct meal credits for successful generation (skip for admin and unlimited users)
      if (user.id !== 'admin-master' && user.subscriptionPlan !== 'unlimited') {
        for (let i = 0; i < count; i++) {
          await storage.deductMealCredit(userId);
        }
      }

      res.json(savedMeals.filter(Boolean));
    } catch (error) {
      console.error("Error generating meal suggestions:", error);
      res.status(500).json({ message: "Failed to generate meal suggestions" });
    }
  });

  // Meal selections
  app.get('/api/meal-selections/:weekStart', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const weekStartDate = new Date(req.params.weekStart);
      
      const selections = await storage.getUserMealSelections(userId, weekStartDate);
      res.json(selections);
    } catch (error) {
      console.error("Error fetching meal selections:", error);
      res.status(500).json({ message: "Failed to fetch meal selections" });
    }
  });

  app.post('/api/meal-selections', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validated = insertUserMealSelectionSchema.parse({
        ...req.body,
        userId
      });
      
      const selection = await storage.addMealSelection(validated);
      res.json(selection);
    } catch (error) {
      console.error("Error adding meal selection:", error);
      res.status(500).json({ message: "Failed to add meal selection" });
    }
  });

  app.delete('/api/meal-selections/:mealId/:weekStart', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mealId = parseInt(req.params.mealId);
      const weekStartDate = new Date(req.params.weekStart);
      
      await storage.removeMealSelection(userId, mealId, weekStartDate);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing meal selection:", error);
      res.status(500).json({ message: "Failed to remove meal selection" });
    }
  });

  // Grocery list generation from calendar meals
  app.post('/api/grocery-list/generate', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.subscriptionStatus !== 'active' && user.id !== 'admin-master' && user.subscriptionPlan !== 'unlimited')) {
        return res.status(403).json({ message: "Active subscription required" });
      }

      const { weekStartDate, mealIds } = req.body;
      
      let validMeals: Meal[] = [];

      if (mealIds && Array.isArray(mealIds) && mealIds.length > 0) {
        // Use selected meal IDs
        console.log(`Generating grocery list for user ${userId} with selected meals:`, mealIds);
        
        const meals = await Promise.all(
          mealIds.map((id: number) => storage.getMeal(id))
        );
        validMeals = meals.filter(Boolean) as Meal[];
        
        if (validMeals.length === 0) {
          return res.status(400).json({ message: "No valid meals found for the selected IDs." });
        }
      } else {
        // Fallback to all calendar meals for the week
        if (!weekStartDate) {
          return res.status(400).json({ message: "Week start date is required when no meals are selected." });
        }

        const startDate = new Date(weekStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // 7 day week

        console.log(`Generating grocery list for user ${userId}, week: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        // Fetch calendar meals for the week
        const calendarMeals = await storage.getCalendarMeals(userId, startDate, endDate);
        
        if (calendarMeals.length === 0) {
          return res.status(400).json({ message: "No meals scheduled for this week. Please add meals to your calendar first." });
        }

        console.log(`Found ${calendarMeals.length} calendar meals for grocery list generation`);

        // Extract the meals from calendar entries
        validMeals = calendarMeals.map(cm => cm.meal);
      }
      
      if (validMeals.length === 0) {
        return res.status(400).json({ message: "No valid meals found" });
      }

      // Convert to format expected by generateGroceryList
      const mealSuggestions = validMeals.map(meal => ({
        title: meal.title,
        description: meal.description || "",
        cuisine: meal.cuisine || "",
        protein: meal.protein || "",
        cookingTime: meal.cookingTime || 30,
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || "",
        rating: parseFloat(meal.rating || "4.5")
      }));

      const groceryCategories = await generateGroceryList(mealSuggestions);
      
      // Save grocery list
      const groceryListData = insertGroceryListSchema.parse({
        userId,
        weekStartDate: new Date(weekStartDate),
        ingredients: groceryCategories
      });
      
      const savedList = await storage.upsertGroceryList(groceryListData);
      res.json(savedList);
    } catch (error) {
      console.error("Error generating grocery list:", error);
      res.status(500).json({ message: "Failed to generate grocery list" });
    }
  });

  app.get('/api/grocery-list', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const weekStartDate = req.query.weekStartDate ? new Date(req.query.weekStartDate as string) : new Date();
      
      const groceryList = await storage.getGroceryList(userId, weekStartDate);
      if (!groceryList) {
        return res.json({ ingredients: [] });
      }
      res.json(groceryList);
    } catch (error) {
      console.error("Error fetching grocery list:", error);
      res.status(500).json({ message: "Failed to fetch grocery list" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites/:mealId', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mealId = parseInt(req.params.mealId);
      const favorite = await storage.addToFavorites(userId, mealId);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete('/api/favorites/:mealId', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const mealId = parseInt(req.params.mealId);
      await storage.removeFromFavorites(userId, mealId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Calendar routes
  app.get('/api/calendar', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      console.log(`Calendar GET request: userId=${userId}, startDate=${req.query.startDate}, endDate=${req.query.endDate}`);
      
      const calendarMeals = await storage.getCalendarMeals(userId, startDate, endDate);
      
      console.log(`Calendar meals found: ${calendarMeals.length} meals for user ${userId}`);
      console.log('Calendar meals data:', JSON.stringify(calendarMeals, null, 2));
      
      res.json(calendarMeals);
    } catch (error) {
      console.error("Error fetching calendar meals:", error);
      res.status(500).json({ message: "Failed to fetch calendar meals" });
    }
  });

  app.post('/api/calendar', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { mealId, scheduledDate, mealType } = req.body;
      
      console.log(`Calendar POST request: userId=${userId}, mealId=${mealId}, scheduledDate=${scheduledDate}, mealType=${mealType}`);
      
      const calendarEntry = await storage.addToCalendar({
        userId,
        mealId: parseInt(mealId),
        scheduledDate,
        mealType: mealType || 'dinner'
      });
      
      console.log('Calendar entry created:', JSON.stringify(calendarEntry, null, 2));
      
      res.json(calendarEntry);
    } catch (error) {
      console.error("Error adding to calendar:", error);
      res.status(500).json({ message: "Failed to add to calendar" });
    }
  });

  app.delete('/api/calendar', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { scheduledDate, mealType } = req.query;
      await storage.removeFromCalendar(userId, new Date(scheduledDate as string), mealType as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from calendar:", error);
      res.status(500).json({ message: "Failed to remove from calendar" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
