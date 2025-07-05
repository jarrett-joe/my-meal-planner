import OpenAI from "openai";
import { generateDeterministicFoodImage } from "./imageGenerator";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.X_AI_API_KEY 
});

export interface MealSuggestion {
  title: string;
  description: string;
  cuisine: string;
  protein: string;
  cookingTime: number;
  ingredients: string[];
  instructions?: string;
  rating?: number;
  imageUrl?: string;
  imageDescription?: string;
  sourceUrl?: string;
}

export async function generateMealSuggestions(
  proteinPreferences: string[],
  cuisinePreferences: string[],
  dietaryRestrictions: string[] = [],
  count = 6
): Promise<MealSuggestion[]> {
  try {
    const prompt = `You are a professional chef and meal planning expert creating original recipes for a family of 4 people. Use these high-quality food websites as inspiration for cooking styles and flavor profiles:
- halfbakedharvest.com (rustic, seasonal, comfort food)
- smittenkitchen.com (precise, elegant, tested recipes)
- thekitchn.com (practical, approachable home cooking)
- barefootcontessa.com (simple, quality ingredients)
- allrecipes.com (family-friendly, reliable techniques)

Create ${count} original meal suggestions based on these preferences:

Protein preferences: ${proteinPreferences.join(", ")}
Cuisine preferences: ${cuisinePreferences.join(", ")}
Dietary restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "None"}

STRICT REQUIREMENTS:
- All meals must serve 4 people (adjust ingredient quantities accordingly)
- NEVER use seed oils (canola, vegetable, sunflower, safflower, etc.)
- ONLY use Extra Virgin Olive Oil (EVOO) or Avocado Oil for any cooking fat
- Create original recipes inspired by the cooking styles of the listed websites
- Ensure variety in cooking methods and ingredients

For each meal, provide:
1. A creative and appetizing title
2. A brief description (1-2 sentences) mentioning it serves 4
3. The main cuisine type (from the preferences if possible)
4. The primary protein
5. Estimated cooking time in minutes
6. A comprehensive list of ingredients with quantities for 4 servings (using only EVOO or avocado oil)
7. Basic cooking instructions
8. An estimated rating (4.0-5.0)
9. Generate a detailed, accurate description for a food photo that matches this exact recipe
10. Optional: Source URL if referencing inspiration from the listed websites

IMPORTANT: Only use EVOO or avocado oil. Never include any seed oils in ingredients.

For the image description, be very specific about:
- The exact dish being prepared
- Key visual ingredients that should be visible
- Cooking method appearance (grilled, roasted, sautéed, etc.)
- Plating style and presentation
- Colors and textures that match the recipe

Respond with a JSON object containing a "meals" array in this exact format:
{
  "meals": [
    {
      "title": "Meal Name (Serves 4)",
      "description": "Brief description of the dish for 4 people",
      "cuisine": "Cuisine Type", 
      "protein": "Primary Protein",
      "cookingTime": 30,
      "ingredients": ["2 lbs ingredient (for 4 servings)", "1/4 cup EVOO", "..."],
      "instructions": "Step-by-step cooking instructions using only EVOO or avocado oil",
      "rating": 4.7,
      "imageDescription": "Detailed description of how this exact dish should look when photographed - include specific visual details, colors, textures, and plating that match this recipe",
      "sourceUrl": "optional_inspiration_url"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and meal planning expert creating healthy meals for families. Always respond with valid JSON objects containing meal suggestions. Never use seed oils - only EVOO or avocado oil. All recipes must serve 4 people."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from AI API");
    }

    // Parse the response - AI might wrap the array in an object
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from AI API");
    }

    // Handle different response formats
    let meals: MealSuggestion[];
    if (Array.isArray(parsed)) {
      meals = parsed;
    } else if (parsed.meals && Array.isArray(parsed.meals)) {
      meals = parsed.meals;
    } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      meals = parsed.suggestions;
    } else {
      throw new Error("Unexpected response format from AI API");
    }

    // Validate and clean the data
    return meals.slice(0, count).map(meal => {
      const cleanMeal = {
        title: meal.title || "Untitled Meal",
        description: meal.description || "Delicious meal",
        cuisine: meal.cuisine || "International",
        protein: meal.protein || "Mixed",
        cookingTime: Math.max(5, Math.min(180, meal.cookingTime || 30)),
        ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
        instructions: meal.instructions || "",
        rating: Math.max(4.0, Math.min(5.0, meal.rating || 4.5)),
        imageUrl: meal.imageUrl || generateDeterministicFoodImage(meal.title || "Untitled Meal", meal.cuisine || "International", meal.protein || "Mixed"),
        imageDescription: meal.imageDescription || undefined,
        sourceUrl: meal.sourceUrl || undefined
      };
      return cleanMeal;
    });

  } catch (error) {
    console.error("Error generating meal suggestions:", error);
    throw new Error(`Failed to generate meal suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateGroceryList(
  selectedMeals: MealSuggestion[]
): Promise<{category: string, items: string[]}[]> {
  try {
    const mealsText = selectedMeals.map(meal => 
      `${meal.title}: ${meal.ingredients.join(", ")}`
    ).join("\n");

    const prompt = `Based on these selected meals and their ingredients (all designed to serve 4 people), create a comprehensive, organized grocery list:

${mealsText}

IMPORTANT REQUIREMENTS:
- All meals serve 4 people, so quantities should reflect family-sized portions
- NEVER include seed oils (canola, vegetable, sunflower, etc.) 
- ONLY include Extra Virgin Olive Oil (EVOO) or Avocado Oil for cooking fats
- Organize into logical grocery store categories (Proteins, Vegetables, Fruits, Dairy, Oils & Condiments, Pantry Items, Spices & Seasonings, etc.)
- Combine similar ingredients and provide reasonable quantities for a family of 4
- Remove duplicates and group similar items together

Respond with a JSON array in this exact format:
[
  {
    "category": "Proteins",
    "items": ["2 lbs chicken breast", "1 lb salmon fillet"]
  },
  {
    "category": "Oils & Condiments", 
    "items": ["Extra Virgin Olive Oil", "Avocado Oil"]
  },
  {
    "category": "Vegetables", 
    "items": ["2 tomatoes", "1 cucumber", "1 red onion"]
  }
]`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a helpful grocery planning assistant. Always respond with valid JSON arrays containing categorized shopping lists."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from AI API");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from AI API");
    }

    // Handle different response formats
    let groceryList: {category: string, items: string[]}[];
    if (Array.isArray(parsed)) {
      groceryList = parsed;
    } else if (parsed.groceryList && Array.isArray(parsed.groceryList)) {
      groceryList = parsed.groceryList;
    } else if (parsed.categories && Array.isArray(parsed.categories)) {
      groceryList = parsed.categories;
    } else {
      throw new Error("Unexpected response format from AI API");
    }

    return groceryList.filter(category => 
      category.category && Array.isArray(category.items) && category.items.length > 0
    );

  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw new Error(`Failed to generate grocery list: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
