import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PreferenceChips } from "@/components/preference-chips";
import { MealCard } from "@/components/meal-card";
import { GroceryListModal } from "@/components/grocery-list-modal";
import { RefreshCw, ListChecks, Settings, ChefHat, CreditCard, Heart, Calendar, LogOut, Plus } from "lucide-react";
import { Link } from "wouter";
import { MealCalendar } from "@/components/meal-calendar";
import { AddToCalendarModal } from "@/components/add-to-calendar-modal";
import { MealDetailModal } from "@/components/meal-detail-modal";
import type { Meal, UserPreferences } from "@shared/schema";

function getWeekStart(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMeals, setSelectedMeals] = useState<Set<number>>(new Set());
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [weekStartDate] = useState(getWeekStart());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddToCalendar, setShowAddToCalendar] = useState(false);
  const [selectedMealForCalendar, setSelectedMealForCalendar] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<Meal | null>(null);
  const [selectedCalendarMeals, setSelectedCalendarMeals] = useState<Set<number>>(new Set());

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/preferences"],
    enabled: !!user,
  });

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Fetch suggested meals - disabled auto fetch, now manual only
  const { data: meals = [], isLoading: mealsLoading, refetch: refetchMeals, error: mealsError } = useQuery({
    queryKey: ["/api/meals", preferences],
    queryFn: async () => {
      if (!preferences?.proteinPreferences?.length && !preferences?.cuisinePreferences?.length) {
        return [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/meals/suggestions", {
          count: 5
        });
        return response.json();
      } catch (error: any) {
        if (error.message.includes('402') || error.message.includes('Insufficient meal credits')) {
          // Handle insufficient credits gracefully
          return [];
        }
        throw error;
      }
    },
    enabled: false, // Disable automatic fetching - now manual only
    retry: false,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<UserPreferences>) => {
      const response = await apiRequest("POST", "/api/preferences", newPreferences);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ title: "Preferences updated successfully!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate grocery list mutation from selected calendar meals
  const generateGroceryListMutation = useMutation({
    mutationFn: async (mealIds: number[]) => {
      const response = await apiRequest("POST", "/api/grocery-list/generate", {
        mealIds,
        weekStartDate: weekStartDate.toISOString(),
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate grocery list cache to fetch the updated data
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-list"] });
      // Set a small delay to ensure cache invalidation completes
      setTimeout(() => setShowGroceryList(true), 100);
      toast({ title: "Grocery list generated successfully!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate grocery list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePreferencesChange = (type: 'protein' | 'cuisine' | 'allergy', values: string[]) => {
    const updates = {
      ...preferences,
      [`${type}Preferences`]: values,
    };
    updatePreferencesMutation.mutate(updates);
  };

  const toggleMealSelection = (mealId: number) => {
    setSelectedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else if (newSet.size < 10) {
        newSet.add(mealId);
      } else {
        toast({
          title: "Maximum reached",
          description: "You can select up to 10 meals per week.",
          variant: "destructive",
        });
      }
      return newSet;
    });
  };

  const handleGenerateGroceryList = () => {
    if (selectedCalendarMeals.size === 0) {
      toast({
        title: "No meals selected",
        description: "Please select at least one meal from your calendar to generate a grocery list.",
        variant: "destructive",
      });
      return;
    }
    generateGroceryListMutation.mutate(Array.from(selectedCalendarMeals));
  };

  const handleRefreshSuggestions = () => {
    if (!preferences?.proteinPreferences?.length && !preferences?.cuisinePreferences?.length) {
      toast({
        title: "Set preferences first",
        description: "Please select your protein and cuisine preferences to get meal suggestions.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedMeals(new Set());
    refetchMeals();
  };

  const handleFavoriteToggle = (mealId: number, isFavorite: boolean) => {
    // This will be handled by the MealCard component's mutation
    // The query will be invalidated automatically
  };

  const handleAddToCalendar = (meal: Meal) => {
    setSelectedMealForCalendar(meal);
    setShowAddToCalendar(true);
  };

  const handleAdminLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/admin-logout");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/api/login";
    return null;
  }

  // Check subscription status
  if (user.subscriptionStatus !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <ChefHat className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Required</h1>
            <p className="text-gray-600 mb-6">
              You need an active subscription to access the meal planning features.
            </p>
            <Button onClick={() => window.location.href = "/subscribe"}>
              Subscribe Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Welcome back, {user.firstName || 'Chef'}!
              </h1>
              {user?.id === 'admin-master' && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 mt-1">
                  Master Admin Access
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium">
                  {user?.mealCredits || 0} credits
                </span>
                {user?.subscriptionPlan === 'trial' && (
                  <Badge variant="outline" className="text-xs ml-1">
                    Trial
                  </Badge>
                )}
              </div>
              <Badge variant="secondary">
                {selectedMeals.size}/10 meals selected
              </Badge>
              {(user?.mealCredits || 0) === 0 && (
                <Link href="/subscribe">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    Get More Meals
                  </Button>
                </Link>
              )}
              <Link href="/favorites">
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Favorites
                </Button>
              </Link>
              <Link href="/custom-recipes">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Custom Recipes
                </Button>
              </Link>
              {user?.id === 'admin-master' ? (
                <Button variant="outline" size="sm" onClick={handleAdminLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {preferencesLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <PreferenceChips
                      title="Protein Preferences"
                      options={["Chicken", "Beef", "Fish", "Vegetarian", "Pork", "Tofu"]}
                      selected={preferences?.proteinPreferences || []}
                      onChange={(values) => handlePreferencesChange('protein', values)}
                      loading={updatePreferencesMutation.isPending}
                    />
                    <PreferenceChips
                      title="Cuisine Types"
                      options={["Italian", "Mexican", "Mediterranean", "Asian", "American", "Indian", "French"]}
                      selected={preferences?.cuisinePreferences || []}
                      onChange={(values) => handlePreferencesChange('cuisine', values)}
                      loading={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <PreferenceChips
                    title="Allergy & Dietary Restrictions"
                    options={["Gluten-Free", "Dairy-Free", "Egg-Free", "Soy-Free", "Nut-Free", "Vegan", "Keto", "Low-Carb"]}
                    selected={preferences?.allergyPreferences || []}
                    onChange={(values) => handlePreferencesChange('allergy', values)}
                    loading={updatePreferencesMutation.isPending}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Suggested Meals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI-Suggested Meals</CardTitle>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshSuggestions}
                  disabled={mealsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${mealsLoading ? 'animate-spin' : ''}`} />
                  Search for Meals
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mealsLoading ? (
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
              ) : meals.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No meal suggestions yet</h3>
                  <p className="text-gray-600 mb-4">
                    Set your preferences above and click "Search for Meals" to get AI-powered meal recommendations.
                  </p>
                  <Button 
                    onClick={handleRefreshSuggestions}
                    disabled={mealsLoading || (!preferences?.proteinPreferences?.length && !preferences?.cuisinePreferences?.length)}
                    size="lg"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${mealsLoading ? 'animate-spin' : ''}`} />
                    Search for Meals
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {meals.map((meal: Meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      selected={selectedMeals.has(meal.id)}
                      onToggle={() => toggleMealSelection(meal.id)}
                      isFavorite={favorites.some((fav: any) => fav.meal.id === meal.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                      onAddToCalendar={handleAddToCalendar}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>



          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Meal Calendar
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateGroceryList}
                    disabled={generateGroceryListMutation.isPending || selectedCalendarMeals.size === 0}
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    {generateGroceryListMutation.isPending 
                      ? "Generating..." 
                      : selectedCalendarMeals.size > 0 
                        ? `Generate Grocery List (${selectedCalendarMeals.size} meals)`
                        : "Generate Grocery List"
                    }
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showCalendar && (
              <CardContent>
                <MealCalendar 
                  onMealSelect={(meal) => {
                    setSelectedMealForDetail(meal);
                    setShowMealDetail(true);
                  }}
                  selectedCalendarMeals={selectedCalendarMeals}
                  onCalendarMealToggle={(mealId) => {
                    setSelectedCalendarMeals(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(mealId)) {
                        newSet.delete(mealId);
                      } else {
                        newSet.add(mealId);
                      }
                      return newSet;
                    });
                  }}
                  onMealAdded={(mealId) => {
                    // Automatically select newly added meals for grocery list
                    setSelectedCalendarMeals(prev => new Set(prev).add(mealId));
                  }}
                />
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Grocery List Modal */}
      <GroceryListModal
        open={showGroceryList}
        onOpenChange={setShowGroceryList}
        weekStartDate={weekStartDate}
      />

      {/* Add to Calendar Modal */}
      <AddToCalendarModal
        meal={selectedMealForCalendar}
        open={showAddToCalendar}
        onOpenChange={setShowAddToCalendar}
        onMealAdded={(mealId) => {
          // Automatically select newly added meals for grocery list
          setSelectedCalendarMeals(prev => new Set(prev).add(mealId));
        }}
      />

      {/* Meal Detail Modal - For viewing recipes from calendar */}
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
