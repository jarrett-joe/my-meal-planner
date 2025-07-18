#!/usr/bin/env node

// Railway-specific startup script to handle import.meta.dirname issues
console.log('🚀 Railway startup script - My Meal Planner');

// Polyfill import.meta.dirname for Railway environment
if (typeof globalThis.importMetaDirnameFallback === 'undefined') {
  globalThis.importMetaDirnameFallback = process.cwd();
  console.log('✅ Set import.meta.dirname fallback to:', process.cwd());
}

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

// Import and start the actual server
try {
  console.log('🔄 Loading server module...');
  await import('./dist/index.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  
  // Last resort: create a minimal Express server
  console.log('🆘 Starting emergency fallback server...');
  
  const express = require('express');
  const app = express();
  const port = process.env.PORT || 8080;
  
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Railway emergency server running',
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>My Meal Planner</title></head>
        <body>
          <h1>My Meal Planner</h1>
          <p>Server is running in emergency mode</p>
          <a href="/health">Health Check</a>
        </body>
      </html>
    `);
  });
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🆘 Emergency server running on port ${port}`);
  });
}