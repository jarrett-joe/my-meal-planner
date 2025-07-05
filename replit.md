# Plan My Plates - Meal Planning SaaS

## Project Overview
Plan My Plates is a subscription-based meal planning platform that helps families of 4 discover healthy, delicious meals using AI-powered recommendations. The platform generates original recipes inspired by trusted food websites and creates automated grocery lists.

## Key Features
- AI-powered meal discovery using GROK API
- Family-sized recipes (serves 4 people)
- Healthy cooking with only EVOO and avocado oil (no seed oils)
- Automated grocery list generation
- Subscription-based access with Stripe payments
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
- **January 5, 2025**: Updated GROK API prompts to create original family-sized recipes (serves 4)
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