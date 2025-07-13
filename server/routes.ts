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
      const weekStart = weekStartDate ? new Date(weekStartDate) : new Date();
      const groceryListData = insertGroceryListSchema.parse({
        userId,
        weekStartDate: weekStart,
        ingredients: groceryCategories
      });
      
      console.log(`Saving grocery list for user ${userId}, weekStart: ${weekStart.toISOString()}, ingredients count: ${groceryCategories.length}`);
      
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
      
      console.log(`Fetching grocery list for user ${userId}, date: ${weekStartDate.toISOString()}`);
      
      const groceryList = await storage.getGroceryList(userId, weekStartDate);
      console.log(`Found grocery list:`, groceryList);
      
      if (!groceryList) {
        console.log("No grocery list found, returning empty ingredients");
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

  // Custom recipe routes
  app.get('/api/recipes/user', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const recipes = await storage.getUserRecipes(userId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching user recipes:", error);
      res.status(500).json({ message: "Failed to fetch user recipes" });
    }
  });

  app.post('/api/recipes/create', requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate required fields
      const { title, ingredients } = req.body;
      if (!title || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: "Title and ingredients are required" });
      }

      // Create the recipe
      const recipe = await storage.createMeal({
        title,
        description: req.body.description || "",
        cuisine: req.body.cuisine || "",
        protein: req.body.protein || "",
        cookingTime: req.body.cookingTime || null,
        rating: "5.0", // Default rating for user recipes
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80", // Default recipe image
        imageDescription: "A beautifully prepared homemade dish",
        ingredients,
        instructions: req.body.instructions || "",
        sourceUrl: req.body.sourceUrl || null,
        isUserGenerated: true,
        userId
      });

      res.json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.post('/api/recipes/parse-url', requireAuth, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`Parsing recipe from URL: ${url}`);

      // Fetch the webpage with proper headers
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recipe from URL: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`Fetched HTML length: ${html.length} characters`);
      
      // Extract recipe information using improved parsing
      const parsedRecipe = await parseRecipeFromHtml(html, url);
      console.log(`Parsed recipe title: ${parsedRecipe.title}`);
      
      res.json(parsedRecipe);
    } catch (error) {
      console.error("Error parsing recipe URL:", error);
      res.status(500).json({ message: "Failed to parse recipe from URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse recipe from HTML using XAI
async function parseRecipeFromHtml(html: string, sourceUrl: string) {
  try {
    // First, try to extract structured data (JSON-LD) from the HTML
    const structuredData = extractStructuredData(html);
    
    if (structuredData) {
      console.log("Found structured data:", structuredData);
      return await formatStructuredRecipe(structuredData, sourceUrl);
    }
    
    // Fallback to AI parsing with cleaned HTML
    return await parseWithAI(html, sourceUrl);
  } catch (error) {
    console.error("Error parsing recipe:", error);
    throw new Error("Failed to parse recipe content");
  }
}

// Extract JSON-LD structured data from HTML
function extractStructuredData(html: string) {
  console.log("Looking for structured data in HTML...");
  
  // Look for JSON-LD script tags with recipe schema
  const jsonLdMatches = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
  
  if (!jsonLdMatches) {
    console.log("No JSON-LD script tags found");
    return null;
  }
  
  console.log(`Found ${jsonLdMatches.length} JSON-LD script tags`);
  
  for (let i = 0; i < jsonLdMatches.length; i++) {
    const match = jsonLdMatches[i];
    try {
      const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      const data = JSON.parse(jsonContent);
      
      console.log(`Processing JSON-LD ${i + 1}:`, JSON.stringify(data, null, 2).substring(0, 500) + "...");
      
      // Handle array of structured data
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        // Check for Recipe type directly
        if (item['@type'] === 'Recipe') {
          console.log("Found Recipe in structured data");
          return item;
        }
        
        // Check for Recipe in @graph array
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          const recipe = item['@graph'].find((g: any) => g['@type'] === 'Recipe');
          if (recipe) {
            console.log("Found Recipe in @graph");
            return recipe;
          }
        }
        
        // Check for nested arrays or objects that might contain Recipe
        if (Array.isArray(item)) {
          for (const subItem of item) {
            if (subItem['@type'] === 'Recipe') {
              console.log("Found Recipe in nested array");
              return subItem;
            }
          }
        }
      }
    } catch (e) {
      console.log(`Error parsing JSON-LD ${i + 1}:`, e.message);
      continue; // Try next script tag
    }
  }
  
  console.log("No Recipe structured data found");
  return null;
}

// Format structured recipe data
async function formatStructuredRecipe(data: any, sourceUrl: string) {
  // Extract ingredients and ensure they serve 4 people
  let ingredients = [];
  if (data.recipeIngredient) {
    ingredients = Array.isArray(data.recipeIngredient) ? data.recipeIngredient : [data.recipeIngredient];
  }
  
  // Extract instructions
  let instructions = "";
  if (data.recipeInstructions) {
    const instructionList = Array.isArray(data.recipeInstructions) ? data.recipeInstructions : [data.recipeInstructions];
    instructions = instructionList.map((inst: any) => {
      if (typeof inst === 'string') return inst;
      if (inst.text) return inst.text;
      if (inst.name) return inst.name;
      return '';
    }).filter(Boolean).join(' ');
  }
  
  // Extract cooking time
  let cookingTime = null;
  if (data.totalTime) {
    cookingTime = parseDuration(data.totalTime);
  } else if (data.cookTime) {
    cookingTime = parseDuration(data.cookTime);
  }
  
  // Clean up ingredients (replace seed oils, ensure 4 servings)
  const cleanedIngredients = await cleanIngredients(ingredients);
  
  return {
    title: data.name || "Recipe",
    description: data.description || "",
    cuisine: determineCuisine(data.name, data.description),
    protein: determineProtein(cleanedIngredients),
    cookingTime,
    ingredients: cleanedIngredients,
    instructions: instructions || ""
  };
}

// Parse duration string (ISO 8601 or common formats)
function parseDuration(duration: string): number | null {
  if (!duration) return null;
  
  // ISO 8601 format (PT30M)
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0');
    const minutes = parseInt(isoMatch[2] || '0');
    return hours * 60 + minutes;
  }
  
  // Common formats (30 minutes, 1 hour 30 minutes, etc.)
  const timeMatch = duration.match(/(\d+)\s*(hour|hr|h|minute|min|m)/gi);
  if (timeMatch) {
    let totalMinutes = 0;
    for (const match of timeMatch) {
      const [, num, unit] = match.match(/(\d+)\s*(hour|hr|h|minute|min|m)/i) || [];
      const value = parseInt(num);
      if (unit.toLowerCase().startsWith('h')) {
        totalMinutes += value * 60;
      } else {
        totalMinutes += value;
      }
    }
    return totalMinutes;
  }
  
  return null;
}

