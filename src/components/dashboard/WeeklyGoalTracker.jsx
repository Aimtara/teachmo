
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, Plus, TrendingUp, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { InvokeLLM } from "@/api/integrations";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { generateWarmOpener, FALLBACK_RESPONSES } from "../shared/TeachmoTone";

// Fallback weekly goals when AI is unavailable
const FALLBACK_WEEKLY_GOALS = [
  {
    title: "Creative Expression Time",
    description: "Encourage Bob's creative side with hands-on activities that let imagination flow freely.",
    encouragement: "Bob's creative-analytical combo is such a superpower! 🎨",
    target_activities: 2,
    category: "creative",
    suggested_activities: ["Art journaling", "Building with everyday materials", "Creative storytelling"],
    current_progress: 0,
    progress_percentage: 0
  },
  {
    title: "Problem-Solving Adventures",
    description: "Challenge Bob's analytical thinking with fun puzzles and logical challenges.",
    encouragement: "That analytical mind is going to tackle some amazing challenges! 🧩",
    target_activities: 2,
    category: "educational",
    suggested_activities: ["Logic puzzles", "Strategy games", "Science experiments"],
    current_progress: 0,
    progress_percentage: 0
  },
  {
    title: "Share Your Talents",
    description: "Give Bob opportunities to share his creative and analytical skills with others.",
    encouragement: "You've got this! Bob's unique perspective is such a gift! ✨",
    target_activities: 1,
    category: "social",
    suggested_activities: ["Teach a skill to family", "Create something for others", "Help solve a family challenge"],
    current_progress: 0,
    progress_percentage: 0
  }
];

