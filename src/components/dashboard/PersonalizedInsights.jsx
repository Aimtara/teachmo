
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, TrendingUp, Target, Clock, ArrowRight, Sparkles, Heart, Coffee, CheckCircle2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/api/integrations";
import { format, subDays } from "date-fns";
import { Activity } from "@/api/entities";
import { generateWarmOpener, getAdaptiveResponse, FALLBACK_RESPONSES } from "../shared/TeachmoTone";
import { useToast } from "@/components/ui/use-toast";

const FALLBACK_INSIGHTS = [
  {
    title: "Focus on Connection",
    celebration: "You're here, you're present, and that's a huge win!",
    observation: "Sometimes the best plan is to simply connect.",
    why_it_matters: "Strong bonds are the foundation for all growth and learning. Quality time builds trust and security.",
    action_step: "Spend 10 minutes of uninterrupted, screen-free time together today. Let your child lead the play.",
    encouragement: "You are your child's favorite toy. Enjoy these simple moments!",
    time_commitment: "10-15 minutes",
    confidence_level: "high",
    category: "emotional"
  },
  {
    title: "Embrace Curiosity",
    celebration: "Your child's questions show they are engaged and learning!",
    observation: "Nurturing a curious mind is a gift that lasts a lifetime.",
    why_it_matters: "Curiosity fuels a love for learning and helps develop critical thinking skills.",
    action_step: "Answer your child's next 'why?' question with 'That's a great question! What do you think?'",
    encouragement: "You don't need to have all the answers—exploring them together is the fun part!",
    time_commitment: "5 minutes",
    confidence_level: "high",
    category: "learning"
  }
];

