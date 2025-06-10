import OpenAI from "openai";

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
  sourceUrl?: string;
}

export async function generateMealSuggestions(
  proteinPreferences: string[],
  cuisinePreferences: string[],
  dietaryRestrictions: string[] = [],
  count = 6
): Promise<MealSuggestion[]> {
  try {
    const prompt = `You are a professional chef and meal planning expert. Search ONLY these trusted recipe websites for authentic recipes:
- https://www.halfbakedharvest.com
- https://smittenkitchen.com  
- https://www.thekitchn.com
- https://barefootcontessa.com
- https://www.allrecipes.com

Generate ${count} diverse, delicious meal suggestions based on these preferences:

Protein preferences: ${proteinPreferences.join(", ")}
Cuisine preferences: ${cuisinePreferences.join(", ")}
Dietary restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "None"}

For each meal, provide:
1. A creative and appetizing title (from the actual recipe)
2. A brief description (1-2 sentences)
3. The main cuisine type (from the preferences if possible)
4. The primary protein
5. Estimated cooking time in minutes
6. A comprehensive list of ingredients
7. Basic cooking instructions (optional)
8. An estimated rating (4.0-5.0)
9. The direct URL to the recipe image (find actual recipe photos)
10. The source URL from one of the specified websites

IMPORTANT: Only suggest recipes that exist on these websites. Include actual recipe image URLs and source URLs.

Respond with a JSON array in this exact format:
[
  {
    "title": "Meal Name",
    "description": "Brief description of the dish",
    "cuisine": "Cuisine Type", 
    "protein": "Primary Protein",
    "cookingTime": 30,
    "ingredients": ["ingredient 1", "ingredient 2", "..."],
    "instructions": "Basic cooking steps",
    "rating": 4.7,
    "imageUrl": "https://example.com/recipe-image.jpg",
    "sourceUrl": "https://website.com/recipe-url"
  }
]`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a professional chef and meal planning expert. Always respond with valid JSON arrays containing meal suggestions."
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
      throw new Error("No content received from GROK API");
    }

    // Parse the response - GROK might wrap the array in an object
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from GROK API");
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
      throw new Error("Unexpected response format from GROK API");
    }

    // Validate and clean the data
    return meals.slice(0, count).map(meal => ({
      title: meal.title || "Untitled Meal",
      description: meal.description || "Delicious meal",
      cuisine: meal.cuisine || "International",
      protein: meal.protein || "Mixed",
      cookingTime: Math.max(5, Math.min(180, meal.cookingTime || 30)),
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
      instructions: meal.instructions || "",
      rating: Math.max(4.0, Math.min(5.0, meal.rating || 4.5))
    }));

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

    const prompt = `Based on these selected meals and their ingredients, create a comprehensive, organized grocery list:

${mealsText}

Organize the ingredients into logical grocery store categories (Proteins, Vegetables, Fruits, Dairy, Pantry Items, Spices & Seasonings, etc.). 
Combine similar ingredients and provide reasonable quantities where possible.
Remove duplicates and group similar items together.

Respond with a JSON array in this exact format:
[
  {
    "category": "Proteins",
    "items": ["2 lbs chicken breast", "1 lb salmon fillet"]
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
      throw new Error("No content received from GROK API");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from GROK API");
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
      throw new Error("Unexpected response format from GROK API");
    }

    return groceryList.filter(category => 
      category.category && Array.isArray(category.items) && category.items.length > 0
    );

  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw new Error(`Failed to generate grocery list: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
