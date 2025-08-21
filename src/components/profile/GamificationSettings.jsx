import React, { useState } from 'react';
import { User } from '@/api/entities';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

export default function GamificationSettings({ user }) {
  const [preferences, setPreferences] = useState(user?.gamification_preferences || {
    showLeaderboard: true,
    receivePointNotifications: true,
    showStreak: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (key) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    
    setIsLoading(true);
    try {
      await User.updateMyUserData({ gamification_preferences: newPreferences });
      toast({
        title: "Preferences Updated",
        description: "Your journey and rewards settings have been saved.",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your preferences. Please try again.',
      });
      // Revert state on failure
      setPreferences(user?.gamification_preferences || {
        showLeaderboard: true,
        receivePointNotifications: true,
        showStreak: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="showLeaderboard" className="flex flex-col gap-1">
          <span className="font-medium">Show Me on Leaderboards</span>
          <span className="text-xs text-gray-500">Allow your profile to be ranked in community leaderboards.</span>
        </Label>
        <Switch
          id="showLeaderboard"
          checked={preferences.showLeaderboard}
          onCheckedChange={() => handleToggle('showLeaderboard')}
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="receivePointNotifications" className="flex flex-col gap-1">
          <span className="font-medium">Point Notifications</span>
          <span className="text-xs text-gray-500">Receive notifications when you earn points.</span>
        </Label>
        <Switch
          id="receivePointNotifications"
          checked={preferences.receivePointNotifications}
          onCheckedChange={() => handleToggle('receivePointNotifications')}
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showStreak" className="flex flex-col gap-1">
          <span className="font-medium">Display Login Streak</span>
          <span className="text-xs text-gray-500">Show your daily login streak on your profile.</span>
        </Label>
        <Switch
          id="showStreak"
          checked={preferences.showStreak}
          onCheckedChange={() => handleToggle('showStreak')}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}