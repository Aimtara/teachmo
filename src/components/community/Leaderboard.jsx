import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Crown, Trophy, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const LeaderboardSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const topUsers = await User.list('-points', 50); // Fetch top 50 users by points
        setUsers(topUsers);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        setError("Could not load the leaderboard. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  const getRankColor = (rank) => {
    if (rank === 0) return 'bg-yellow-400 text-yellow-900';
    if (rank === 1) return 'bg-gray-300 text-gray-800';
    if (rank === 2) return 'bg-yellow-600 text-white'; // Bronze
    return 'bg-gray-200 text-gray-700';
  };

  const RankIcon = ({ rank }) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-600" />;
    if (rank === 1) return <Trophy className="w-5 h-5 text-gray-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-yellow-700" />;
    return null;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Trophy className="w-6 h-6 text-blue-600" />
          Community Leaderboard
        </CardTitle>
        <CardDescription>
          Top contributors based on community points.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                index < 3 ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white'
              }`}
            >
              <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${getRankColor(index)}`}>
                {index + 1}
              </div>
              <Avatar className="h-12 w-12 border-2 border-white">
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
                <AvatarFallback>{(user.full_name || 'U')[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{user.full_name}</p>
                <p className="text-sm text-gray-500">{user.points || 0} points</p>
              </div>
              <RankIcon rank={index} />
            </motion.div>
          ))}
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users on the leaderboard yet. Start participating!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}