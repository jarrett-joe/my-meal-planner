import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Check, Clock } from "lucide-react";
import type { Meal } from "@shared/schema";

interface MealCardProps {
  meal: Meal;
  selected: boolean;
  onToggle: () => void;
}

export function MealCard({ meal, selected, onToggle }: MealCardProps) {
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
      </CardContent>
    </Card>
  );
}
