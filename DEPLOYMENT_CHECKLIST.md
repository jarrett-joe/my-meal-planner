# Railway Deployment Checklist - My Meal Planner

## ✅ Fixed Issues

### Port Configuration
- ✅ Changed server to use port 8080 (Railway standard)
- ✅ Updated server/index.ts to use `process.env.PORT || "8080"`
- ✅ Added PORT=8080 to railway.json and nixpacks.toml

### Health Check Configuration
- ✅ Added `/health` endpoint that returns JSON status
- ✅ Moved health check to FIRST route (before any middleware)
- ✅ Updated railway.json to use `/health` path
- ✅ Increased health check timeout to 300 seconds

### Build Configuration
- ✅ Created railway.json with proper build commands
- ✅ Created nixpacks.toml with Node.js 18 configuration
- ✅ Set correct environment variables in config files

### Error Handling
- ✅ Added graceful error handling for missing environment variables
- ✅ Made Stripe optional (won't crash server if STRIPE_SECRET_KEY missing)
- ✅ Added comprehensive startup logging for debugging
- ✅ Added proper try-catch blocks for server initialization

## 🚀 Next Steps

### 1. Push Updated Code
```bash
# In Replit Version Control tab:
Commit message: "Fix Railway port and health check configuration"
Click "Commit & Push"
```

### 2. Environment Variables in Railway
Make sure you have these set in Railway Dashboard → Variables:

**Required (app will crash without these):**
- `NODE_ENV=production`
- `DATABASE_URL` (copy from your PostgreSQL service)
- `SESSION_SECRET` (generate new secure string)

**Optional (features will be disabled if missing):**
- `STRIPE_SECRET_KEY` (for payment processing)
- `STRIPE_PRICE_BASIC=price_1RkZafCC1Fk5THi6JLMa6IDu`
- `STRIPE_PRICE_STANDARD=price_1RkZbdCC1Fk5THi65ZRF704g`
- `STRIPE_PRICE_PREMIUM=price_1RkZc5CC1Fk5THi6EPu30xTo`
- `SENDGRID_API_KEY` (for email functionality)

### 3. Generate SESSION_SECRET
Run this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Test Health Check
After deployment, test the health check:
```
https://your-domain.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-01-17T...",
  "port": "8080",
  "env": "production"
}
```

## 🔧 Troubleshooting

### If Health Check Still Fails
1. Check Railway logs for server startup errors
2. Verify DATABASE_URL is correctly set
3. Ensure PostgreSQL service is running
4. Check that port 8080 is correctly configured

### If Site is Still Blank
1. Verify build completed successfully
2. Check that `npm run build` created dist/ folder
3. Verify static files are being served correctly
4. Check browser console for JavaScript errors

### Custom Domain Issues
- Custom domain setup doesn't affect health checks
- Railway should still respond on both `.railway.app` and custom domain
- DNS propagation can take up to 24 hours

## 📝 What Was Fixed

1. **Port Mismatch**: Changed from 5000 to 8080 to match Railway's expectations
2. **Health Check Location**: Moved `/health` route to be first, before any middleware
3. **Server Listen Method**: Updated to use Railway's preferred `server.listen(port, host)` format
4. **Configuration Files**: Added proper Railway and Nixpacks configuration
5. **Environment Variables**: Set PORT explicitly in configuration files

The "service unavailable" error should now be resolved!