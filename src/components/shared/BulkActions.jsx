import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Square, Calendar, CheckCircle, Trash2, BookmarkPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { useUndoRedo } from "./UndoRedoSystem";

export const useBulkSelection = (items = []) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      clearSelection();
    }
  };

  return {
    selectedItems,
    isSelectionMode,
    toggleItem,
    selectAll,
    clearSelection,
    toggleSelectionMode,
    selectedCount: selectedItems.size
  };
};

export const BulkActionBar = ({ 
  selectedCount, 
  onPlanAll, 
  onCompleteAll, 
  onBookmarkAll, 
  onDeleteAll,
  onClearSelection,
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkAction = async (action, actionName) => {
    setIsLoading(true);
    try {
      await action();
      toast({
        title: "Success",
        description: `${actionName} applied to ${selectedCount} items`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${actionName.toLowerCase()} items`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
        >
          <Card className="p-4 shadow-lg border bg-white">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex gap-2">
                {onPlanAll && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction(onPlanAll, "Plan")}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    Plan All
                  </Button>
                )}
                
                {onCompleteAll && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction(onCompleteAll, "Complete")}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Complete All
                  </Button>
                )}
                
                {onBookmarkAll && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction(onBookmarkAll, "Bookmark")}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                    Bookmark All
                  </Button>
                )}
                
                {onDeleteAll && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction(onDeleteAll, "Delete")}
                    disabled={isLoading}
                    className="gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete All
                  </Button>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 w-8 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SelectableCard = ({ 
  children, 
  isSelected, 
  onToggleSelect, 
  isSelectionMode, 
  className = "" 
}) => {
  return (
    <div className={`relative ${className}`}>
      {isSelectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="bg-white border-2 border-gray-300 shadow-sm"
          />
        </div>
      )}
      <div 
        className={`${isSelectionMode ? 'pl-8' : ''} ${isSelected ? 'ring-2 ring-purple-500 ring-opacity-50' : ''} transition-all duration-200`}
      >
        {children}
      </div>
    </div>
  );
};