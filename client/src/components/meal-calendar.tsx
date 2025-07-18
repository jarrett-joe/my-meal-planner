import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MealDetailModal } from "@/components/meal-detail-modal";
import type { Meal, MealCalendar } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface MealCalendarProps {
  onMealSelect?: (meal: Meal) => void;
  selectedCalendarMeals?: Set<number>;
  onCalendarMealToggle?: (mealId: number) => void;
  onMealAdded?: (mealId: number) => void;
}

interface CalendarDay {
  date: Date;
  meals: (MealCalendar & { meal: Meal })[];
  isCurrentMonth: boolean;
}

export function MealCalendar({ onMealSelect, selectedCalendarMeals = new Set(), onCalendarMealToggle, onMealAdded }: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 6, 1)); // Start at July 2025 to match the data
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [mealDetailOpen, setMealDetailOpen] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch calendar meals for the current month
  
  const { data: calendarMeals = [], isLoading, error } = useQuery({
    queryKey: ["/api/calendar", format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');
      try {
        const response = await fetch(`/api/calendar?startDate=${startDateStr}&endDate=${endDateStr}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        throw error;
      }
    },
    enabled: true, // Ensure query is enabled
    staleTime: 0, // Always refetch to get fresh data
    gcTime: 0, // Don't cache the data
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
    onSuccess: (data, variables) => {
      setSelectedDate(null);
      setDialogOpen(false);
      
      // Automatically add the meal to selected meals for grocery list
      if (onMealAdded && variables.mealId) {
        onMealAdded(variables.mealId);
      }
      
      // Force immediate refetch with more specific invalidation
      queryClient.invalidateQueries({ 
        queryKey: ["/api/calendar"],
        exact: false 
      });
      
      // Also manually refetch the current month's data
      queryClient.refetchQueries({ 
        queryKey: ["/api/calendar", format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')],
        exact: true 
      });
      
      toast({
        title: "Success",
        description: "Meal added to calendar and selected for grocery list",
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
      
      // Immediately invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.refetchQueries({ queryKey: ["/api/calendar"] });
      
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

  // Create calendar days with meals (include previous/next month days to fill grid)
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays: CalendarDay[] = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  }).map(date => {
    const mealsForDay = calendarMeals.filter((cm: any) => {
      const mealDate = new Date(cm.scheduledDate + 'T00:00:00'); // Add time to avoid timezone issues
      const matches = isSameDay(mealDate, date);
      if (matches) {
        console.log(`Meal match found for ${format(date, 'yyyy-MM-dd')}:`, cm.meal?.title, cm.mealType);
      }
      return matches;
    });
    
    return {
      date,
      meals: mealsForDay,
      isCurrentMonth: isSameMonth(date, currentDate),
    };
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleAddMeal = (mealId: number) => {
    if (selectedDate) {
      console.log('Adding meal to calendar:', { mealId, date: selectedDate, mealType: selectedMealType });
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

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setMealDetailOpen(true);
    onMealSelect?.(meal);
  };

  const handleRefreshCalendar = () => {
    console.log('Manually refreshing calendar...');
    queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
    queryClient.refetchQueries({ queryKey: ["/api/calendar"] });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meal Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshCalendar} title="Refresh Calendar">
              <RefreshCw className="w-4 h-4" />
            </Button>
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
        ) : error ? (
          <div className="text-center py-8 text-red-500">Error loading calendar: {error.message}</div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Found {calendarMeals.length} meals for {format(currentDate, "MMMM yyyy")}</span>
              {onCalendarMealToggle && calendarMeals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">Select meals for grocery list:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (selectedCalendarMeals.size === calendarMeals.length) {
                        // Deselect all
                        calendarMeals.forEach(cm => onCalendarMealToggle(cm.meal.id));
                      } else {
                        // Select all
                        calendarMeals.forEach(cm => {
                          if (!selectedCalendarMeals.has(cm.meal.id)) {
                            onCalendarMealToggle(cm.meal.id);
                          }
                        });
                      }
                    }}
                  >
                    {selectedCalendarMeals.size === calendarMeals.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              )}
            </div>
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
                      <div className="flex items-center gap-1">
                        {onCalendarMealToggle && (
                          <Checkbox
                            checked={selectedCalendarMeals.has(calendarMeal.meal.id)}
                            onCheckedChange={() => onCalendarMealToggle(calendarMeal.meal.id)}
                            className="w-3 h-3"
                          />
                        )}
                        <Badge
                          variant="secondary"
                          className="text-xs flex-1 truncate cursor-pointer hover:bg-primary hover:text-white"
                          onClick={() => handleMealClick(calendarMeal.meal)}
                        >
                          {calendarMeal.mealType}: {calendarMeal.meal.title}
                        </Badge>
                      </div>
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
                <Dialog open={dialogOpen && isSameDay(selectedDate || new Date(), day.date)} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setSelectedDate(null);
                    setSelectedMealType("dinner");
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSelectedDate(day.date);
                        setDialogOpen(true);
                      }}
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
          </div>
        )}
      </CardContent>
      
      {/* Meal Detail Modal */}
      <MealDetailModal
        meal={selectedMeal}
        open={mealDetailOpen}
        onOpenChange={setMealDetailOpen}
      />
    </Card>
  );
}