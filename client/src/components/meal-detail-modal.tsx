import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Users, Heart, Calendar, ExternalLink } from "lucide-react";
import type { Meal } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface MealDetailModalProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite?: boolean;
  onAddToCalendar?: (meal: Meal) => void;
}

export function MealDetailModal({ 
  meal, 
  open, 
  onOpenChange, 
  isFavorite = false,
  onAddToCalendar 
}: MealDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async (isFav: boolean) => {
      if (!meal) return;
      if (isFav) {
        await apiRequest("POST", `/api/favorites/${meal.id}`, {});
      } else {
        await apiRequest("DELETE", `/api/favorites/${meal.id}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `${meal?.title} has been ${isFavorite ? 'removed from' : 'added to'} your favorites`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = () => {
    favoriteMutation.mutate(!isFavorite);
  };

  const handleCalendarClick = () => {
    if (meal && onAddToCalendar) {
      onAddToCalendar(meal);
    }
  };

  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold pr-8">{meal.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Serves 4</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{meal.cookingTime} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{parseFloat(meal.rating.toString()).toFixed(1)}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {meal.cuisine && (
              <Badge variant="secondary">{meal.cuisine}</Badge>
            )}
            {meal.protein && (
              <Badge variant="outline">{meal.protein}</Badge>
            )}
          </div>

          {/* Description */}
          {meal.description && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300">{meal.description}</p>
            </div>
          )}

          {/* Ingredients */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {meal.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {meal.instructions && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Instructions</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {meal.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Source URL */}
          {meal.sourceUrl && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Recipe Inspiration</h3>
              <a 
                href={meal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {new URL(meal.sourceUrl).hostname.replace('www.', '')}
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleFavoriteClick}
              disabled={favoriteMutation.isPending}
              className="flex-1"
            >
              <Heart 
                className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
              />
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Button>
            
            {onAddToCalendar && (
              <Button
                onClick={handleCalendarClick}
                className="flex-1"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}