#!/usr/bin/env node

// Simple deployment debugging script for Railway
console.log('🔍 Railway Deployment Debug Check');
console.log('=====================================');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'NOT SET');

// Check required files
const fs = require('fs');
const path = require('path');

console.log('\n📁 File Check:');
const requiredFiles = [
  'package.json',
  'server/index.ts',
  'server/routes.ts',
  'server/db.ts',
  'server/storage.ts',
  'shared/schema.ts',
  'railway.json',
  'nixpacks.toml'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
});

// Check package.json scripts
console.log('\n📦 Package.json Scripts:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('  build:', pkg.scripts?.build ? '✅ SET' : '❌ MISSING');
  console.log('  start:', pkg.scripts?.start ? '✅ SET' : '❌ MISSING');
  console.log('  dev:', pkg.scripts?.dev ? '✅ SET' : '❌ MISSING');
} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}

// Test database connection
console.log('\n🗄️ Database Connection Test:');
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    pool.query('SELECT 1 as test')
      .then(() => {
        console.log('  ✅ Database connection successful');
        process.exit(0);
      })
      .catch(error => {
        console.log('  ❌ Database connection failed:', error.message);
        process.exit(1);
      });
  } catch (error) {
    console.log('  ❌ Database test error:', error.message);
  }
} else {
  console.log('  ❌ DATABASE_URL not set');
}

// Test health endpoint
console.log('\n🩺 Health Check Test:');
const http = require('http');
const port = process.env.PORT || 8080;

const healthReq = http.request({
  hostname: 'localhost',
  port: port,
  path: '/health',
  method: 'GET'
}, (res) => {
  console.log(`  Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`  Response: ${data}`);
  });
});

healthReq.on('error', (err) => {
  console.log('  ❌ Health check failed:', err.message);
});

healthReq.end();