export default function PersonalizedInsights({ children, activities, user }) {
  const { toast } = useToast();
  const [insights, setInsights] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [implementedInsights, setImplementedInsights] = useState(new Set());
  const [buttonFeedback, setButtonFeedback] = useState({}); // { index: 'adding' | undefined }

  useEffect(() => {
    // Guard against undefined or empty children array
    if (children && children.length > 0) {
      setSelectedChild(children[0]);
      generatePersonalizedInsights(children[0]);
    }
  }, [children, activities]);

  const generatePersonalizedInsights = async (child) => {
    if (!child || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    setUsingFallback(false);
    setImplementedInsights(new Set()); // Reset implemented insights when regenerating
    setButtonFeedback({}); // Reset button feedback
    
    try {
      // Safely filter activities with null checks
      const childActivities = (activities || []).filter(a => a && a.child_id === child.id);
      const recentCompleted = childActivities
        .filter(a => a && a.status === 'completed' && a.completion_date)
        .slice(0, 5);
      const plannedActivities = childActivities.filter(a => a && a.status === 'planned');

      const warmOpener = generateWarmOpener('general', user?.current_mood);
      const adaptiveResponse = getAdaptiveResponse(user?.current_mood || 'confident');

      const response = await InvokeLLM({
        prompt: `${warmOpener} You're Teachmo, providing personalized parenting insights with warmth and professionalism.

        TONE GUIDELINES:
        - Start with genuine warmth and encouragement
        - Be concise and actionable (never preachy)
        - Use empowering language: "You've got this!" "Trust your instincts!"
        - Celebrate progress, however small
        - Provide specific, achievable next steps

        CHILD PROFILE:
        Name: ${child.name}
        Age: ${child.age} years old
        Interests: ${child.interests?.join(', ') || 'Not specified'}
        Development Goals: ${child.development_goals?.join(', ') || 'Not specified'}
        Personality Traits: ${child.personality_traits?.join(', ') || 'Not specified'}
        Current Challenges: ${child.challenges?.join(', ') || 'None specified'}

        RECENT ACTIVITY DATA:
        Recently Completed Activities: ${recentCompleted.map(a => `${a.title} (${a.category}, rated ${a.rating || 'not rated'})`).join('; ') || 'None'}
        Upcoming Planned Activities: ${plannedActivities.map(a => `${a.title} (${a.category})`).join('; ') || 'None'}

        Generate 3 personalized insights that:
        1. Celebrate what's going well (however small)
        2. Acknowledge any challenges with empathy
        3. Provide concrete, encouraging next steps
        4. Connect to ${child.name}'s specific interests and developmental stage
        5. Use Teachmo's warm, empowering tone

        ${adaptiveResponse}`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  celebration: { type: "string" },
                  observation: { type: "string" },
                  why_it_matters: { type: "string" },
                  action_step: { type: "string" },
                  encouragement: { type: "string" },
                  time_commitment: { type: "string" },
                  confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                  category: { type: "string", enum: ["development", "learning", "social", "emotional", "physical", "creative"] }
                }
              }
            }
          }
        }
      });

      setInsights(response.insights || []);
    } catch (error) {
      console.error("Error generating personalized insights:", error);
      if (error.message?.includes('RateLimitError') || error.message?.includes('quota') || error.message?.includes('Network')) {
        setError("Our AI is taking a coffee break! You've hit a rate limit or we're experiencing high demand. Please try again in a moment, or enjoy these hand-picked insights.");
        useFallbackInsights(child);
      } else {
        const fallbackResponse = FALLBACK_RESPONSES.technical_error[Math.floor(Math.random() * FALLBACK_RESPONSES.technical_error.length)];
        setError(fallbackResponse + " While we fix things, here are some helpful general insights.");
        useFallbackInsights(child);
      }
    }
    setIsGenerating(false);
  };

  const useFallbackInsights = (child) => {
    setUsingFallback(true);
    const customizedInsights = FALLBACK_INSIGHTS.map(insight => ({
      ...insight,
      action_step: insight.action_step.replace('your child', child.name)
    }));
    setInsights(customizedInsights);
  };

  const handleTryThisWeek = async (insight, index) => {
    if (implementedInsights.has(index) || buttonFeedback[index] === 'adding') {
        return; // Prevent multiple clicks
    }

    try {
      // Create an activity based on the insight
      const activityData = {
        title: `${insight.title} - Week Goal`,
        description: insight.action_step,
        category: insight.category || 'emotional',
        duration: insight.time_commitment,
        why_it_matters: insight.why_it_matters,
        teachmo_tip: insight.encouragement,
        instructions: [insight.action_step],
        learning_objectives: [insight.title],
        child_id: selectedChild?.id,
        status: 'planned',
        is_personalized: true
      };

      await Activity.create(activityData);
      
      // Temporarily show "Added!" feedback
      setButtonFeedback(prev => ({ ...prev, [index]: 'adding' }));
      
      setTimeout(() => {
        setImplementedInsights(prev => new Set([...prev, index])); // Mark as permanently implemented after feedback
        setButtonFeedback(prev => {
            const newState = { ...prev };
            delete newState[index]; // Clear temporary feedback
            return newState;
        });
      }, 2000); // Show feedback for 2 seconds

    } catch (error) {
      console.error('Error creating activity from insight:', error);
      toast({
        variant: 'destructive',
        title: 'Error adding activity',
        description: 'Could not add this to your activities. Please try again.'
      });
      setButtonFeedback(prev => {
        const newState = { ...prev };
        delete newState[index]; // Clear temporary feedback on error
        return newState;
    });
    }
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      development: 'bg-blue-100 text-blue-800',
      learning: 'bg-purple-100 text-purple-800',
      social: 'bg-pink-100 text-pink-800',
      emotional: 'bg-indigo-100 text-indigo-800',
      physical: 'bg-green-100 text-green-800',
      creative: 'bg-orange-100 text-orange-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Guard clause for missing children
  if (!children || children.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            AI Parenting Insights
            {usingFallback && (
              <Badge variant="outline" className="ml-2 text-xs border-orange-300 text-orange-700 bg-orange-50">
                <Coffee className="w-3 h-3 mr-1" />
                Teachmo's Picks
              </Badge>
            )}
          </CardTitle>
          {children.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant={selectedChild?.id === child.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedChild(child);
                    generatePersonalizedInsights(child);
                  }}
                  className="gap-1 text-xs px-2 py-1 h-7"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
                  />
                  {child.name}
                </Button>
              ))}
            </div>
          )}
        </div>
        {selectedChild && (
          <p className="text-xs text-gray-600">
            Personalized guidance for {selectedChild.name} ({selectedChild.age} years old)
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {error && (
          <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400 mb-4">
            <p className="text-sm text-orange-800">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => generatePersonalizedInsights(selectedChild)} 
              className="mt-2 h-7 text-xs"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Try AI Again"}
            </Button>
          </div>
        )}

        {isGenerating ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-3" style={{borderColor: 'var(--teachmo-sage)'}}></div>
            <p className="text-sm text-gray-600">Analyzing {selectedChild?.name}'s development...</p>
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {insights.map((insight, index) => {
                const isPermanentlyAdded = implementedInsights.has(index);
                const isTemporarilyAdding = buttonFeedback[index] === 'adding';
                const isDisabled = isPermanentlyAdded || isTemporarilyAdding;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-300 cursor-pointer"
                    style={{backgroundColor: 'var(--teachmo-warm-white)'}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                      <div className="flex gap-1">
                        <Badge className={`${getCategoryColor(insight.category)} text-xs px-2 py-0`}>
                          {insight.category}
                        </Badge>
                        <Badge className={`${getConfidenceColor(insight.confidence_level)} text-xs px-2 py-0`}>
                          {insight.confidence_level}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {insight.celebration && (
                        <div className="p-2 bg-green-50 rounded border-l-2 border-green-400">
                          <p className="text-xs font-medium text-green-900 mb-1 flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Celebrating:
                          </p>
                          <p className="text-xs text-green-800">{insight.celebration}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Key Insight:</p>
                        <p className="text-xs text-gray-600">{insight.observation}</p>
                      </div>
                      
                      <div className="p-2 rounded border border-blue-200 bg-blue-50">
                        <p className="text-xs font-medium text-blue-900 mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Your next step:
                        </p>
                        <p className="text-xs text-blue-800 mb-2">{insight.action_step}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            <Clock className="w-2 h-2 mr-1" />
                            {insight.time_commitment}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className={`text-xs h-6 px-2 ${isTemporarilyAdding ? 'bg-green-600 text-white' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTryThisWeek(insight, index);
                            }}
                            disabled={isDisabled}
                          >
                            {isPermanentlyAdded ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Added!
                              </>
                            ) : isTemporarilyAdding ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Added to Activities!
                              </>
                            ) : (
                              <>
                                <Calendar className="w-3 h-3 mr-1" />
                                Try this week
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {insight.encouragement && (
                        <div className="p-2 bg-purple-50 rounded border-l-2 border-purple-400">
                          <p className="text-xs text-purple-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {insight.encouragement}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                onClick={() => generatePersonalizedInsights(selectedChild)}
                className="text-gray-600 hover:text-gray-800 text-xs h-7"
                disabled={isGenerating}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {usingFallback ? "Try AI Goals" : "Refresh insights"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <BrainCircuit className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Building your personalized insights</h3>
            <p className="text-xs text-gray-600 mb-3">
              Complete a few activities to get AI-powered recommendations tailored to {selectedChild?.name}. You've got this! 💪
            </p>
            <Button
              onClick={() => generatePersonalizedInsights(selectedChild)}
              style={{backgroundColor: 'var(--teachmo-sage)'}}
              size="sm"
              className="h-7 text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate insights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
