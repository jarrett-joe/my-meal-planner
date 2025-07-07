import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Check, Clock, Heart, Calendar } from "lucide-react";
import type { Meal } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface MealCardProps {
  meal: Meal;
  selected: boolean;
  onToggle: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (mealId: number, isFavorite: boolean) => void;
  onAddToCalendar?: (meal: Meal) => void;
}

export function MealCard({ 
  meal, 
  selected, 
  onToggle, 
  isFavorite = false, 
  onFavoriteToggle, 
  onAddToCalendar 
}: MealCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: async (isFav: boolean) => {
      if (isFav) {
        await apiRequest("POST", `/api/favorites/${meal.id}`, {});
      } else {
        await apiRequest("DELETE", `/api/favorites/${meal.id}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      if (onFavoriteToggle) {
        onFavoriteToggle(meal.id, !isFavorite);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    favoriteMutation.mutate(!isFavorite);
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCalendar) {
      onAddToCalendar(meal);
    }
  };
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={onToggle}
    >
      <div className="relative">
        <div className="w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          {meal.imageUrl ? (
            <img 
              src={meal.imageUrl} 
              alt={meal.title}
              className="w-full h-full object-cover rounded-t-lg transition-transform hover:scale-105"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const fallback = img.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full flex items-center justify-center text-gray-400 text-center ${meal.imageUrl ? 'hidden' : 'flex'}`}
            style={{ display: meal.imageUrl ? 'none' : 'flex' }}
          >
            <div>
              <div className="text-4xl mb-2">🍽️</div>
              <div className="text-sm">High-quality recipe photo</div>
              {meal.imageDescription && (
                <div className="text-xs mt-1 px-2 text-gray-500 line-clamp-2">
                  {meal.imageDescription}
                </div>
              )}
            </div>
          </div>
        </div>
        {selected && (
          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-2">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h5 className="font-semibold text-gray-900 mb-2 line-clamp-2">{meal.title}</h5>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {meal.cuisine && (
            <Badge variant="secondary" className="text-xs">
              {meal.cuisine}
            </Badge>
          )}
          {meal.protein && (
            <Badge variant="outline" className="text-xs">
              {meal.protein}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{meal.cookingTime || 30} mins</span>
          </div>
          
          {meal.rating && (
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
              <span className="text-primary font-medium">{parseFloat(meal.rating).toFixed(1)}</span>
            </div>
          )}
        </div>

        {meal.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {meal.description}
          </p>
        )}

        {meal.sourceUrl && (
          <div className="mt-2 text-xs text-gray-500">
            Source: {new URL(meal.sourceUrl).hostname.replace('www.', '')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 mt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavoriteClick}
            disabled={favoriteMutation.isPending}
            className="flex-1 text-xs"
          >
            <Heart 
              className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
            />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
          
          {onAddToCalendar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCalendarClick}
              className="flex-1 text-xs"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Add to Calendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
