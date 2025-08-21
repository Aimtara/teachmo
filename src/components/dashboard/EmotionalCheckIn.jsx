
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Smile, Coffee, Zap, Frown, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, parseISO } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { useEntityCrud } from '@/components/hooks/useApi';
import { User } from '@/api/entities';

const MOOD_OPTIONS = [
  {
    value: 'energized',
    emoji: '⚡',
    label: 'Energized',
    description: 'Ready to take on anything!',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Zap,
  },
  {
    value: 'happy',
    emoji: '😊',
    label: 'Happy',
    description: 'Feeling good and positive',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Smile,
  },
  {
    value: 'calm',
    emoji: '😌',
    label: 'Calm',
    description: 'Peaceful and centered',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Heart,
  },
  {
    value: 'tired',
    emoji: '😴',
    label: 'Tired',
    description: 'Need some rest and recharge',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Coffee,
  },
  {
    value: 'stressed',
    emoji: '😰',
    label: 'Stressed',
    description: 'Feeling overwhelmed today',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Brain,
  },
  {
    value: 'overwhelmed',
    emoji: '😵‍💫', // Changed from 😵 to 😵‍💫 for better visual representation
    label: 'Overwhelmed',
    description: 'Too much on my plate',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Frown,
  },
];

export default function EmotionalCheckIn({ user, onMoodUpdate }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  
  const userApi = useEntityCrud(User);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.last_mood_checkin) {
      const lastCheckIn = parseISO(user.last_mood_checkin);
      const checkedInToday = isToday(lastCheckIn);
      setHasCheckedInToday(checkedInToday);
      if (checkedInToday) {
        setSelectedMood(user.current_mood);
      }
    }
  }, [user]);

  const handleMoodSelect = async (mood) => {
    setSelectedMood(mood);
    
    const moodData = {
      current_mood: mood,
      last_mood_checkin: new Date().toISOString(),
    };
    
    try {
      // Call parent callback immediately for UI responsiveness (optimistic update)
      if (onMoodUpdate) {
        onMoodUpdate(mood);
      }
      
      // Now, try to save to server
      await userApi.update('me', moodData);
      
      toast({
        title: "Mood Updated!",
        description: `Thanks for checking in. We've noted you're feeling ${MOOD_OPTIONS.find(m => m.value === mood)?.label.toLowerCase()}.`,
      });

      setShowThankYou(true);
      setHasCheckedInToday(true);

      setTimeout(() => {
        setShowThankYou(false);
      }, 4000);
    } catch (error) {
      console.error('Failed to update mood:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Your mood could not be saved. Please try again.",
      });
       // Revert optimistic update if API fails
      setSelectedMood(user.current_mood); 
    }
  };

  const getCurrentMoodDisplay = () => {
    if (!selectedMood) return null;
    return MOOD_OPTIONS.find((m) => m.value === selectedMood);
  };

  const currentMood = getCurrentMoodDisplay();

  // Show a summary card if user has already checked in
  if (hasCheckedInToday && !showThankYou) {
    return (
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center">
                {currentMood && <span className="text-xl">{currentMood.emoji}</span>}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  You&apos;re feeling {currentMood?.label.toLowerCase()} today
                </p>
                <p className="text-sm text-gray-600">
                  Checked in at{' '}
                  {user.last_mood_checkin
                    ? format(parseISO(user.last_mood_checkin), 'h:mm a')
                    : 'an unknown time'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentMood && (
                <Badge className={`${currentMood.color} border hidden sm:flex items-center gap-1`}>
                  {currentMood.emoji} {currentMood.label}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setHasCheckedInToday(false)}>
                Check-in again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          How are you feeling today?
        </CardTitle>
        <p className="text-sm text-gray-600">
          Let&apos;s check in so Teachmo can personalize your experience
        </p>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {showThankYou ? (
            <motion.div
              key="thank-you"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-6"
            >
              <motion.div 
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20, delay: 0.1 } }}
              >
                <span className="text-3xl">{getCurrentMoodDisplay()?.emoji}</span>
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Thanks for checking in!</h3>
              <p className="text-gray-600 text-sm">
                I&apos;ll keep this in mind as I personalize your experience today.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="mood-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {MOOD_OPTIONS.map((mood) => (
                <motion.div key={mood.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => handleMoodSelect(mood.value)}
                    className="w-full h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all duration-200 border-2 hover:border-gray-300"
                    disabled={userApi.isLoading('update_me')}
                  >
                    <span className="text-2xl mb-1">{mood.emoji}</span>
                    <span className="font-medium text-sm">{mood.label}</span>
                    <span className="text-xs text-gray-500 text-center leading-tight">
                      {mood.description}
                    </span>
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
