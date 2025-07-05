// Food image generation service to create recipe-matching images
import OpenAI from "openai";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.X_AI_API_KEY 
});

export async function generateFoodImage(
  title: string, 
  description: string, 
  ingredients: string[],
  imageDescription?: string
): Promise<string | undefined> {
  try {
    // Create a detailed food photography prompt based on the recipe
    const foodPrompt = imageDescription || createFoodImagePrompt(title, description, ingredients);
    
    // For now, return a placeholder that uses the recipe data
    // In a real implementation, you would call an image generation API like:
    // - OpenAI DALL-E
    // - Midjourney
    // - Stable Diffusion
    // - Food-specific image APIs
    
    // Generate a food-style placeholder URL that includes recipe info
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description.substring(0, 50));
    
    // Use a food placeholder service or generate deterministic URLs
    // For demonstration, using a food-focused placeholder service
    return `https://foodish-api.com/images/dessert/dessert1.jpg`; // Placeholder for now
    
  } catch (error) {
    console.error("Error generating food image:", error);
    return undefined;
  }
}

function createFoodImagePrompt(title: string, description: string, ingredients: string[]): string {
  const mainIngredients = ingredients.slice(0, 5).join(", ");
  
  return `Professional food photography of ${title}. ${description}. 
    Key ingredients visible: ${mainIngredients}. 
    Shot from above on a clean white plate, natural lighting, 
    high-resolution, appetizing presentation, restaurant-quality plating.
    Colors should be vibrant and realistic, showing the actual cooked dish.`;
}

// Alternative: Use recipe-based image selection from curated sources
export function getRecipeImageFromCuratedSources(
  cuisine: string,
  protein: string,
  cookingMethod: string = "general"
): string {
  // Map recipe characteristics to curated food images
  const imageDatabase = {
    italian: {
      chicken: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800",
      pasta: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800",
      default: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800"
    },
    mexican: {
      chicken: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800",
      beef: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800",
      default: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800"
    },
    mediterranean: {
      chicken: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800",
      fish: "https://images.unsplash.com/photo-1544944987-97ffc7ba2bc6?w=800",
      default: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800"
    },
    asian: {
      chicken: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800",
      pork: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
      default: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800"
    },
    american: {
      chicken: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800",
      beef: "https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=800",
      default: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800"
    }
  };

  const cuisineKey = cuisine.toLowerCase();
  const proteinKey = protein.toLowerCase();
  
  const cuisineImages = imageDatabase[cuisineKey as keyof typeof imageDatabase] || imageDatabase.american;
  return cuisineImages[proteinKey as keyof typeof cuisineImages] || cuisineImages.default;
}

export function generateDeterministicFoodImage(title: string, cuisine: string, protein: string): string {
  // Create more contextual image selection based on recipe characteristics
  const cuisineKey = cuisine.toLowerCase();
  const proteinKey = protein.toLowerCase();
  const titleKey = title.toLowerCase();
  
  // Enhanced image database with more specific mappings
  const imageDatabase = {
    italian: {
      chicken: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop&q=80", // Italian chicken
      pasta: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop&q=80", // Pasta dish
      beef: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&h=600&fit=crop&q=80", // Italian beef
      default: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop&q=80"
    },
    mexican: {
      chicken: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop&q=80", // Mexican chicken
      beef: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&h=600&fit=crop&q=80", // Tacos/Mexican beef
      pork: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&h=600&fit=crop&q=80", // Mexican pork
      default: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop&q=80"
    },
    mediterranean: {
      chicken: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800&h=600&fit=crop&q=80", // Mediterranean chicken
      fish: "https://images.unsplash.com/photo-1544944987-97ffc7ba2bc6?w=800&h=600&fit=crop&q=80", // Mediterranean fish
      seafood: "https://images.unsplash.com/photo-1559847844-d721426d6edc?w=800&h=600&fit=crop&q=80", // Seafood dish
      default: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=800&h=600&fit=crop&q=80"
    },
    asian: {
      chicken: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800&h=600&fit=crop&q=80", // Asian chicken
      pork: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=600&fit=crop&q=80", // Asian pork
      beef: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&h=600&fit=crop&q=80", // Asian beef
      tofu: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop&q=80", // Asian tofu
      default: "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800&h=600&fit=crop&q=80"
    },
    american: {
      chicken: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop&q=80", // American chicken
      beef: "https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=800&h=600&fit=crop&q=80", // American beef/burger
      pork: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop&q=80", // American pork
      turkey: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop&q=80", // Turkey
      default: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=600&fit=crop&q=80"
    },
    indian: {
      chicken: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80", // Indian chicken curry
      lamb: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&h=600&fit=crop&q=80", // Indian lamb
      vegetarian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&h=600&fit=crop&q=80", // Indian vegetarian
      default: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80"
    }
  };

  // Check for specific cooking methods or dish types in the title
  if (titleKey.includes('pasta') || titleKey.includes('spaghetti') || titleKey.includes('linguine')) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('salad')) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('soup') || titleKey.includes('stew')) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('pizza')) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('burger')) {
    return "https://images.unsplash.com/photo-1551615593-ef5fe247e8f7?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('curry')) {
    return "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=600&fit=crop&q=80";
  }
  if (titleKey.includes('stir fry') || titleKey.includes('stir-fry')) {
    return "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=800&h=600&fit=crop&q=80";
  }

  // Fall back to cuisine + protein mapping
  const cuisineImages = imageDatabase[cuisineKey as keyof typeof imageDatabase] || imageDatabase.american;
  return cuisineImages[proteinKey as keyof typeof cuisineImages] || cuisineImages.default;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}