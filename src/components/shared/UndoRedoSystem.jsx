import React, { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Redo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

// Context for managing undo/redo state across the app
const UndoRedoContext = createContext();

export const useUndoRedo = () => {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within UndoRedoProvider');
  }
  return context;
};

export const UndoRedoProvider = ({ children }) => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const addAction = (action) => {
    const newAction = {
      id: Date.now(),
      timestamp: new Date(),
      ...action
    };

    // Remove any actions after current index (when user has undone some actions)
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newAction);
    
    // Keep only last 20 actions to prevent memory issues
    const trimmedHistory = newHistory.slice(-20);
    
    setHistory(trimmedHistory);
    setCurrentIndex(trimmedHistory.length - 1);
    setLastAction(newAction);
    
    // Show undo toast for important actions
    if (action.showToast !== false) {
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
    }
  };

  const undo = async () => {
    if (currentIndex >= 0) {
      const action = history[currentIndex];
      try {
        if (action.undo) {
          await action.undo();
        }
        setCurrentIndex(currentIndex - 1);
        toast({
          title: "Undone",
          description: action.description || "Action undone"
        });
      } catch (error) {
        toast({
          title: "Undo failed",
          description: "Could not undo the last action",
          variant: "destructive"
        });
      }
    }
  };

  const redo = async () => {
    if (currentIndex < history.length - 1) {
      const action = history[currentIndex + 1];
      try {
        if (action.redo) {
          await action.redo();
        }
        setCurrentIndex(currentIndex + 1);
        toast({
          title: "Redone",
          description: action.description || "Action redone"
        });
      } catch (error) {
        toast({
          title: "Redo failed",
          description: "Could not redo the action",
          variant: "destructive"
        });
      }
    }
  };

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, history]);

  return (
    <UndoRedoContext.Provider value={{ addAction, undo, redo, canUndo, canRedo }}>
      {children}
      
      {/* Floating Undo Toast */}
      <AnimatePresence>
        {showUndoToast && lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 left-4 z-50"
          >
            <Card className="p-3 shadow-lg border bg-white">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{lastAction.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(lastAction.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={undo}
                  className="gap-1"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUndoToast(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Undo/Redo Controls */}
      <div className="fixed bottom-4 right-4 z-40 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="rounded-full w-10 h-10 p-0 shadow-lg"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="rounded-full w-10 h-10 p-0 shadow-lg"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>
    </UndoRedoContext.Provider>
  );
};