export default function WeeklyGoalTracker({ child, activities }) {
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (child) {
      generateWeeklyGoals();
    }
  }, [child, activities]);

  const generateWeeklyGoals = async () => {
    if (!child || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setUsingFallback(false);

    try {
      const thisWeekStart = startOfWeek(new Date());
      const thisWeekEnd = endOfWeek(new Date());

      const thisWeekActivities = activities.filter(activity => {
        if (!activity.completion_date) return false;
        const completionDate = new Date(activity.completion_date);
        return isWithinInterval(completionDate, { start: thisWeekStart, end: thisWeekEnd });
      });

      const warmOpener = generateWarmOpener('general');

      const response = await InvokeLLM({
        prompt: `${warmOpener} You're Teachmo, creating encouraging weekly goals that celebrate progress and build confidence.

        TONE GUIDELINES:
        - Be warm and encouraging
        - Focus on achievable wins
        - Celebrate current progress
        - Use empowering language like "You've got this!"

        CHILD PROFILE:
        Name: ${child.name}
        Age: ${child.age}
        Interests: ${child.interests?.join(', ') || 'Not specified'}
        Development Goals: ${child.development_goals?.join(', ') || 'General development'}
        Personality: ${child.personality_traits?.join(', ') || 'Balanced'}
        Current Challenges: ${child.challenges?.join(', ') || 'None'}

        WEEKLY ACTIVITY DATA:
        Activities completed this week: ${thisWeekActivities.map(a => `${a.title} (${a.category})`).join('; ') || 'None yet'}
        Total activities this week: ${thisWeekActivities.length}

        Create 3 encouraging weekly goals that:
        1. Build on this week's awesome progress
        2. Are specific and achievable
        3. Support ${child.name}'s development areas
        4. Feel exciting, not overwhelming
        5. Can be achieved with 2-3 fun activities

        Remember: You're helping parents feel confident and successful! 💪`,
        response_json_schema: {
          type: "object",
          properties: {
            goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  encouragement: { type: "string" },
                  target_activities: { type: "integer" },
                  category: { type: "string" },
                  suggested_activities: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        }
      });

      const goalsWithProgress = response.goals?.map(goal => {
        const relevantActivities = thisWeekActivities.filter(activity =>
          activity.category === goal.category ||
          goal.suggested_activities.some(suggestion =>
            activity.title.toLowerCase().includes(suggestion.toLowerCase().split(' ')[0])
          )
        );

        return {
          ...goal,
          current_progress: relevantActivities.length,
          progress_percentage: Math.min((relevantActivities.length / goal.target_activities) * 100, 100)
        };
      }) || [];

      setWeeklyGoals(goalsWithProgress);
    } catch (error) {
      console.error("Error generating weekly goals:", error);
      
      // For recoverable errors like rate limits or network issues, seamlessly switch to fallbacks
      // without showing a big error message.
      if (error.message?.includes('RateLimitError') || error.message?.includes('quota') || error.message?.includes('Network')) {
        useFallbackGoals();
      } else {
        // For other unexpected errors, show a friendly error message and provide fallbacks.
        const fallbackResponse = FALLBACK_RESPONSES.technical_error[Math.floor(Math.random() * FALLBACK_RESPONSES.technical_error.length)];
        setError(fallbackResponse);
        useFallbackGoals();
      }
    }
    setIsGenerating(false);
  };

  const useFallbackGoals = () => {
    setUsingFallback(true);
    // Customize fallback goals for the specific child
    const customizedGoals = FALLBACK_WEEKLY_GOALS.map(goal => ({
      ...goal,
      description: goal.description.replace('Bob', child.name),
      encouragement: goal.encouragement.replace('Bob', child.name)
    }));
    setWeeklyGoals(customizedGoals);
  };

  const getCategoryColor = (category) => {
    const colors = {
      creative: 'bg-purple-100 text-purple-800',
      educational: 'bg-blue-100 text-blue-800',
      physical: 'bg-green-100 text-green-800',
      social: 'bg-pink-100 text-pink-800',
      emotional: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (!child) return null;

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
          Weekly Goals for {child.name}
          {usingFallback && (
            <Badge variant="outline" className="ml-2 text-xs">
              <Coffee className="w-3 h-3 mr-1" />
              Teachmo's Picks
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {usingFallback 
            ? "Curated goals while our AI takes a quick break"
            : "Personalized development targets based on recent progress"
          }
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400 mb-6">
            <p className="text-blue-800">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={generateWeeklyGoals}
              className="mt-2"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Try AI Goals Again"}
            </Button>
          </div>
        )}

        {isGenerating ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{borderColor: 'var(--teachmo-sage)'}}></div>
            <p className="text-gray-600">Creating personalized goals...</p>
          </div>
        ) : weeklyGoals.length > 0 ? (
          <div className="space-y-4">
            {weeklyGoals.map((goal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl border border-gray-100"
                style={{backgroundColor: 'var(--teachmo-warm-white)'}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{goal.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                    {goal.encouragement && (
                      <p className="text-sm font-medium text-purple-700 bg-purple-50 p-2 rounded">
                        💪 {goal.encouragement}
                      </p>
                    )}
                  </div>
                  <Badge className={getCategoryColor(goal.category)}>
                    {goal.category}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-600">
                        {goal.current_progress} / {goal.target_activities} activities
                      </span>
                    </div>
                    <Progress
                      value={goal.progress_percentage}
                      className="h-2"
                    />
                  </div>

                  {goal.suggested_activities && goal.suggested_activities.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Try these activities:</p>
                      <div className="flex flex-wrap gap-1">
                        {goal.suggested_activities.slice(0, 3).map((activity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {goal.progress_percentage >= 100 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Goal achieved! You're amazing! 🎉</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={generateWeeklyGoals}
                className="text-gray-600 hover:text-gray-800"
                disabled={isGenerating}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {usingFallback ? "Try AI Goals" : "Refresh goals"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Weekly goals coming soon</h3>
            <p className="text-gray-600 mb-4">
              Complete a few activities to get personalized weekly targets. You've got this! 💪
            </p>
            <Button
              onClick={generateWeeklyGoals}
              style={{backgroundColor: 'var(--teachmo-sage)'}}
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create goals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
