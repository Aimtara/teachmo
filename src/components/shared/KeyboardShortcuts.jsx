import React, { useState, useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const shortcuts = [
  { key: "Alt + D", action: "Go to Dashboard", description: "Quick access to your home page" },
  { key: "Alt + A", action: "Find Activities", description: "Discover new activities for your children" },
  { key: "Alt + C", action: "AI Coach", description: "Get personalized parenting guidance" },
  { key: "Alt + S", action: "Schedule", description: "View and manage your calendar" },
  { key: "Alt + P", action: "Progress", description: "Track your children's development" },
  { key: "Alt + L", action: "Library", description: "Browse parenting resources" },
  { key: "/", action: "Search", description: "Focus on search input (when available)" },
  { key: "Esc", action: "Close", description: "Close modal or dropdown" },
  { key: "?", action: "Show shortcuts", description: "Display this help dialog" }
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show shortcuts with ? key
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Only if not in an input field
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg"
            >
              <Card className="border-0">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-purple-600" />
                    <CardTitle>Keyboard Shortcuts</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{shortcut.action}</p>
                          <p className="text-xs text-gray-500">{shortcut.description}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {shortcut.key}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Tip:</strong> Press <Badge variant="outline" className="mx-1">?</Badge> 
                      anytime to see these shortcuts, or <Badge variant="outline" className="mx-1">Esc</Badge> to close dialogs.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}