import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  X, 
  Lightbulb, 
  ArrowRight, 
  Clock,
  CheckCircle
} from "lucide-react";

const CONTEXTUAL_TIPS = {
  'Dashboard': [
    {
      id: 'dashboard-empty',
      trigger: 'no-activities',
      title: 'Ready to get started?',
      description: 'Your dashboard will come alive once you add your first child and discover activities!',
      action: 'Add Child Profile',
      actionUrl: '/settings',
      priority: 'high'
    },
    {
      id: 'dashboard-inactive',
      trigger: 'inactive-7-days',
      title: 'Welcome back!',
      description: "It's been a while. Here are some quick activities to get back into the routine.",
      action: 'Browse Activities',
      actionUrl: '/discover',
      priority: 'medium'
    }
  ],
  'UnifiedDiscover': [
    {
      id: 'discover-filters',
      trigger: 'first-visit',
      title: 'Too many options?',
      description: 'Use the filters to find activities perfect for your child\'s age and interests.',
      action: 'Try Filters',
      actionUrl: null,
      priority: 'medium'
    },
    {
      id: 'discover-personalization',
      trigger: 'multiple-visits-no-completion',
      title: 'Not finding what you need?',
      description: 'Complete your child\'s profile for more personalized recommendations.',
      action: 'Complete Profile',
      actionUrl: '/settings',
      priority: 'high'
    }
  ],
  'Calendar': [
    {
      id: 'calendar-empty',
      trigger: 'no-events',
      title: 'Your calendar is empty',
      description: 'Start by planning one activity for this week. Consistency is key!',
      action: 'Plan Activity',
      actionUrl: '/discover',
      priority: 'high'
    }
  ]
};

export default function ContextualHelp({ currentPage, user, triggers = [] }) {
  const [activeTips, setActiveTips] = useState([]);
  const [dismissedTips, setDismissedTips] = useState(new Set());

  useEffect(() => {
    const pageTips = CONTEXTUAL_TIPS[currentPage] || [];
    const relevantTips = pageTips.filter(tip => {
      // Check if tip should be shown based on triggers
      if (dismissedTips.has(tip.id)) return false;
      if (!triggers.includes(tip.trigger)) return false;
      return true;
    });

    setActiveTips(relevantTips.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }));
  }, [currentPage, triggers, dismissedTips]);

  useEffect(() => {
    // Load dismissed tips from user preferences
    if (user?.contextual_help_dismissed) {
      setDismissedTips(new Set(user.contextual_help_dismissed));
    }
  }, [user]);

  const dismissTip = async (tipId) => {
    const newDismissed = new Set(dismissedTips);
    newDismissed.add(tipId);
    setDismissedTips(newDismissed);

    // Save to user preferences
    try {
      await User.updateMyUserData({
        contextual_help_dismissed: Array.from(newDismissed)
      });
    } catch (error) {
      console.error('Failed to save dismissed tip:', error);
    }
  };

  if (activeTips.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {activeTips.slice(0, 1).map(tip => ( // Show only the highest priority tip
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6"
        >
          <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-blue-900">
                      {tip.title}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissTip(tip.id)}
                      className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <p className="text-blue-800 text-sm mb-3">
                    {tip.description}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    {tip.actionUrl ? (
                      <Button
                        size="sm"
                        onClick={() => window.location.href = tip.actionUrl}
                        className="bg-blue-600 hover:bg-blue-700 gap-1"
                      >
                        {tip.action}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => dismissTip(tip.id)}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Got it
                        <CheckCircle className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        tip.priority === 'high' 
                          ? 'border-red-300 text-red-700' 
                          : tip.priority === 'medium'
                            ? 'border-yellow-300 text-yellow-700'
                            : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {tip.priority === 'high' && '🔥'} 
                      {tip.priority === 'medium' && '💡'} 
                      {tip.priority === 'low' && 'ℹ️'} 
                      {tip.priority} priority
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}