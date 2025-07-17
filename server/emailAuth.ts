import { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { emailService } from "./emailService";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'meal-planning-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Redirect old login route to new auth page
  app.get("/api/login", (req, res) => {
    res.redirect("/auth");
  });

  // Redirect old logout route to new logout endpoint
  app.get("/api/logout", (req, res) => {
    res.redirect("/api/auth/logout");
  });

  // Sign up endpoint (supports both JSON and form data)
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with trial status and 10 free meals
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        subscriptionStatus: "trial",
        mealCredits: 10,
      });

      // Create session
      (req.session as any).userId = newUser.id;
      
      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(newUser);
      } catch (error) {
        console.error("Failed to send welcome email:", error);
        // Continue with signup even if email fails
      }
      
      // If this is a form submission, redirect to dashboard
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        return res.redirect('/');
      }
      
      res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          subscriptionStatus: newUser.subscriptionStatus,
          mealCredits: newUser.mealCredits,
        }
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        return res.redirect('/auth?error=signup_failed');
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login endpoint (supports both JSON and form data)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session
      (req.session as any).userId = user.id;
      
      // If this is a form submission, redirect to dashboard
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        return res.redirect('/');
      }
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionStatus: user.subscriptionStatus,
          mealCredits: user.mealCredits,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        return res.redirect('/auth?error=login_failed');
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionStatus: user.subscriptionStatus,
        mealCredits: user.mealCredits,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Logout endpoint (GET version for redirects)
  app.get("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  (req as any).user = user;
  next();
};

export const requireAuth: RequestHandler = isAuthenticated;