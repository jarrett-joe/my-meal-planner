# Railway Deployment Checklist

## Before You Start
- [ ] Create GitHub account (if you don't have one)
- [ ] Create Railway account at railway.app
- [ ] Have your Stripe API keys ready
- [ ] Have your XAI API key ready
- [ ] Have SendGrid API key ready (if using email features)

## Step 1: Push Code to GitHub
1. **Create GitHub repository**
   - Go to github.com → New repository
   - Name it `my-meal-planner` (or your preferred name)
   - Make it public or private
   - Don't initialize with README (you already have code)

2. **Push your code** (if not already on GitHub)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/my-meal-planner.git
   git push -u origin main
   ```

## Step 2: Setup Railway
1. **Sign up for Railway**
   - Go to railway.app
   - Click "Start a New Project"
   - Sign up with GitHub (easiest option)

2. **Create new project**
   - Click "Deploy from GitHub repo"
   - Select your `my-meal-planner` repository
   - Railway will start building automatically

## Step 3: Add Database
1. **Add PostgreSQL**
   - In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Wait for PostgreSQL to spin up (2-3 minutes)
   - Copy the `DATABASE_URL` from the database service

## Step 4: Configure Environment Variables
**In Railway dashboard, go to your app service → Variables tab**

Add these environment variables:

```
NODE_ENV=production
DATABASE_URL=postgresql://[copied from your PostgreSQL service]
SESSION_SECRET=[generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"]
STRIPE_PRICE_BASIC=price_[your_stripe_basic_price_id]
STRIPE_PRICE_STANDARD=price_[your_stripe_standard_price_id]
STRIPE_PRICE_PREMIUM=price_[your_stripe_premium_price_id]
XAI_API_KEY=xai-[your_xai_api_key]
SENDGRID_API_KEY=SG.[your_sendgrid_key] (optional)
```

## Step 5: Generate Required Keys

### SESSION_SECRET
Run this command locally to generate:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Stripe Price IDs
1. Go to Stripe Dashboard → Products
2. Find your subscription products
3. Copy the Price IDs (start with `price_`)

### XAI API Key
1. Go to XAI console
2. Generate API key
3. Copy the key (starts with `xai-`)

## Step 6: Monitor Deployment
1. **Watch build logs**
   - In Railway dashboard → your app service → "Deployments"
   - Monitor the build process
   - Look for any errors

2. **Verify deployment**
   - Railway will provide a URL like `your-app.up.railway.app`
   - Visit the URL to test your app

## Step 7: Test Your App
- [ ] Landing page loads correctly
- [ ] `/direct-auth` page works
- [ ] Can sign up new account
- [ ] Can log in
- [ ] Dashboard loads for authenticated users
- [ ] Meal generation works (tests XAI API)
- [ ] Stripe subscription flow works

## Step 8: Custom Domain (Optional)
1. **In Railway dashboard → Settings → Domains**
2. Click "Custom Domain"
3. Enter your domain
4. Follow DNS instructions to point domain to Railway

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Verify all dependencies are correct
- Check for TypeScript errors

### Database Connection Issues
- Verify `DATABASE_URL` is correctly copied
- Ensure PostgreSQL service is running
- Check database service logs

### Authentication Not Working
- Verify `SESSION_SECRET` is set
- Check that app redirects to `/direct-auth` not `/auth`
- Test in incognito browser

### API Errors
- Verify all API keys are correctly set
- Check service logs for specific errors
- Test API endpoints individually

## Cost Estimate
- **App Service**: $5/month
- **PostgreSQL**: $5/month
- **Total**: ~$10/month
- Custom domain: Free
- SSL: Free (automatic)

## Support
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Check Railway status: https://status.railway.app