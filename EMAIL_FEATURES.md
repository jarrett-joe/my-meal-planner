# Email Automation Features

## Overview
My Meal Planner AI includes a comprehensive email automation system using SendGrid to enhance user engagement and provide valuable notifications throughout the meal planning experience.

## Email Features

### 1. Welcome Email 🎉
**Triggered:** When a new user signs up
**Content:**
- Personalized welcome message
- Overview of 10 free trial meals
- Instructions on how to get started
- Feature highlights (AI recommendations, grocery lists, family-sized recipes)

### 2. Meal Plan Email 🍽️
**Triggered:** When users generate AI meal suggestions
**Content:**
- Personalized meal plan with user's generated recipes
- Recipe details (cuisine, protein, cooking time, descriptions)
- Next steps (add to calendar, create grocery list)
- Professional formatting with meal cards

### 3. Grocery List Email 🛒
**Triggered:** When users generate grocery lists from selected meals
**Content:**
- Organized grocery list by categories
- Shopping tips and reminders
- Information about healthy cooking oils (EVOO/avocado oil only)
- Family-sized portion notes

### 4. Subscription Confirmation Email 💎
**Triggered:** When users upgrade to premium plans
**Content:**
- Subscription confirmation details
- Premium benefits overview
- Plan-specific information (Basic, Standard, Premium)
- Support contact information

## Technical Implementation

### SendGrid Integration
```typescript
// Environment variable required
SENDGRID_API_KEY=SG.your-api-key-here

// From address configuration
FROM_EMAIL="hello@mymealplannerai.com"
FROM_NAME="My Meal Planner AI"
```

### Email Templates
- Professional HTML templates with responsive design
- Consistent branding (orange #e67e22 color scheme)
- Plain text fallbacks for all emails
- Personalization using user data

### Error Handling
- Graceful degradation: App continues working even if emails fail
- Comprehensive logging for debugging
- Non-blocking email sending (doesn't affect user experience)

## Email Triggers

### Signup Flow
1. User creates account → Welcome email sent automatically
2. User receives 10 free trial meals immediately
3. Email includes onboarding instructions

### Meal Planning Flow
1. User generates meals → Meal plan email sent
2. User creates grocery list → Grocery list email sent
3. User upgrades subscription → Confirmation email sent

## Development Notes

### Testing Without SendGrid
When `SENDGRID_API_KEY` is not provided:
- Email functionality is disabled
- Console logging shows what emails would be sent
- App continues to work normally

### Production Setup
1. Sign up for SendGrid account (free tier: 100 emails/day)
2. Create API key with "Full Access" permissions
3. Verify sender email address
4. Add `SENDGRID_API_KEY` to environment variables

## User Experience

### Email Frequency
- Welcome: Once per user signup
- Meal plans: Each time user generates meals
- Grocery lists: Each time user creates a list
- Subscription: Once per plan upgrade

### Unsubscribe (Future Enhancement)
- Add unsubscribe links to emails
- User preference management
- Email type selection (meal plans vs notifications)

## Benefits

### User Engagement
- Keeps users informed about their meal planning progress
- Provides value outside the web app
- Builds habit formation through consistent communication

### Professional Experience
- Enhances perceived value of the service
- Matches expectations of modern SaaS applications
- Provides backup access to generated content

### Marketing Potential
- Re-engagement opportunities
- Cross-selling premium features
- User retention through valuable content delivery