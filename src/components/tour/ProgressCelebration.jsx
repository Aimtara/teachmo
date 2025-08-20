import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// Achievement definitions
const ACHIEVEMENTS = {
  first_activity: {
    title: 'First Steps!',
    description: 'You completed your first activity',
    icon: CheckCircle2,
    color: 'from-green-400 to-green-600',
    points: 100
  },
  activity_streak_3: {
    title: 'Building Momentum',
    description: '3 activities completed this week',
    icon: Star,
    color: 'from-yellow-400 to-orange-500',
    points: 150
  },
  ai_coach_expert: {
    title: 'AI Coach Expert',
    description: 'Had 10 conversations with your AI coach',
    icon: Sparkles,
    color: 'from-purple-400 to-pink-500',
    points: 200
  },
  family_organizer: {
    title: 'Family Organizer',
    description: 'Scheduled 5 activities in your calendar',
    icon: Trophy,
    color: 'from-blue-400 to-cyan-500',
    points: 175
  },
  community_member: {
    title: 'Community Member',
    description: 'Joined your first community discussion',
    icon: Gift,
    color: 'from-pink-400 to-rose-500',
    points: 100
  }
};

export default function ProgressCelebration({ achievement, onClose, show = false }) {
  useEffect(() => {
    if (show && achievement) {
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C']
      });
    }
  }, [show, achievement]);

  if (!show || !achievement) return null;

  const achievementData = ACHIEVEMENTS[achievement.type] || achievement;
  const IconComponent = achievementData.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-sm mx-4"
        >
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className={`bg-gradient-to-r ${achievementData.color} p-6 text-center text-white`}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', damping: 10 }}
                className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                <IconComponent className="w-10 h-10" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold mb-2">🎉 Achievement Unlocked!</h2>
                <h3 className="text-xl font-semibold mb-2">{achievementData.title}</h3>
                <p className="text-white/90">{achievementData.description}</p>
              </motion.div>
            </div>
            
            <CardContent className="p-6 text-center bg-white">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
                    +{achievementData.points} Points Earned
                  </Badge>
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                
                <div className="text-sm text-gray-600">
                  Keep up the great work! You're building amazing habits for your family.
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg transition-shadow"
                >
                  Continue Journey
                </motion.button>
              </motion.div>
            </CardContent>
          </Card>

          {/* Floating particles animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                }}
                animate={{
                  y: [-10, -30, -10],
                  opacity: [1, 0.5, 1],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}