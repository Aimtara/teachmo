import React, { useState } from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Circle, Repeat, Loader2 } from 'lucide-react';

const TOUR_CHECKLIST = [
  { id: 'dashboard', title: 'Explore your Dashboard' },
  { id: 'mood_checkin', title: 'Complete your first Mood Check-in' },
  { id: 'discover', title: 'Discover a new Activity' },
  { id: 'ai_coach', title: 'Ask the AI Coach a question' },
  { id: 'calendar', title: 'Schedule an event in the Calendar' }
];

export default function TourManagement({ user: initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const completedSteps = user?.tutorial_progress?.checklistProgress || [];

  const handleResetTour = async () => {
    setIsResetting(true);
    try {
      const newProgress = {
        ...(user.tutorial_progress || {}),
        isDismissed: false,
        hasSeenTutorial: false,
      };
      await User.updateMyUserData({ tutorial_progress: newProgress });
      setUser(prevUser => ({
        ...prevUser,
        tutorial_progress: newProgress
      }));
      toast({
        title: 'Tour has been reset!',
        description: 'The guided tour will appear the next time you visit the dashboard.',
      });
    } catch (error) {
      console.error("Failed to reset tour:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reset the tour. Please try again.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Feature Checklist</h4>
        <ul className="space-y-2">
          {TOUR_CHECKLIST.map(item => {
            const isCompleted = completedSteps.includes(item.id);
            return (
              <li key={item.id} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                  {item.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="border-t pt-6">
        <p className="text-sm text-gray-600 mb-3">
          Need a refresher? You can restart the interactive guided tour at any time.
        </p>
        <Button
          variant="outline"
          onClick={handleResetTour}
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Repeat className="w-4 h-4 mr-2" />
          )}
          Restart Guided Tour
        </Button>
      </div>
    </div>
  );
}