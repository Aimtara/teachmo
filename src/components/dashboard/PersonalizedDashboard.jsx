import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { useDashboardPersonalization } from '@/components/shared/SmartDefaults';
import { motion } from 'framer-motion';

import TodaysFocus from './TodaysFocus';
import QuickActionBar from './QuickActionBar';
import EmotionalCheckIn from './EmotionalCheckIn';
import PersonalizedInsights from './PersonalizedInsights';
import OffersCarousel from '../offers/OffersCarousel';

export default function PersonalizedDashboard({ 
  user, 
  children, 
  activities, 
  schoolAssignments, 
  weeklyStats,
  onMoodUpdate 
}) {
  const { layout, isSimpleMode, toggleSimpleMode } = useDashboardPersonalization();

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isSimpleMode ? "default" : "outline"}>
            {isSimpleMode ? 'Simple View' : 'Full View'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSimpleMode}
            className="flex items-center gap-2"
          >
            {isSimpleMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isSimpleMode ? 'Show More' : 'Simplify'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Today's Focus - Always visible as the hero */}
          <motion.div
            layout
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <TodaysFocus
              user={user}
              activities={activities}
              schoolAssignments={schoolAssignments}
              messages={[]}
              onActivityComplete={(activity) => {
                console.log('Complete activity:', activity);
              }}
            />
          </motion.div>

          {/* Quick Actions Bar - Always visible */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <QuickActionBar user={user} children={children} />
          </motion.div>

          {/* Offers Carousel - Only in full mode */}
          {!isSimpleMode && layout.showOffers && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <OffersCarousel userLocation={user?.location} children={children} />
            </motion.div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* AI Insights - Always visible */}
          <motion.div
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PersonalizedInsights 
              user={user} 
              children={children} 
              activities={activities} 
            />
          </motion.div>

          {/* Emotional Check-in - Only in full mode */}
          {!isSimpleMode && layout.showEmotionalCheckin && (
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <EmotionalCheckIn user={user} onMoodUpdate={onMoodUpdate} />
            </motion.div>
          )}

          {/* Weekly Progress - Only in full mode */}
          {!isSimpleMode && layout.showWeeklyProgress && (
            <motion.div
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    📊 This Week's Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Activities Completed</span>
                      <span className="font-bold text-green-600">
                        {weeklyStats.activitiesCompleted} / 5
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((weeklyStats.activitiesCompleted / 5) * 100, 100)}%` }}
                      />
                    </div>
                    {weeklyStats.activitiesCompleted >= 5 ? (
                      <p className="text-sm text-green-600 font-medium">🎉 Goal achieved!</p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        {5 - weeklyStats.activitiesCompleted} more to reach your goal
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Simple Mode Prompt */}
      {isSimpleMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-4 bg-blue-50 rounded-lg"
        >
          <p className="text-sm text-blue-700">
            You're in Simple View. <button onClick={toggleSimpleMode} className="underline font-medium">Show more features</button> when you're ready to explore!
          </p>
        </motion.div>
      )}
    </div>
  );
}