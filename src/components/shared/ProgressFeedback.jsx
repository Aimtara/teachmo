import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Target, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export const MicroFeedback = ({ type = 'success', message, duration = 3000, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const config = {
    success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    progress: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    achievement: { icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    milestone: { icon: Target, color: 'text-orange-600', bg: 'bg-orange-50' }
  };

  const { icon: Icon, color, bg } = config[type];

  if (type === 'achievement') {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 }
    });
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className={`${bg} border shadow-lg max-w-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium text-gray-900">
                  {message}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ProgressStreak = ({ streak, goal = 7, type = 'activities' }) => {
  const progress = (streak / goal) * 100;
  
  return (
    <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {streak} day streak! 🔥
            </p>
            <p className="text-xs text-gray-600">
              Keep going to reach {goal} days
            </p>
          </div>
        </div>
        
        <div className="w-full bg-orange-100 rounded-full h-2 mb-2">
          <motion.div
            className="bg-orange-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-600">
          <span>{streak} / {goal} days</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const SmartProgressIndicator = ({ 
  current, 
  target, 
  type = 'activities',
  showEncouragement = true 
}) => {
  const progress = (current / target) * 100;
  const isComplete = current >= target;
  
  const encouragementMessages = {
    activities: [
      "You're doing great! Keep exploring new activities.",
      "Every activity is a step towards growth!",
      "Your consistency is paying off!",
      "Amazing progress - you're building great habits!"
    ],
    tips: [
      "Knowledge is power! Keep learning.",
      "Every tip makes you a better parent.",
      "You're investing in your family's future!",
      "Wisdom comes from continuous learning."
    ]
  };

  const getRandomMessage = () => {
    const messages = encouragementMessages[type] || encouragementMessages.activities;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <Card className={`${isComplete ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-900">
              {current} / {target} {type}
            </p>
            {isComplete && (
              <Badge className="bg-green-100 text-green-800 mt-1">
                Goal Achieved! 🎉
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(progress)}%
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <motion.div
            className={`${isComplete ? 'bg-green-500' : 'bg-blue-500'} h-3 rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
        
        {showEncouragement && (
          <p className="text-sm text-gray-600 italic">
            {isComplete ? "🎉 Congratulations!" : getRandomMessage()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ProgressCelebration = ({ achievement, onClose }) => {
  useEffect(() => {
    if (achievement) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [achievement]);

  if (!achievement) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.5, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.5, y: 100 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Achievement Unlocked! 🎉
        </h2>
        
        <p className="text-gray-600 mb-6">
          {achievement.description || "You've reached a new milestone!"}
        </p>
        
        <Button onClick={onClose} className="w-full">
          Continue
        </Button>
      </motion.div>
    </motion.div>
  );
};