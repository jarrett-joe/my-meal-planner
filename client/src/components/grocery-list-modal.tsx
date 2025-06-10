import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Share, ShoppingCart, Loader2 } from "lucide-react";
import type { GroceryList } from "@shared/schema";

interface GroceryListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStartDate: Date;
}

export function GroceryListModal({ open, onOpenChange, weekStartDate }: GroceryListModalProps) {
  const { data: groceryList, isLoading } = useQuery({
    queryKey: ["/api/grocery-list", weekStartDate.toISOString().split('T')[0]],
    enabled: open,
  });

  const handleDownload = () => {
    if (!groceryList?.ingredients) return;
    
    let content = "Plan My Plates - Grocery List\n";
    content += `Week of ${weekStartDate.toLocaleDateString()}\n\n`;
    
    groceryList.ingredients.forEach((category: any) => {
      content += `${category.category}:\n`;
      category.items.forEach((item: string) => {
        content += `  • ${item}\n`;
      });
      content += '\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-list-${weekStartDate.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!groceryList?.ingredients || !navigator.share) return;
    
    let text = "My Plan My Plates Grocery List:\n\n";
    groceryList.ingredients.forEach((category: any) => {
      text += `${category.category}:\n`;
      category.items.forEach((item: string) => {
        text += `• ${item}\n`;
      });
      text += '\n';
    });
    
    try {
      await navigator.share({
        title: 'Plan My Plates Grocery List',
        text,
      });
    } catch (error) {
      // Fall back to copying to clipboard
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Your Grocery List
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : groceryList?.ingredients?.length ? (
          <>
            <div className="space-y-6">
              {groceryList.ingredients.map((category: any, categoryIndex: number) => (
                <div key={categoryIndex}>
                  <h4 className="font-semibold text-lg mb-3 text-gray-900">
                    {category.category}
                  </h4>
                  <ul className="space-y-2">
                    {category.items.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="flex items-center">
                        <Checkbox className="mr-3" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-4 mt-8">
              <Button className="flex-1" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download List
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share className="w-4 h-4 mr-2" />
                Share List
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grocery list found</h3>
            <p className="text-gray-600">
              Select some meals and generate a grocery list to see it here.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
