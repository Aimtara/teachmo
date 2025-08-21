import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Lock, Star, CheckCircle2, Target, Users, Zap } from 'lucide-react';
import { Achievement, UserAchievement, Activity, ParentingTip } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const iconComponents = {
  Trophy, Lock, Star, CheckCircle2, Target, Users, Zap
};

export default function EnhancedAchievements({ user }) {
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [progress, setProgress] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAchievementsData();
  }, [user.id]);

  const loadAchievementsData = async () => {
    setIsLoading(true);
    try {
      const [achievementsData, userAchievementsData, activities, tips] = await Promise.all([
        Achievement.list(),
        UserAchievement.filter({ user_id: user.id }),
        Activity.filter({ created_by: user.email }),
        ParentingTip.filter({ created_by: user.email })
      ]);

      setAchievements(achievementsData);
      setUserAchievements(userAchievementsData);

      // Calculate progress for achievements in progress
      const progressData = {};
      achievementsData.forEach(achievement => {
        const isEarned = userAchievementsData.some(ua => ua.achievement_id === achievement.id);
        if (!isEarned) {
          progressData[achievement.id] = calculateProgress(achievement, activities, tips, user);
        }
      });
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (achievement, activities, tips, user) => {
    // This would be expanded based on different achievement types
    const completedActivities = activities.filter(a => a.status === 'completed').length;
    const readTips = tips.filter(t => t.is_read).length;
    
    switch (achievement.name) {
      case 'First Steps':
        return { current: Math.min(completedActivities, 1), target: 1, percentage: Math.min(completedActivities * 100, 100) };
      case 'Building Momentum':
        return { current: Math.min(completedActivities, 5), target: 5, percentage: Math.min(completedActivities * 20, 100) };
      case 'Consistency Champion':
        return { current: Math.min(user.login_streak || 0, 7), target: 7, percentage: Math.min((user.login_streak || 0) * 14.3, 100) };
      case 'Knowledge Seeker':
        return { current: Math.min(readTips, 10), target: 10, percentage: Math.min(readTips * 10, 100) };
      default:
        return { current: 0, target: 1, percentage: 0 };
    }
  };

  const getAchievementIcon = (iconName, isEarned, isInProgress) => {
    const IconComponent = iconComponents[iconName] || Trophy;
    if (isEarned) {
      return <IconComponent className="w-12 h-12 text-yellow-500" />;
    } else if (isInProgress) {
      return <IconComponent className="w-12 h-12 text-blue-500" />;
    } else {
      return <Lock className="w-12 h-12 text-gray-400" />;
    }
  };

  const earnedAchievements = achievements.filter(a => 
    userAchievements.some(ua => ua.achievement_id === a.id)
  );

  const inProgressAchievements = achievements.filter(a => 
    !userAchievements.some(ua => ua.achievement_id === a.id) && 
    progress[a.id]?.percentage > 0
  );

  const lockedAchievements = achievements.filter(a => 
    !userAchievements.some(ua => ua.achievement_id === a.id) && 
    (!progress[a.id] || progress[a.id]?.percentage === 0)
  );

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-yellow-700">{earnedAchievements.length}</p>
            <p className="text-sm text-yellow-600">Earned</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{inProgressAchievements.length}</p>
            <p className="text-sm text-blue-600">In Progress</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
          <CardContent className="p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-2xl font-bold text-gray-700">{lockedAchievements.length}</p>
            <p className="text-sm text-gray-600">Locked</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earned">Earned ({earnedAchievements.length})</TabsTrigger>
          <TabsTrigger value="progress">In Progress ({inProgressAchievements.length})</TabsTrigger>
          <TabsTrigger value="locked">Locked ({lockedAchievements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="earned">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {earnedAchievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full"
                >
                  <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 h-full">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="relative">
                        {getAchievementIcon(achievement.icon, true, false)}
                        <CheckCircle2 className="absolute -top-1 -right-1 w-6 h-6 text-green-500 bg-white rounded-full" />
                      </div>
                      <h3 className="font-bold text-lg">{achievement.name}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        +{achievement.points_reward} points
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {inProgressAchievements.map((achievement) => {
                const progressData = progress[achievement.id] || { current: 0, target: 1, percentage: 0 };
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="h-full"
                  >
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 h-full">
                      <CardContent className="p-6 text-center space-y-4">
                        {getAchievementIcon(achievement.icon, false, true)}
                        <h3 className="font-bold text-lg">{achievement.name}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{progressData.current}/{progressData.target}</span>
                          </div>
                          <Progress value={progressData.percentage} className="h-2" />
                          <p className="text-xs text-blue-600">
                            {Math.round(progressData.percentage)}% complete
                          </p>
                        </div>
                        
                        <Badge className="bg-blue-100 text-blue-800">
                          +{achievement.points_reward} points when earned
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="locked">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {lockedAchievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full"
                >
                  <Card className="border-gray-200 bg-gray-50 h-full opacity-75">
                    <CardContent className="p-6 text-center space-y-4">
                      {getAchievementIcon(achievement.icon, false, false)}
                      <h3 className="font-bold text-lg text-gray-700">{achievement.name}</h3>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      <Badge variant="outline" className="text-gray-600">
                        +{achievement.points_reward} points
                      </Badge>
                      {achievement.link_to && (
                        <Button variant="outline" size="sm" className="mt-2">
                          Get Started
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}