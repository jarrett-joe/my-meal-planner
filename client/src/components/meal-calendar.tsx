import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Meal, MealCalendar } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface MealCalendarProps {
  onMealSelect?: (meal: Meal) => void;
}

interface CalendarDay {
  date: Date;
  meals: (MealCalendar & { meal: Meal })[];
  isCurrentMonth: boolean;
}

export function MealCalendar({ onMealSelect }: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch calendar meals for the current month
  const { data: calendarMeals = [], isLoading } = useQuery({
    queryKey: ["/api/calendar", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/calendar?startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`, {});
      return response.json();
    },
  });

  // Fetch user favorites for meal selection
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
  });

  const addToCalendarMutation = useMutation({
    mutationFn: async ({ mealId, date, mealType }: { mealId: number; date: Date; mealType: string }) => {
      const response = await apiRequest("POST", "/api/calendar", {
        mealId,
        scheduledDate: date.toISOString().split('T')[0],
        mealType
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setSelectedDate(null);
      toast({
        title: "Success",
        description: "Meal added to calendar",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add meal to calendar",
        variant: "destructive",
      });
    },
  });

  const removeFromCalendarMutation = useMutation({
    mutationFn: async ({ date, mealType }: { date: Date; mealType: string }) => {
      await apiRequest("DELETE", `/api/calendar?scheduledDate=${date.toISOString().split('T')[0]}&mealType=${mealType}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({
        title: "Success",
        description: "Meal removed from calendar",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove meal from calendar",
        variant: "destructive",
      });
    },
  });

  // Create calendar days with meals
  const calendarDays: CalendarDay[] = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  }).map(date => ({
    date,
    meals: calendarMeals.filter((cm: any) => 
      isSameDay(new Date(cm.scheduledDate), date)
    ),
    isCurrentMonth: isSameMonth(date, currentDate),
  }));

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleAddMeal = (mealId: number) => {
    if (selectedDate) {
      addToCalendarMutation.mutate({
        mealId,
        date: selectedDate,
        mealType: selectedMealType
      });
    }
  };

  const handleRemoveMeal = (date: Date, mealType: string) => {
    removeFromCalendarMutation.mutate({ date, mealType });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meal Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-medium min-w-[140px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[80px] p-1 border rounded ${
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isSameDay(day.date, new Date()) ? 'border-primary' : 'border-gray-200'}`}
              >
                <div className="text-sm text-gray-600 mb-1">
                  {format(day.date, 'd')}
                </div>
                
                {/* Meals for this day */}
                <div className="space-y-1">
                  {day.meals.map((calendarMeal) => (
                    <div
                      key={`${calendarMeal.id}`}
                      className="relative group"
                    >
                      <Badge
                        variant="secondary"
                        className="text-xs block truncate cursor-pointer hover:bg-primary hover:text-white"
                        onClick={() => onMealSelect?.(calendarMeal.meal)}
                      >
                        {calendarMeal.mealType}: {calendarMeal.meal.title}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 p-0"
                        onClick={() => handleRemoveMeal(day.date, calendarMeal.mealType)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add meal button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Meal for {selectedDate && format(selectedDate, "MMM d, yyyy")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Meal Type</label>
                        <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Select from Favorites</label>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                          {favorites.map((favorite: any) => (
                            <Button
                              key={favorite.meal.id}
                              variant="outline"
                              className="justify-start text-left"
                              onClick={() => handleAddMeal(favorite.meal.id)}
                              disabled={addToCalendarMutation.isPending}
                            >
                              <div>
                                <div className="font-medium">{favorite.meal.title}</div>
                                <div className="text-xs text-gray-500">
                                  {favorite.meal.cuisine} • {favorite.meal.cookingTime || 30} mins
                                </div>
                              </div>
                            </Button>
                          ))}
                          {favorites.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                              No favorites yet. Heart some meals to add them here!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}