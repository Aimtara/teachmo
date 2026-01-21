
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Contextual tips that appear based on user behavior and location
const CONTEXTUAL_TIPS = {
  Dashboard: [
    {
      id: 'mood_checkin',
      title: 'Daily Mood Check-ins',
      description: 'Regular mood check-ins help us personalize your experience. Try it now!',
      trigger: 'no_mood_checkin_today',
      action: 'highlight_mood',
      priority: 'high'
    },
    {
      id: 'first_activity',
      title: 'Your First Activity Awaits',
      description: 'Discover activities tailored to your family. It takes just a few minutes!',
      trigger: 'no_activities_completed',
      action: 'navigate_activities',
      priority: 'high'
    }
  ],
  UnifiedDiscover: [
    {
      id: 'filter_activities',
      title: 'Use Filters for Better Results',
      description: 'Filter activities by age, duration, or category to find exactly what you need.',
      trigger: 'viewing_activities_first_time',
      action: 'highlight_filters',
      priority: 'medium'
    },
    {
      id: 'save_favorites',
      title: 'Save Activities You Love',
      description: 'Bookmark activities to easily find them again later.',
      trigger: 'browsing_activities',
      action: 'show_bookmark',
      priority: 'low'
    }
  ],
  AIAssistant: [
    {
      id: 'ask_specific_questions',
      title: 'Ask Specific Questions',
      description: 'The more specific your question, the better advice I can give. Try mentioning your child\'s age or situation.',
      trigger: 'first_ai_interaction',
      action: 'show_examples',
      priority: 'medium'
    }
  ],
  Calendar: [
    {
      id: 'create_routine',
      title: 'Build a Family Routine',
      description: 'Schedule regular activities to create consistency and anticipation for your children.',
      trigger: 'empty_calendar',
      action: 'show_scheduling',
      priority: 'medium'
    }
  ]
};

// Progressive disclosure tips
const FEATURE_DISCOVERY_TIPS = [
  {
    id: 'premium_features',
    title: 'Unlock Premium Features',
    description: 'Get unlimited AI conversations, advanced progress tracking, and exclusive content.',
    condition: 'free_user_active_7_days',
    action: 'show_upgrade',
    frequency: 'weekly'
  },
  {
    id: 'community_features',
    title: 'Connect with Other Parents',
    description: 'Join our community to share experiences and get support from other parents.',
    condition: 'completed_5_activities',
    action: 'show_community',
    frequency: 'once'
  }
];

export default function QuickTips({ currentPage }) {
  const navigate = useNavigate();
  const [activeTip, setActiveTip] = useState(null);
  const [dismissedTips, setDismissedTips] = useState([]);
  const [user, setUser] = useState(null);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);

  useEffect(() => {
    const loadUserAndTips = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        const userTips = userData.quick_tips_state || {
          dismissedTips: [],
          lastShown: {},
          permanentlyDismissed: false
        };
        
        setDismissedTips(userTips.dismissedTips || []);
        setPermanentlyDismissed(userTips.permanentlyDismissed || false);
        
        // Don't show tips if permanently dismissed or if tutorial system is dismissed
        if (userTips.permanentlyDismissed || userData.tutorial_progress?.isDismissed) {
          return;
        }
        
        // Check for contextual tips based on current page
        const pageTips = CONTEXTUAL_TIPS[currentPage] || [];
        const availableTip = pageTips.find(tip => 
          !userTips.dismissedTips?.includes(tip.id) && 
          shouldShowTip(tip, userData)
        );
        
        if (availableTip) {
          setActiveTip(availableTip);
        }
      } catch (error) {
        console.error('Error loading tips:', error);
      }
    };
    
    loadUserAndTips();
  }, [currentPage]);

  const shouldShowTip = (tip, userData) => {
    const now = new Date();
    const today = now.toDateString();
    
    switch (tip.trigger) {
      case 'no_mood_checkin_today':
        const lastCheckin = userData.last_mood_checkin;
        return !lastCheckin || new Date(lastCheckin).toDateString() !== today;
      
      case 'no_activities_completed':
        return !userData.activities_completed || userData.activities_completed === 0;
      
      case 'viewing_activities_first_time':
        return !userData.has_viewed_activities;
      
      case 'empty_calendar':
        return !userData.has_scheduled_activities;
      
      case 'first_ai_interaction':
        return !userData.has_used_ai_coach;
      
      default:
        return true;
    }
  };

  const dismissTip = async (tipId) => {
    try {
      const newDismissedTips = [...dismissedTips, tipId];
      const tipsState = {
        dismissedTips: newDismissedTips,
        lastShown: {
          ...(user.quick_tips_state?.lastShown || {}),
          [tipId]: new Date().toISOString()
        },
        permanentlyDismissed: permanentlyDismissed
      };
      
      await User.updateMyUserData({
        quick_tips_state: tipsState
      });
      
      setDismissedTips(newDismissedTips);
      setActiveTip(null);
    } catch (error) {
      console.error('Error dismissing tip:', error);
    }
  };

  const dismissAllTipsPermanently = async () => {
    try {
      const tipsState = {
        dismissedTips: dismissedTips,
        lastShown: user.quick_tips_state?.lastShown || {},
        permanentlyDismissed: true
      };
      
      await User.updateMyUserData({
        quick_tips_state: tipsState
      });
      
      setPermanentlyDismissed(true);
      setActiveTip(null);
    } catch (error) {
      console.error('Error permanently dismissing tips:', error);
    }
  };

  const handleTipAction = (tip) => {
    switch (tip.action) {
      case 'navigate_activities':
        navigate(createPageUrl('UnifiedDiscover'));
        break;
      case 'show_upgrade':
        navigate(createPageUrl('Upgrade'));
        break;
      case 'show_community':
        navigate(createPageUrl('UnifiedCommunity'));
        break;
      case 'highlight_mood':
        // Could scroll to or highlight the mood check-in component
        document.querySelector('[data-tour="mood-checkin"]')?.scrollIntoView({ behavior: 'smooth' });
        break;
      default:
        break;
    }
    dismissTip(tip.id);
  };

  if (!activeTip || permanentlyDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]"
      >
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Quick Tip
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissTip(activeTip.id)}
                className="h-6 w-6 p-0 hover:bg-white/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {activeTip.title}
            </h4>
            
            <p className="text-sm text-gray-700 mb-4">
              {activeTip.description}
            </p>
            
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAllTipsPermanently}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                Don't show tips again
              </Button>
              
              <Button
                size="sm"
                onClick={() => handleTipAction(activeTip)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
              >
                Try It Now
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export { QuickTips };
