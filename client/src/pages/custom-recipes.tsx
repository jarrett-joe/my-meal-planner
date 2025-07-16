import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MealCard } from "@/components/meal-card";
import { AddToCalendarModal } from "@/components/add-to-calendar-modal";
import { MealDetailModal } from "@/components/meal-detail-modal";
import { Plus, Link, FileText, Upload, ArrowLeft, ChefHat } from "lucide-react";
import { Link as RouterLink } from "wouter";
import type { Meal } from "@shared/schema";

export default function CustomRecipes() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputMethod, setInputMethod] = useState<"url" | "manual">("url");
  const [selectedMealForCalendar, setSelectedMealForCalendar] = useState<Meal | null>(null);
  const [showAddToCalendar, setShowAddToCalendar] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);

  // Form state
  const [recipeUrl, setRecipeUrl] = useState("");
  const [manualRecipe, setManualRecipe] = useState({
    title: "",
    description: "",
    cuisine: "",
    protein: "",
    cookingTime: "",
    ingredients: "",
    instructions: "",
    sourceUrl: ""
  });

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    setTimeout(() => {
      window.location.href = "/auth";
    }, 500);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Fetch user's custom recipes
  const { data: userRecipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes/user"],
    enabled: !!user,
  });

  // Fetch user favorites for meal selection
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // URL recipe parsing mutation
  const parseUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/recipes/parse-url", { url });
      return response.json();
    },
    onSuccess: (data) => {
      setManualRecipe({
        title: data.title || "",
        description: data.description || "",
        cuisine: data.cuisine || "",
        protein: data.protein || "",
        cookingTime: data.cookingTime?.toString() || "",
        ingredients: Array.isArray(data.ingredients) ? data.ingredients.join("\n") : "",
        instructions: data.instructions || "",
        sourceUrl: recipeUrl
      });
      setInputMethod("manual");
      toast({ title: "Recipe parsed successfully!", description: "Please review and adjust the details below." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error parsing recipe",
        description: "Could not parse the recipe from this URL. Please try entering the recipe manually.",
        variant: "destructive",
      });
    },
  });

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: async () => {
      const ingredients = manualRecipe.ingredients
        .split("\n")
        .filter(line => line.trim())
        .map(line => line.trim());

      const response = await apiRequest("POST", "/api/recipes/create", {
        title: manualRecipe.title,
        description: manualRecipe.description,
        cuisine: manualRecipe.cuisine,
        protein: manualRecipe.protein,
        cookingTime: parseInt(manualRecipe.cookingTime) || null,
        ingredients,
        instructions: manualRecipe.instructions,
        sourceUrl: manualRecipe.sourceUrl
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/user"] });
      setManualRecipe({
        title: "",
        description: "",
        cuisine: "",
        protein: "",
        cookingTime: "",
        ingredients: "",
        instructions: "",
        sourceUrl: ""
      });
      setRecipeUrl("");
      toast({ title: "Recipe saved successfully!", description: "Your custom recipe has been added to your collection." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error saving recipe",
        description: "Failed to save your recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUrlSubmit = () => {
    if (!recipeUrl.trim()) {
      toast({ title: "Please enter a recipe URL", variant: "destructive" });
      return;
    }
    parseUrlMutation.mutate(recipeUrl);
  };

  const handleManualSubmit = () => {
    if (!manualRecipe.title.trim() || !manualRecipe.ingredients.trim()) {
      toast({ title: "Please fill in at least the title and ingredients", variant: "destructive" });
      return;
    }
    createRecipeMutation.mutate();
  };

  const handleAddToCalendar = (meal: Meal) => {
    setSelectedMealForCalendar(meal);
    setShowAddToCalendar(true);
  };

  const handleFavoriteToggle = async (mealId: number, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${mealId}`);
        toast({ title: "Removed from favorites" });
      } else {
        await apiRequest("POST", "/api/favorites", { mealId });
        toast({ title: "Added to favorites" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <RouterLink href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </RouterLink>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Custom Recipes</h1>
              <p className="text-gray-600 mt-1">Add your own recipes to use in meal planning</p>
            </div>
          </div>
        </div>

        {/* Add Recipe Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Recipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Method Toggle */}
            <div className="flex gap-2">
              <Button
                variant={inputMethod === "url" ? "default" : "outline"}
                onClick={() => setInputMethod("url")}
              >
                <Link className="w-4 h-4 mr-2" />
                From URL
              </Button>
              <Button
                variant={inputMethod === "manual" ? "default" : "outline"}
                onClick={() => setInputMethod("manual")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
            </div>

            {inputMethod === "url" ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipe-url">Recipe URL</Label>
                  <Input
                    id="recipe-url"
                    placeholder="https://example.com/recipe"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleUrlSubmit}
                  disabled={parseUrlMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {parseUrlMutation.isPending ? "Parsing..." : "Parse Recipe"}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Recipe Title *</Label>
                    <Input
                      id="title"
                      placeholder="Delicious Recipe Name"
                      value={manualRecipe.title}
                      onChange={(e) => setManualRecipe(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the recipe"
                      value={manualRecipe.description}
                      onChange={(e) => setManualRecipe(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cuisine">Cuisine</Label>
                      <Select value={manualRecipe.cuisine} onValueChange={(value) => setManualRecipe(prev => ({ ...prev, cuisine: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Italian">Italian</SelectItem>
                          <SelectItem value="Mexican">Mexican</SelectItem>
                          <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                          <SelectItem value="Asian">Asian</SelectItem>
                          <SelectItem value="American">American</SelectItem>
                          <SelectItem value="Indian">Indian</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="protein">Main Protein</Label>
                      <Select value={manualRecipe.protein} onValueChange={(value) => setManualRecipe(prev => ({ ...prev, protein: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select protein" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Chicken">Chicken</SelectItem>
                          <SelectItem value="Beef">Beef</SelectItem>
                          <SelectItem value="Fish">Fish</SelectItem>
                          <SelectItem value="Pork">Pork</SelectItem>
                          <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="Tofu">Tofu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cooking-time">Cooking Time (minutes)</Label>
                      <Input
                        id="cooking-time"
                        type="number"
                        placeholder="30"
                        value={manualRecipe.cookingTime}
                        onChange={(e) => setManualRecipe(prev => ({ ...prev, cookingTime: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="source-url">Source URL (optional)</Label>
                      <Input
                        id="source-url"
                        placeholder="https://original-recipe.com"
                        value={manualRecipe.sourceUrl}
                        onChange={(e) => setManualRecipe(prev => ({ ...prev, sourceUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ingredients">Ingredients (one per line) *</Label>
                    <Textarea
                      id="ingredients"
                      placeholder="1 lb ground beef&#10;2 tbsp EVOO&#10;1 onion, diced&#10;Salt and pepper to taste"
                      value={manualRecipe.ingredients}
                      onChange={(e) => setManualRecipe(prev => ({ ...prev, ingredients: e.target.value }))}
                      rows={8}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="1. Heat EVOO in a large skillet...&#10;2. Add ground beef and cook until browned...&#10;3. Season with salt and pepper..."
                      value={manualRecipe.instructions}
                      onChange={(e) => setManualRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {inputMethod === "manual" && (
              <Button 
                onClick={handleManualSubmit}
                disabled={createRecipeMutation.isPending}
                className="w-full"
              >
                {createRecipeMutation.isPending ? "Saving..." : "Save Recipe"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* User Recipes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Your Custom Recipes ({userRecipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipesLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userRecipes.length === 0 ? (
              <div className="text-center py-12">
                <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No custom recipes yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first custom recipe using the form above. You can import from a URL or enter manually.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userRecipes.map((meal: Meal) => (
                  <div key={meal.id} className="relative">
                    <Badge className="absolute top-2 right-2 z-10 bg-blue-100 text-blue-800">
                      Custom
                    </Badge>
                    <MealCard
                      meal={meal}
                      selected={false}
                      onToggle={() => {}}
                      isFavorite={favorites.some((fav: any) => fav.meal.id === meal.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                      onAddToCalendar={handleAddToCalendar}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add to Calendar Modal */}
      <AddToCalendarModal
        meal={selectedMealForCalendar}
        open={showAddToCalendar}
        onOpenChange={setShowAddToCalendar}
        onMealAdded={() => {}} // We don't need automatic selection here since it's a separate page
      />

      {/* Meal Detail Modal */}
      <MealDetailModal
        meal={selectedMealForDetail}
        open={showMealDetail}
        onOpenChange={setShowMealDetail}
        isFavorite={favorites.some((fav: any) => fav.meal.id === selectedMealForDetail?.id)}
        onAddToCalendar={handleAddToCalendar}
      />
    </div>
  );
}