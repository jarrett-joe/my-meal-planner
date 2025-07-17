import { MailService } from '@sendgrid/mail';
import type { User, Meal, GroceryList } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY not found - email functionality will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = "hello@mymealplannerai.com"; // Replace with your verified sender email
const FROM_NAME = "My Meal Planner AI";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("Email would be sent:", params.subject, "to", params.to);
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Email Templates
export const emailTemplates = {
  welcome: (user: User) => ({
    subject: "Welcome to My Meal Planner AI! 🍽️ Your 10 free meals await",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e67e22; margin: 0;">🍽️ My Meal Planner AI</h1>
          <p style="color: #666; font-size: 16px;">AI-Powered Meal Planning Made Simple</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Welcome, ${user.firstName || 'there'}! 👋</h2>
          <p style="color: #555; line-height: 1.6;">
            Thank you for joining My Meal Planner AI! We're excited to help you discover delicious, 
            family-sized meals that fit your preferences and make grocery shopping a breeze.
          </p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #27ae60; margin-top: 0;">🎁 Your Free Trial Includes:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>10 free meal suggestions</strong> - No credit card required</li>
            <li><strong>AI-powered recommendations</strong> based on your preferences</li>
            <li><strong>Automated grocery lists</strong> for easy shopping</li>
            <li><strong>Family-sized recipes</strong> that serve 4 people</li>
            <li><strong>Healthy cooking</strong> with only EVOO and avocado oil</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mymealplannerai.com" style="background: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Start Discovering Meals
          </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Getting Started:</h3>
          <ol style="color: #555; line-height: 1.8;">
            <li>Set your protein and cuisine preferences</li>
            <li>Generate AI meal suggestions</li>
            <li>Add favorites to your meal calendar</li>
            <li>Create grocery lists for easy shopping</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">
            Questions? Reply to this email or visit our help center.<br>
            Happy cooking! 🍳
          </p>
        </div>
      </div>
    `,
    text: `Welcome to My Meal Planner AI!

Hi ${user.firstName || 'there'},

Thank you for joining My Meal Planner AI! We're excited to help you discover delicious, family-sized meals.

Your free trial includes:
- 10 free meal suggestions (no credit card required)
- AI-powered recommendations based on your preferences  
- Automated grocery lists for easy shopping
- Family-sized recipes that serve 4 people
- Healthy cooking with only EVOO and avocado oil

Getting started:
1. Set your protein and cuisine preferences
2. Generate AI meal suggestions
3. Add favorites to your meal calendar
4. Create grocery lists for easy shopping

Visit https://mymealplannerai.com to start discovering meals!

Happy cooking!
The My Meal Planner AI Team`
  }),

  mealPlan: (user: User, meals: Meal[]) => ({
    subject: "Your AI-Generated Meal Plan is Ready! 🍽️",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e67e22; margin: 0;">🍽️ My Meal Planner AI</h1>
          <p style="color: #666; font-size: 16px;">Your Personalized Meal Plan</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi ${user.firstName || 'there'}! 👋</h2>
          <p style="color: #555; line-height: 1.6;">
            Your AI-generated meal plan is ready! Here are ${meals.length} delicious meals 
            tailored to your preferences, all serving 4 people.
          </p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2c3e50; margin-bottom: 20px;">Your Meal Plan:</h3>
          ${meals.map(meal => `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
              <h4 style="color: #e67e22; margin: 0 0 10px 0;">${meal.title}</h4>
              <p style="color: #666; margin: 5px 0; font-size: 14px;">
                <strong>Cuisine:</strong> ${meal.cuisine} • 
                <strong>Protein:</strong> ${meal.protein} • 
                <strong>Cook Time:</strong> ${meal.cookingTime} mins
              </p>
              <p style="color: #555; margin: 10px 0 0 0; line-height: 1.5;">
                ${meal.description}
              </p>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mymealplannerai.com" style="background: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Full Meal Plan
          </a>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #27ae60; margin-top: 0;">Next Steps:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li>Add your favorite meals to the calendar</li>
            <li>Generate a grocery list for easy shopping</li>
            <li>Start cooking and enjoy!</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">
            Happy cooking! 🍳<br>
            The My Meal Planner AI Team
          </p>
        </div>
      </div>
    `,
    text: `Your AI-Generated Meal Plan is Ready!

Hi ${user.firstName || 'there'},

Your personalized meal plan is ready! Here are ${meals.length} delicious meals tailored to your preferences:

${meals.map(meal => `
${meal.title}
${meal.cuisine} • ${meal.protein} • ${meal.cookingTime} mins
${meal.description}
`).join('\n')}

Next steps:
- Add your favorite meals to the calendar
- Generate a grocery list for easy shopping  
- Start cooking and enjoy!

Visit https://mymealplannerai.com to view your full meal plan.

Happy cooking!
The My Meal Planner AI Team`
  }),

  groceryList: (user: User, groceryList: GroceryList) => ({
    subject: "Your Grocery List is Ready! 🛒",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e67e22; margin: 0;">🛒 My Meal Planner AI</h1>
          <p style="color: #666; font-size: 16px;">Your Grocery List</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hi ${user.firstName || 'there'}! 👋</h2>
          <p style="color: #555; line-height: 1.6;">
            Your grocery list is ready! We've organized everything by category to make 
            shopping quick and easy.
          </p>
        </div>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Grocery List</h3>
          <div style="white-space: pre-line; line-height: 1.8; color: #555;">
            ${groceryList.items}
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mymealplannerai.com" style="background: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View in Dashboard
          </a>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #27ae60; margin-top: 0;">Shopping Tips:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li>Check your pantry first - you might already have some items</li>
            <li>Look for seasonal produce for the best prices</li>
            <li>All recipes use only EVOO or avocado oil (no seed oils!)</li>
            <li>Each recipe serves 4 people</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">
            Happy shopping and cooking! 🍳<br>
            The My Meal Planner AI Team
          </p>
        </div>
      </div>
    `,
    text: `Your Grocery List is Ready!

Hi ${user.firstName || 'there'},

Your grocery list is ready! We've organized everything by category to make shopping quick and easy.

GROCERY LIST:
${groceryList.items}

Shopping tips:
- Check your pantry first - you might already have some items
- Look for seasonal produce for the best prices
- All recipes use only EVOO or avocado oil (no seed oils!)
- Each recipe serves 4 people

Visit https://mymealplannerai.com to view in your dashboard.

Happy shopping and cooking!
The My Meal Planner AI Team`
  }),

  subscriptionConfirmation: (user: User, plan: string) => ({
    subject: "Welcome to My Meal Planner AI Premium! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e67e22; margin: 0;">🎉 My Meal Planner AI</h1>
          <p style="color: #666; font-size: 16px;">Premium Subscription Activated</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Thank you, ${user.firstName || 'there'}! 🙏</h2>
          <p style="color: #555; line-height: 1.6;">
            Your <strong>${plan}</strong> subscription is now active! Get ready to discover 
            amazing meals and streamline your meal planning.
          </p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #27ae60; margin-top: 0;">Your Premium Benefits:</h3>
          <ul style="color: #555; line-height: 1.8;">
            <li><strong>More meal credits</strong> - Generate meals whenever you want</li>
            <li><strong>Unlimited grocery lists</strong> - Perfect for weekly planning</li>
            <li><strong>Advanced preferences</strong> - Fine-tune your meal recommendations</li>
            <li><strong>Calendar planning</strong> - Schedule meals for the whole week</li>
            <li><strong>Priority support</strong> - Get help when you need it</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mymealplannerai.com" style="background: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Start Using Premium
          </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 25px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Questions?</h3>
          <p style="color: #555; line-height: 1.6;">
            We're here to help! Reply to this email or visit our help center if you have 
            any questions about your subscription or need assistance.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">
            Happy cooking! 🍳<br>
            The My Meal Planner AI Team
          </p>
        </div>
      </div>
    `,
    text: `Welcome to My Meal Planner AI Premium!

Hi ${user.firstName || 'there'},

Your ${plan} subscription is now active! Get ready to discover amazing meals and streamline your meal planning.

Your premium benefits:
- More meal credits - Generate meals whenever you want
- Unlimited grocery lists - Perfect for weekly planning
- Advanced preferences - Fine-tune your meal recommendations
- Calendar planning - Schedule meals for the whole week
- Priority support - Get help when you need it

Visit https://mymealplannerai.com to start using your premium features.

Questions? Reply to this email or visit our help center.

Happy cooking!
The My Meal Planner AI Team`
  })
};

// Email service functions
export const emailService = {
  async sendWelcomeEmail(user: User): Promise<boolean> {
    const template = emailTemplates.welcome(user);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendMealPlanEmail(user: User, meals: Meal[]): Promise<boolean> {
    const template = emailTemplates.mealPlan(user, meals);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendGroceryListEmail(user: User, groceryList: GroceryList): Promise<boolean> {
    const template = emailTemplates.groceryList(user, groceryList);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  },

  async sendSubscriptionConfirmationEmail(user: User, plan: string): Promise<boolean> {
    const template = emailTemplates.subscriptionConfirmation(user, plan);
    return await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
};