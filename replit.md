# Plan My Plates - Meal Planning SaaS

## Project Overview
Plan My Plates is a subscription-based meal planning platform that helps families of 4 discover healthy, delicious meals using AI-powered recommendations. The platform generates original recipes inspired by trusted food websites and creates automated grocery lists.

## Key Features
- AI-powered meal discovery using GROK API
- Custom recipe upload functionality (URL parsing and manual entry)
- Family-sized recipes (serves 4 people)
- Healthy cooking with only EVOO and avocado oil (no seed oils)
- Automated grocery list generation
- Meal-based subscription system with credit tracking
- 10 free trial meals for new users
- Three subscription tiers: Basic (20 meals/$10), Standard (40 meals/$20), Premium (60 meals/$30)
- Integrated calendar planning with favorites system
- User authentication via Replit Auth
- PostgreSQL database for data persistence

## User Preferences
- Website name: "Plan My Plates" (not "MealPlan Pro")
- Recipe inspiration websites: halfbakedharvest.com, smittenkitchen.com, thekitchn.com, barefootcontessa.com, allrecipes.com
- All recipes must serve 4 people
- Never use seed oils (canola, vegetable, sunflower, etc.) - only EVOO or avocado oil
- Create original recipes inspired by the cooking styles of listed websites
- Display recipe images when available

## Recent Changes
- **January 13, 2025**: ✅ **UPDATED** - Enhanced recipe URL parsing with structured data extraction for better accuracy
- **January 13, 2025**: ✅ **NEW** - Custom recipe upload functionality with URL parsing and manual entry
- **January 13, 2025**: ✅ Added dedicated Custom Recipes page accessible from dashboard navigation
- **January 13, 2025**: ✅ Integrated XAI API for intelligent recipe parsing from URLs
- **January 13, 2025**: ✅ Database schema updated to distinguish user-uploaded vs AI-generated recipes
- **January 13, 2025**: ✅ Custom recipes fully integrated with existing meal planning, calendar, and favorites system
- **January 12, 2025**: ✅ **COMPLETED** - Meals automatically selected for grocery list when added to calendar
- **January 12, 2025**: ✅ **COMPLETED** - Meal selection functionality for grocery lists fully working
- **January 12, 2025**: ✅ Enhanced calendar with checkboxes for individual meal selection and "Select All" option
- **January 12, 2025**: ✅ Updated grocery list generation to work with selected meals instead of all calendar meals
- **January 12, 2025**: ✅ Added visual indicators showing number of selected meals in grocery list button
- **January 12, 2025**: ✅ Fixed GET request body parameter error preventing grocery list display
- **January 12, 2025**: ✅ Fixed calendar modal to show full month (31 days) instead of just week (7 days) 
- **January 12, 2025**: ✅ Enhanced grocery list system to compile recipes from calendar meals using XAI API
- **January 12, 2025**: ✅ Added grocery list generation button to calendar section for easy access
- **January 12, 2025**: ✅ Resolved calendar GET request issues enabling proper meal display on scheduled dates
- **January 12, 2025**: ✅ Grocery list feature now fully functional with organized ingredient categories
- **January 7, 2025**: Implemented meal-based subscription system instead of time-based plans
- **January 7, 2025**: Added 10 free trial meals for all new users (no credit card required)
- **January 7, 2025**: Created three subscription tiers: Basic ($10/20 meals), Standard ($20/40 meals), Premium ($30/60 meals)
- **January 7, 2025**: Added meal credit tracking and deduction system in database schema
- **January 7, 2025**: Updated subscription page with new pricing plans and meal-per-dollar display
- **January 7, 2025**: Enhanced dashboard to show remaining meal credits and subscription status
- **January 7, 2025**: Integrated meal credit validation into AI meal generation endpoints
- **January 5, 2025**: Enhanced recipe-image matching system with contextual food photography
- **January 5, 2025**: Added imageDescription field to AI prompts for better image-recipe alignment
- **January 5, 2025**: Created deterministic image selection based on cuisine, protein, and dish type
- **January 5, 2025**: Removed all customer-facing mentions of "GROK" and "XAI" - now only shows "AI" to users
- **January 5, 2025**: Updated AI API prompts to create original family-sized recipes (serves 4)
- **January 5, 2025**: Added strict requirement to only use EVOO or avocado oil, never seed oils
- **January 5, 2025**: Changed from searching websites directly to using them as inspiration sources
- **January 5, 2025**: Updated grocery list generation to reflect family-sized portions and oil restrictions
- **January 5, 2025**: Enhanced meal cards to display recipe source websites
- **January 5, 2025**: Complete rebranding to "Plan My Plates" throughout application

## Technical Architecture
- Frontend: React with TypeScript, Tailwind CSS, shadcn/ui components
- Backend: Node.js with Express, using GROK API for meal generation
- Database: PostgreSQL with Drizzle ORM
- Authentication: Replit Auth with OpenID Connect
- Payments: Stripe integration for subscriptions
- Deployment: Replit platform

## Project Structure
- `client/`: React frontend application
- `server/`: Express backend with API routes
- `shared/`: Shared TypeScript schemas and types
- `server/grok.ts`: GROK API integration for meal generation
- `server/storage.ts`: Database operations interface
- `shared/schema.ts`: Database schema definitions

## Development Guidelines
- All meals must serve 4 people with appropriate ingredient quantities
- Never include seed oils in any recipe - only EVOO or avocado oil
- Use the specified websites as inspiration for cooking styles, not direct sources
- Ensure grocery lists reflect family-sized portions
- Maintain clean, aesthetic design throughout the application