import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, BookOpen, MessageSquareHeart, Zap, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const StreakItem = ({ icon: Icon, label, current, target, color, delay = 0 }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {isComplete && (
            <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0">
              ✓ Done!
            </Badge>
          )}
        </div>
        <span className="text-sm text-gray-600">
          {current} / {target}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2" 
        style={{
          '--progress-background': isComplete ? '#10b981' : undefined
        }}
      />
    </motion.div>
  );
};

export default function WeeklyStreak({ stats, user }) {
  const streakGoals = [
    {
      icon: Target,
      label: "Activities",
      current: stats.activitiesCompleted,
      target: 5,
      color: "text-blue-600"
    },
    {
      icon: BookOpen,
      label: "Tips Read",
      current: stats.tipProgress,
      target: 3,
      color: "text-purple-600"
    },
    {
      icon: MessageSquareHeart,
      label: "Journal Entries",
      current: stats.journalEntries,
      target: 2,
      color: "text-pink-600"
    }
  ];

  const totalCompleted = streakGoals.filter(goal => goal.current >= goal.target).length;
  const overallProgress = Math.round((totalCompleted / streakGoals.length) * 100);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Flame className="w-6 h-6 text-orange-500" />
            Weekly Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <Zap className="w-3 h-3 mr-1" />
              {stats.streak} Day Streak
            </Badge>
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              {overallProgress}% Complete
            </Badge>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Keep up your parenting momentum! You're {totalCompleted} out of {streakGoals.length} weekly goals complete.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {streakGoals.map((goal, index) => (
          <StreakItem
            key={goal.label}
            icon={goal.icon}
            label={goal.label}
            current={goal.current}
            target={goal.target}
            color={goal.color}
            delay={index * 0.1}
          />
        ))}
        
        {/* Motivational message */}
        <div className="mt-6 p-4 bg-white/80 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900">This Week's Focus</span>
          </div>
          <p className="text-sm text-orange-800">
            {overallProgress === 100 
              ? "🎉 Amazing! You've completed all weekly goals. You're setting a fantastic example!"
              : overallProgress >= 66
              ? "💪 You're doing great! Just a little more to complete all weekly goals."
              : overallProgress >= 33
              ? "🌟 Good progress! Keep building those positive parenting habits."
              : "🚀 Ready to start strong? Every small step counts toward being the parent you want to be."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}