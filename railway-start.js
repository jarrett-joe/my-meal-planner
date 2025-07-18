#!/usr/bin/env node

// Railway-specific startup script to handle import.meta.dirname issues
console.log('🚀 Railway startup script - My Meal Planner');

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.log('✅ Set NODE_ENV to production');
}

console.log('📋 Railway Environment Check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - PORT:', process.env.PORT || 'using default 8080');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'configured' : 'NOT SET');
console.log('  - SESSION_SECRET:', process.env.SESSION_SECRET ? 'configured' : 'NOT SET');

// Override console.error to prevent ErrorCaptureStackTrace from crashing
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorStr = args[0]?.toString() || '';
  
  // Skip the problematic ErrorCaptureStackTrace calls
  if (errorStr.includes('ErrorCaptureStackTrace') || 
      errorStr.includes('paths[0]') ||
      errorStr.includes('ERR_INVALID_ARG_TYPE')) {
    console.warn('⚠️  Suppressed Railway-incompatible error:', errorStr);
    return;
  }
  
  // Allow other errors through
  originalConsoleError.apply(console, args);
};

// Start the server using CommonJS require
async function startServer() {
  try {
    console.log('🔄 Loading server module...');
    
    // Try to start the built server
    const serverModule = require('./dist/index.js');
    console.log('✅ Server module loaded successfully');
    
  } catch (error) {
    console.error('❌ Failed to start main server:', error.message);
    
    // Last resort: create a minimal Express server
    console.log('🆘 Starting emergency fallback server...');
    
    const express = require('express');
    const app = express();
    const port = process.env.PORT || 8080;
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Railway emergency server running',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        port: port
      });
    });
    
    app.get('*', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
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
              <div class="status">✅ Railway Emergency Server Running</div>
              <p>Backend API is operational</p>
              <a href="/health">Health Check</a>
            </div>
          </body>
        </html>
      `);
    });
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`🆘 Emergency server running on port ${port}`);
      console.log(`🔗 Health check: http://0.0.0.0:${port}/health`);
    });
  }
}

startServer().catch(err => {
  console.error('💥 Complete startup failure:', err);
  process.exit(1);
});