// Clean ingredients and ensure they serve 4 people
async function cleanIngredients(ingredients: string[]): Promise<string[]> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ 
    baseURL: "https://api.x.ai/v1", 
    apiKey: process.env.XAI_API_KEY 
  });

  const prompt = `
    Please clean and adjust these recipe ingredients to serve exactly 4 people. Replace any seed oils (canola, vegetable, sunflower, etc.) with EVOO or avocado oil.
    
    Original ingredients:
    ${ingredients.map(ing => `- ${ing}`).join('\n')}
    
    Return ONLY a JSON array of cleaned ingredients:
    ["ingredient 1", "ingredient 2", ...]
    
    Requirements:
    - Scale quantities for 4 servings
    - Replace seed oils with EVOO or avocado oil
    - Keep measurements clear and practical
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content || "[]");
    return Array.isArray(result) ? result : ingredients;
  } catch (error) {
    console.error("Error cleaning ingredients:", error);
    return ingredients;
  }
}

// Determine cuisine type from recipe name and description
function determineCuisine(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes('italian') || text.includes('pasta') || text.includes('pizza') || text.includes('risotto')) return 'Italian';
  if (text.includes('mexican') || text.includes('taco') || text.includes('enchilada') || text.includes('burrito')) return 'Mexican';
  if (text.includes('asian') || text.includes('chinese') || text.includes('thai') || text.includes('soy sauce')) return 'Asian';
  if (text.includes('mediterranean') || text.includes('greek') || text.includes('olive')) return 'Mediterranean';
  if (text.includes('indian') || text.includes('curry') || text.includes('masala')) return 'Indian';
  if (text.includes('french') || text.includes('cream sauce')) return 'French';
  
  return 'American';
}

// Determine main protein from ingredients
function determineProtein(ingredients: string[]): string {
  const text = ingredients.join(' ').toLowerCase();
  
  if (text.includes('chicken')) return 'Chicken';
  if (text.includes('beef') || text.includes('steak')) return 'Beef';
  if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) return 'Fish';
  if (text.includes('pork') || text.includes('bacon')) return 'Pork';
  if (text.includes('tofu')) return 'Tofu';
  
  return 'Vegetarian';
}

// Fallback AI parsing for when structured data isn't available
async function parseWithAI(html: string, sourceUrl: string) {
  console.log("Falling back to AI parsing...");
  
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ 
    baseURL: "https://api.x.ai/v1", 
    apiKey: process.env.XAI_API_KEY 
  });

  // More targeted cleaning to preserve recipe content
  let cleanHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
    .replace(/<header[^>]*>.*?<\/header>/gis, '')
    .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
    .replace(/<aside[^>]*>.*?<\/aside>/gis, '');

  // Look for recipe-specific content sections
  const recipeMatches = cleanHtml.match(/<div[^>]*recipe[^>]*>.*?<\/div>/gis) ||
                       cleanHtml.match(/<article[^>]*recipe[^>]*>.*?<\/article>/gis) ||
                       cleanHtml.match(/<section[^>]*recipe[^>]*>.*?<\/section>/gis);
  
  if (recipeMatches && recipeMatches.length > 0) {
    console.log("Found recipe-specific content sections");
    cleanHtml = recipeMatches.join(' ');
  }

  // Final cleanup
  cleanHtml = cleanHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take a larger chunk to ensure we capture the full recipe
  const textContent = cleanHtml.substring(0, 8000);
  
  console.log(`Using text content length: ${textContent.length} chars`);

  const prompt = `
    I need you to extract the EXACT recipe from this specific webpage: ${sourceUrl}
    
    Website content:
    ${textContent}
    
    This URL should contain a specific recipe. Please find and extract ONLY that recipe's information.
    
    Return a JSON object with these exact fields:
    {
      "title": "Exact recipe title from the page",
      "description": "Recipe description or summary",
      "cuisine": "Type of cuisine (Italian, Mexican, etc.)",
      "protein": "Main protein (Chicken, Beef, Fish, Vegetarian, etc.)",
      "cookingTime": 30,
      "ingredients": ["ingredient 1 for 4 servings", "ingredient 2 for 4 servings"],
      "instructions": "Complete cooking instructions"
    }
    
    Requirements:
    - Find the MAIN recipe on this page, not random content
    - Scale ingredients to serve exactly 4 people
    - Replace any seed oils (canola, vegetable, sunflower) with EVOO or avocado oil
    - Extract the actual recipe title from the page, not a generic name
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1200
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    console.log("AI parsing result:", result.title);
    
    return {
      title: result.title || "Recipe",
      description: result.description || "",
      cuisine: result.cuisine || "",
      protein: result.protein || "",
      cookingTime: result.cookingTime || null,
      ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
      instructions: result.instructions || ""
    };
  } catch (error) {
    console.error("AI parsing error:", error);
    throw error;
  }
}
