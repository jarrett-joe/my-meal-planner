import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/meal-card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Meal, UserFavorite } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Favorites() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  // Fetch user favorites
  const { data: favorites = [], isLoading: favoritesLoading, error } = useQuery({
    queryKey: ["/api/favorites"],
    enabled: !!user,
    retry: false,
  });

  const handleFavoriteToggle = (mealId: number, isFavorite: boolean) => {
    // This will be handled by the MealCard component's mutation
    // The query will be invalidated automatically
  };

  const handleAddToCalendar = (meal: Meal) => {
    toast({
      title: "Calendar Feature",
      description: "Calendar integration coming soon! For now, you can view your planned meals in the dashboard.",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-current" />
                <h1 className="text-xl font-semibold text-gray-900">
                  My Favorites
                </h1>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favoritesLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded mb-4 w-2/3" />
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 bg-gray-200 rounded w-16" />
                    <div className="h-5 bg-gray-200 rounded w-12" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No favorites yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start exploring meals and heart the ones you love to build your personal collection of favorite recipes.
              </p>
              <Link href="/">
                <Button>
                  Discover Meals
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite: UserFavorite & { meal: Meal }) => (
                <MealCard
                  key={favorite.meal.id}
                  meal={favorite.meal}
                  selected={false}
                  onToggle={() => {}} // Favorites page doesn't use selection
                  isFavorite={true}
                  onFavoriteToggle={handleFavoriteToggle}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))}
            </div>

            {favorites.length > 0 && (
              <Card className="bg-gradient-to-r from-orange-100 to-red-100 border-orange-200">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    💡 Pro Tip
                  </h3>
                  <p className="text-orange-800">
                    You can add your favorite meals to your calendar for easy meal planning. 
                    Just click "Add to Calendar" on any meal card!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}