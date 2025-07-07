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
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
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
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || { proteinPreferences: [], cuisinePreferences: [], dietaryRestrictions: [] });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/meals/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { proteinPreferences = [], cuisinePreferences = [], count = 6 } = req.body;
      
      if (!Array.isArray(proteinPreferences) || !Array.isArray(cuisinePreferences)) {
        return res.status(400).json({ message: "Invalid preferences format" });
      }

      // Check if user has sufficient meal credits (trial or subscription)
      if (user.mealCredits < count) {
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
        [],
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

      // Deduct meal credits for successful generation
      for (let i = 0; i < count; i++) {
        await storage.deductMealCredit(userId);
      }

      res.json(savedMeals.filter(Boolean));
    } catch (error) {
      console.error("Error generating meal suggestions:", error);
      res.status(500).json({ message: "Failed to generate meal suggestions" });
    }
  });

  // Meal selections
  app.get('/api/meal-selections/:weekStart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekStartDate = new Date(req.params.weekStart);
      
      const selections = await storage.getUserMealSelections(userId, weekStartDate);
      res.json(selections);
    } catch (error) {
      console.error("Error fetching meal selections:", error);
      res.status(500).json({ message: "Failed to fetch meal selections" });
    }
  });

  app.post('/api/meal-selections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.delete('/api/meal-selections/:mealId/:weekStart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealId = parseInt(req.params.mealId);
      const weekStartDate = new Date(req.params.weekStart);
      
      await storage.removeMealSelection(userId, mealId, weekStartDate);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing meal selection:", error);
      res.status(500).json({ message: "Failed to remove meal selection" });
    }
  });

  // Grocery list generation
  app.post('/api/grocery-list/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.subscriptionStatus !== 'active') {
        return res.status(403).json({ message: "Active subscription required" });
      }

      const { mealIds, weekStartDate } = req.body;
      
      if (!Array.isArray(mealIds) || mealIds.length === 0) {
        return res.status(400).json({ message: "No meals selected" });
      }

      // Fetch selected meals
      const meals = await Promise.all(
        mealIds.map((id: number) => storage.getMeal(id))
      );

      const validMeals = meals.filter(Boolean) as Meal[];
      
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

  app.get('/api/grocery-list/:weekStart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekStartDate = new Date(req.params.weekStart);
      
      const groceryList = await storage.getGroceryList(userId, weekStartDate);
      res.json(groceryList);
    } catch (error) {
      console.error("Error fetching grocery list:", error);
      res.status(500).json({ message: "Failed to fetch grocery list" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites/:mealId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealId = parseInt(req.params.mealId);
      const favorite = await storage.addToFavorites(userId, mealId);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete('/api/favorites/:mealId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mealId = parseInt(req.params.mealId);
      await storage.removeFromFavorites(userId, mealId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Calendar routes
  app.get('/api/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const calendarMeals = await storage.getCalendarMeals(userId, startDate, endDate);
      res.json(calendarMeals);
    } catch (error) {
      console.error("Error fetching calendar meals:", error);
      res.status(500).json({ message: "Failed to fetch calendar meals" });
    }
  });

  app.post('/api/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mealId, scheduledDate, mealType } = req.body;
      const calendarEntry = await storage.addToCalendar({
        userId,
        mealId: parseInt(mealId),
        scheduledDate,
        mealType: mealType || 'dinner'
      });
      res.json(calendarEntry);
    } catch (error) {
      console.error("Error adding to calendar:", error);
      res.status(500).json({ message: "Failed to add to calendar" });
    }
  });

  app.delete('/api/calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
