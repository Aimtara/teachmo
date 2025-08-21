import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star, Flame } from 'lucide-react';

export default function PointsAndStreakModal({ user, isOpen, onClose }) {
  if (!isOpen || !user) return null;

  const pointEarningMethods = [
    { action: "Completing an activity", points: "+10" },
    { action: "Rating a completed activity", points: "+5" },
    { action: "Earning an achievement", points: "Varies" },
    { action: "Daily login", points: "+1" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3" style={{color: 'var(--teachmo-sage)'}}>
            <Star className="w-6 h-6" /> Your Progress
          </DialogTitle>
          <DialogDescription>
            Here's a breakdown of your points and login streak. Keep up the great work!
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-around p-4 rounded-xl" style={{backgroundColor: 'var(--teachmo-cream)'}}>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="text-3xl font-bold text-yellow-600 flex items-center gap-2">
                <Star className="w-6 h-6" /> {user.points || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Login Streak</p>
              <p className="text-3xl font-bold text-orange-600 flex items-center gap-2">
                <Flame className="w-6 h-6" /> {user.login_streak || 0} Days
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">How to Earn Points</h4>
            <ul className="space-y-2">
              {pointEarningMethods.map((method, index) => (
                <li key={index} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{method.action}</span>
                  <span className="font-bold" style={{color: 'var(--teachmo-sage)'}}>{method.points}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
             <h4 className="font-semibold text-gray-800 mb-2">About Your Login Streak</h4>
             <p className="text-sm text-gray-600">
                Log in every day to keep your streak going and earn bonus points. If you miss a day, your streak will reset to 1.
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}