# Railway Deployment Troubleshooting Guide

## Current Issue: "Can't Connect to Server"

This error indicates that Railway can't reach your application. Here are the most common causes and solutions:

### 1. Check Railway Environment Variables

**In Railway Dashboard → Your Project → Variables tab, verify these are set:**

```bash
# REQUIRED - App will crash without these
NODE_ENV=production
DATABASE_URL=postgresql://... (copy from PostgreSQL service)
SESSION_SECRET=your-64-character-random-string

# OPTIONAL - Features disabled if missing
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_PRICE_BASIC=price_1RkZafCC1Fk5THi6JLMa6IDu
STRIPE_PRICE_STANDARD=price_1RkZbdCC1Fk5THi65ZRF704g
STRIPE_PRICE_PREMIUM=price_1RkZc5CC1Fk5THi6EPu30xTo
```

### 2. Generate SESSION_SECRET

If you don't have a SESSION_SECRET, generate one:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Check Railway Logs

1. Go to Railway Dashboard → Your Project
2. Click on your service (not the database)
3. Go to "Deployments" tab
4. Click on the latest deployment
5. Look for error messages in the logs

### 4. Common Log Errors and Solutions

**"DATABASE_URL must be set"**
- Go to Variables tab and copy DATABASE_URL from your PostgreSQL service
- Make sure it starts with `postgresql://`

**"SESSION_SECRET environment variable is required"**
- Generate and add SESSION_SECRET as shown above

**"Port 8080 is already in use"**
- This shouldn't happen on Railway, but if it does, Railway will assign a different port

**"Health check failed"**
- Check that /health endpoint is accessible
- Verify the service is listening on 0.0.0.0 (not localhost)

### 5. Force Redeploy

If environment variables are correct:
1. In Railway Dashboard → Your Project
2. Click "Redeploy" button
3. Wait for fresh deployment

### 6. Test Health Check Manually

After deployment, test your health endpoint:
```
curl https://your-app-name.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-01-17T...",
  "port": "8080",
  "env": "production",
  "database": "connected",
  "stripe": "configured"
}
```

### 7. Check Build Process

If the app builds but doesn't start:
1. Verify `npm run build` works locally
2. Check that `dist/` folder is created
3. Verify `npm start` works after build

### 8. Database Connection Issues

If database is the problem:
1. Check PostgreSQL service is running in Railway
2. Copy DATABASE_URL exactly from PostgreSQL service
3. Test connection manually in Railway console

### 9. Custom Domain Issues

If using custom domain:
1. Test with Railway's default domain first: `*.up.railway.app`
2. Check DNS settings point to Railway
3. Wait up to 24 hours for DNS propagation

### 10. Last Resort: Check Railway Status

Visit https://railway.app/status to check if Railway platform has issues.

## Quick Fix Checklist

- [ ] DATABASE_URL is set correctly
- [ ] SESSION_SECRET is generated and set
- [ ] NODE_ENV=production is set
- [ ] Latest code is pushed to GitHub
- [ ] Railway has redeployed after environment variable changes
- [ ] Health check endpoint returns 200 OK
- [ ] Build process completes successfully
- [ ] No errors in Railway deployment logs