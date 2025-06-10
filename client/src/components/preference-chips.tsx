import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface PreferenceChipsProps {
  title: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  loading?: boolean;
}

export function PreferenceChips({ 
  title, 
  options, 
  selected, 
  onChange, 
  loading = false 
}: PreferenceChipsProps) {
  const toggleOption = (option: string) => {
    if (loading) return;
    
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    
    onChange(newSelected);
  };

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
        {title}
        {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            variant={selected.includes(option) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleOption(option)}
            className="rounded-full"
            disabled={loading}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
