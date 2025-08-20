import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Crown, Medal, Star, Users, School, Globe } from 'lucide-react';
import { Leaderboard, User } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';

export default function Leaderboards({ currentUser }) {
  const [leaderboards, setLeaderboards] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');
  const [selectedScope, setSelectedScope] = useState('global');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, [selectedPeriod, selectedScope]);

  const loadLeaderboards = async () => {
    setIsLoading(true);
    try {
      const filters = { period: selectedPeriod };
      if (selectedScope !== 'global') {
        filters.scope_id = currentUser.school_id || currentUser.district_id;
      }

      const leaderboardData = await Leaderboard.filter(filters, '-score', 100);
      
      // Group by leaderboard type
      const grouped = leaderboardData.reduce((acc, item) => {
        if (!acc[item.leaderboard_type]) {
          acc[item.leaderboard_type] = [];
        }
        acc[item.leaderboard_type].push(item);
        return acc;
      }, {});

      setLeaderboards(grouped);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getScoreLabel = (type) => {
    const labels = {
      global_points: 'Points',
      school_points: 'Points',
      pod_points: 'Points',
      weekly_activities: 'Activities',
      login_streak: 'Days'
    };
    return labels[type] || 'Score';
  };

  const LeaderboardTable = ({ data, type }) => (
    <div className="space-y-3">
      <AnimatePresence>
        {data.slice(0, 10).map((entry, index) => {
          const isCurrentUser = entry.user_id === currentUser.id;
          
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {entry.user_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className={`font-medium ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                      {isCurrentUser ? 'You' : (entry.user_name || 'Anonymous')}
                      {isCurrentUser && <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">You</Badge>}
                    </p>
                    <p className="text-sm text-gray-500">Rank #{entry.rank}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                  {entry.score.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">{getScoreLabel(type)}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="weekly">This Week</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Global
                </div>
              </SelectItem>
              {currentUser.school_id && (
                <SelectItem value="school">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    School
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-sm">
          Updated every hour
        </Badge>
      </div>

      <Tabs defaultValue="points" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Points Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboards.global_points || leaderboards.school_points ? (
                <LeaderboardTable 
                  data={leaderboards.global_points || leaderboards.school_points} 
                  type="global_points" 
                />
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No points data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-500" />
                Activities Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboards.weekly_activities ? (
                <LeaderboardTable 
                  data={leaderboards.weekly_activities} 
                  type="weekly_activities" 
                />
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No activity data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-orange-500" />
                Login Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboards.login_streak ? (
                <LeaderboardTable 
                  data={leaderboards.login_streak} 
                  type="login_streak" 
                />
              ) : (
                <div className="text-center py-8">
                  <Medal className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No streak data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Community Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboards.pod_points ? (
                <LeaderboardTable 
                  data={leaderboards.pod_points} 
                  type="pod_points" 
                />
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Join a community pod to see engagement rankings!</p>
                  <Button className="mt-4" variant="outline">
                    Explore Communities
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}