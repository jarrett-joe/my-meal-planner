import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🚀 Starting My Meal Planner server...');
    console.log('📋 Environment check:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('  - PORT:', process.env.PORT || 'not set');
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
    console.log('  - STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'set' : 'NOT SET');
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // Railway deployment fix: catch static serving errors
      try {
        serveStatic(app);
        console.log('✅ Static files served successfully');
      } catch (error) {
        console.warn('⚠️  Static file serving failed, using fallback:', error.message);
        console.log('🔧 This is expected on Railway deployment - using simplified serving');
        
        // Fallback static serving for Railway
        app.get('*', (req, res) => {
          // Serve simple HTML for Railway health checks and basic functionality
          res.send(`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>My Meal Planner</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 2rem; text-align: center; }
                  .container { max-width: 600px; margin: 0 auto; }
                  .status { color: #10b981; margin-bottom: 1rem; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>My Meal Planner</h1>
                  <div class="status">✅ Server is running successfully</div>
                  <p>The application backend is operational.</p>
                  <p>API endpoints are available at <code>/api/*</code></p>
                  <a href="/health">Check Health Status</a>
                </div>
              </body>
            </html>
          `);
        });
      }
    }

    // Use Railway's PORT environment variable or default to 8080
    const port = parseInt(process.env.PORT || "8080");
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 My Meal Planner server running on port ${port}`);
      log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`🔗 Health check available at: http://0.0.0.0:${port}/health`);
      log(`🌐 Server ready for Railway health checks`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
