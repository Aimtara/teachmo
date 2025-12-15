import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, X, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { invokeLLM } from '@/api/integrations';
import { useToast } from '@/components/ui/use-toast';

// Proactive AI "Teachmo Moments" - contextual suggestions based on user behavior
export const TeachmoMoments = ({ user, children, currentPage, recentActivity }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Generate contextual suggestions based on user context
  const generateSuggestions = useCallback(async () => {
    if (!user || !children.length || loading) return;

    setLoading(true);
    try {
      const context = {
        currentPage,
        childrenAges: children.map(child => child.age),
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        recentActivity,
        userMood: user.current_mood,
        parentingStyle: user.parenting_style
      };

      const prompt = `As Teachmo's AI assistant, generate 2-3 proactive, contextual suggestions for a parent based on this context:

Current Context:
- Page: ${currentPage}
- Children ages: ${context.childrenAges.join(', ')}
- Time: ${context.timeOfDay}:00 (${getTimeOfDayLabel(context.timeOfDay)})
- Day: ${getDayLabel(context.dayOfWeek)}
- Recent activity: ${recentActivity || 'None'}
- Parent mood: ${context.userMood || 'Unknown'}
- Parenting style: ${context.parentingStyle || 'Unknown'}

Generate actionable, timely suggestions that feel helpful rather than pushy. Focus on:
1. Time-appropriate activities
2. Mood-boosting suggestions if parent seems stressed
3. Age-appropriate content for their children
4. Learning opportunities based on current page

Return as JSON array of suggestions with: type, title, description, action, urgency, timing`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["activity", "tip", "connection", "milestone"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  action: { type: "string" },
                  urgency: { type: "string", enum: ["low", "medium", "high"] },
                  timing: { type: "string" },
                  icon: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, children, currentPage, recentActivity, loading]);

  // Generate suggestions when context changes significantly
  useEffect(() => {
    const shouldGenerate = 
      suggestions.length === 0 || 
      (Math.random() < 0.3 && Date.now() % 300000 < 1000); // 30% chance every 5 minutes

    if (shouldGenerate) {
      generateSuggestions();
    }
  }, [generateSuggestions, suggestions.length]);

  const handleSuggestionAction = (suggestion) => {
    // Track engagement
    toast({
      title: "Great choice!",
      description: `Taking action on: ${suggestion.title}`,
    });

    // Navigate based on suggestion type
    switch (suggestion.type) {
      case 'activity':
        navigate(createPageUrl('UnifiedDiscover') + '?tab=activities&ai_suggested=true');
        break;
      case 'tip':
        navigate(createPageUrl('Library') + '?category=parenting_tips');
        break;
      case 'connection':
        navigate(createPageUrl('Community'));
        break;
      case 'milestone':
        navigate(createPageUrl('Progress'));
        break;
      default:
        if (suggestion.action.startsWith('http')) {
          window.open(suggestion.action, '_blank');
        }
    }
  };

  const dismissSuggestion = (suggestionId) => {
    setDismissed(prev => new Set([...prev, suggestionId]));
  };

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  if (visibleSuggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2"
      >
        {visibleSuggestions.slice(0, 2).map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="shadow-lg border-l-4 border-l-blue-500 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-medium">Teachmo Moment</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {suggestion.title}
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  {suggestion.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {suggestion.urgency === 'high' && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{suggestion.timing}</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSuggestionAction(suggestion)}
                    className="h-7 text-xs"
                  >
                    {suggestion.action || 'Explore'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

// Smart contextual assistance that appears based on user behavior
export const ContextualAssistance = ({ currentAction, strugglingIndicators }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [helpContent, setHelpContent] = useState(null);

  useEffect(() => {
    const shouldShowHelp = 
      strugglingIndicators?.timeOnPage > 30000 || // 30 seconds on same action
      strugglingIndicators?.repeatActions > 3 || // Repeated same action
      strugglingIndicators?.errorCount > 2; // Multiple errors

    if (shouldShowHelp && !showHelp) {
      generateContextualHelp();
    }
  }, [strugglingIndicators, showHelp]);

  const generateContextualHelp = async () => {
    try {
      const response = await invokeLLM({
        prompt: `Generate helpful guidance for a user who seems to be struggling with: ${currentAction}. 
        Provide a brief, encouraging tip that helps them accomplish their goal.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            actionSuggestion: { type: "string" }
          }
        }
      });

      setHelpContent(response);
      setShowHelp(true);
    } catch (error) {
      console.error('Error generating contextual help:', error);
    }
  };

  if (!showHelp || !helpContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-4 right-4 z-50 max-w-xs"
    >
      <Card className="shadow-lg bg-yellow-50 border-yellow-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-yellow-800">{helpContent.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-yellow-700 mb-2">{helpContent.content}</p>
          <Button size="sm" className="text-xs h-7">
            {helpContent.actionSuggestion}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Utility functions
const getTimeOfDayLabel = (hour) => {
  if (hour < 6) return 'Early Morning';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
};

const getDayLabel = (day) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};