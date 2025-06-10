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
        <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
          {meal.imageUrl ? (
            <img 
              src={meal.imageUrl} 
              alt={meal.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="text-gray-400 text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <div className="text-sm">No image available</div>
            </div>
          )}
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
      </CardContent>
    </Card>
  );
}
