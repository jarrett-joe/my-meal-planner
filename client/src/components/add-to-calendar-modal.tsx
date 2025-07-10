import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import type { Meal } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";

interface AddToCalendarModalProps {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToCalendarModal({ meal, open, onOpenChange }: AddToCalendarModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<string>("dinner");

  // Generate next 7 days for selection
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const addToCalendarMutation = useMutation({
    mutationFn: async () => {
      if (!meal || !selectedDate) return;
      
      const response = await apiRequest("POST", "/api/calendar", {
        mealId: meal.id,
        scheduledDate: selectedDate,
        mealType: selectedMealType
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all calendar-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.refetchQueries({ queryKey: ["/api/calendar"] });
      onOpenChange(false);
      setSelectedDate("");
      setSelectedMealType("dinner");
      toast({
        title: "Added to Calendar",
        description: `${meal?.title} has been scheduled for ${selectedMealType}`,
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

  const handleSubmit = () => {
    if (!selectedDate) {
      toast({
        title: "Select a Date",
        description: "Please choose a date for this meal",
        variant: "destructive",
      });
      return;
    }
    addToCalendarMutation.mutate();
  };

  if (!meal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Add to Calendar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{meal.title}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{meal.cookingTime} minutes</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a date" />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((date) => (
                    <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {format(date, 'EEEE, MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Meal Type</label>
              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addToCalendarMutation.isPending || !selectedDate}
              className="flex-1"
            >
              {addToCalendarMutation.isPending ? "Adding..." : "Add to Calendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}