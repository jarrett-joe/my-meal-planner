# Railway Deployment Guide for Plan My Plates

## Prerequisites
- GitHub account
- Railway account (free signup at railway.app)
- Your code pushed to a GitHub repository

## Step 1: Prepare Your Project

### 1.1 Environment Variables You'll Need
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secret-random-string-here
STRIPE_PRICE_BASIC=price_your_stripe_basic_price_id
STRIPE_PRICE_STANDARD=price_your_stripe_standard_price_id  
STRIPE_PRICE_PREMIUM=price_your_stripe_premium_price_id
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
```

### 1.2 Create Production Environment File
Create `.env.example` (for reference):
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=generate-a-secure-random-string
STRIPE_PRICE_BASIC=price_xxxxxxxxxx
STRIPE_PRICE_STANDARD=price_xxxxxxxxxx
STRIPE_PRICE_PREMIUM=price_xxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxx
```

## Step 2: Setup Railway Account

### 2.1 Create Railway Account
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for easy repo access)
4. Verify your email address

### 2.2 Connect GitHub Repository
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. Select your Plan My Plates repository

## Step 3: Configure Database

### 3.1 Add PostgreSQL Database
1. In your Railway project dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. Copy the DATABASE_URL from the database service

### 3.2 Import Your Current Database (Optional)
If you want to migrate existing data:
1. Export from Replit: `pg_dump $DATABASE_URL > backup.sql`
2. Import to Railway: `psql $RAILWAY_DATABASE_URL < backup.sql`

## Step 4: Configure Environment Variables

### 4.1 Set Environment Variables in Railway
1. Click on your app service (not the database)
2. Go to "Variables" tab
3. Add each environment variable:
   - `NODE_ENV=production`
   - `DATABASE_URL` (copy from your PostgreSQL service)
   - `SESSION_SECRET` (generate a strong random string)
   - `STRIPE_PRICE_BASIC` (from your Stripe dashboard)
   - `STRIPE_PRICE_STANDARD` (from your Stripe dashboard)
   - `STRIPE_PRICE_PREMIUM` (from your Stripe dashboard)
   - `SENDGRID_API_KEY` (if using email features)

### 4.2 Generate SESSION_SECRET
Use this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 5: Deploy Application

### 5.1 Initial Deployment
1. Railway automatically deploys when you connect the repo
2. Monitor the build logs in Railway dashboard
3. Wait for deployment to complete (usually 2-5 minutes)

### 5.2 Run Database Migration
1. In Railway dashboard, go to your app service
2. Click "Deploy" → "View Logs" to monitor
3. Your app should automatically run `npm run db:push` on startup

## Step 6: Configure Custom Domain (Optional)

### 6.1 Get Railway Domain
1. Railway provides a default domain like `your-app-name.up.railway.app`
2. You can use this immediately for testing

### 6.2 Add Custom Domain
1. In Railway dashboard, go to "Settings" → "Domains"
2. Click "Custom Domain"
3. Enter your domain (e.g., `planmyplates.com`)
4. Follow DNS configuration instructions
5. Point your domain's DNS to Railway's servers

## Step 7: Test Your Deployment

### 7.1 Verify Core Functionality
1. Visit your Railway URL
2. Test signup/login on `/direct-auth`
3. Verify dashboard loads for authenticated users
4. Test meal generation (ensure XAI API key works)
5. Test subscription flow with Stripe

### 7.2 Monitor and Debug
1. Check Railway logs for any errors
2. Verify database connections
3. Test API endpoints
4. Monitor performance metrics

## Step 8: Ongoing Maintenance

### 8.1 Automatic Deployments
- Railway automatically deploys when you push to main branch
- Monitor deployments in Railway dashboard
- Set up notifications for failed deployments

### 8.2 Backup Strategy
- Railway automatically backs up PostgreSQL
- Consider periodic manual backups for critical data
- Set up monitoring for database health

## Cost Estimate

### Railway Pricing (as of 2024)
- **Hobby Plan**: $5/month per service
  - App service: $5/month
  - PostgreSQL: $5/month
  - Total: ~$10/month

- **Pro Plan**: $20/month per service (if you need more resources)

### Additional Costs
- Custom domain: Free on Railway
- SSL certificate: Free (automatic)
- Bandwidth: Generous free tier, then pay-as-you-go

## Troubleshooting Common Issues

### Database Connection Errors
- Verify DATABASE_URL is correctly set
- Ensure PostgreSQL service is running
- Check connection string format

### Build Failures
- Check package.json scripts are correct
- Verify all dependencies are listed
- Review build logs for specific errors

### Authentication Issues
- Verify SESSION_SECRET is set
- Check that custom auth bypasses Replit scripts
- Test in incognito mode

### API Key Issues
- Verify all Stripe keys are correctly set
- Test XAI API key functionality
- Check SendGrid configuration if using email

## Support Resources
- Railway Documentation: https://docs.railway.app
- Railway Discord Community: https://discord.gg/railway
- Railway Status Page: https://status.railway.app