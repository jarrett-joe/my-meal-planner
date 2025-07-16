import { Express } from "express";
import { RequestHandler } from "express";

// Simple session-like storage for demo purposes
const sessionStore = new Map();

export function getSession() {
  return (req: any, res: any, next: any) => {
    // Create a simple session ID based on IP and user agent
    const sessionId = Buffer.from(req.ip + req.get('user-agent') || '').toString('base64');
    req.sessionId = sessionId;
    
    // Get or create session data
    if (!sessionStore.has(sessionId)) {
      sessionStore.set(sessionId, {
        id: sessionId,
        email: `user${sessionId.slice(0, 8)}@example.com`,
        firstName: 'Demo',
        lastName: 'User',
        subscriptionStatus: 'trial',
        mealCredits: 10,
        createdAt: new Date(),
      });
    }
    
    req.user = sessionStore.get(sessionId);
    next();
  };
}

export async function setupAuth(app: Express) {
  // Simple session middleware
  app.use(getSession());
  
  // Auth endpoints for compatibility
  app.get("/api/auth/user", (req: any, res) => {
    res.json(req.user);
  });
  
  app.get("/api/login", (req, res) => {
    // Redirect directly to dashboard since no auth needed
    res.redirect("/dashboard");
  });
  
  app.get("/api/callback", (req, res) => {
    res.redirect("/dashboard");
  });
  
  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });
  
  app.post("/api/auth/admin-logout", (req, res) => {
    res.json({ success: true });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Always allow access - no authentication required
  next();
};

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  // Always allow access - no authentication required
  next();
};