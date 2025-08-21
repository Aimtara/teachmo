import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Coins, TrendingUp, Gift, Award, Zap } from 'lucide-react';
import { PointTransaction, RewardItem, UserRedemption } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const POINT_REWARDS = {
  activity_completed: 50,
  daily_checkin: 10,
  tip_read: 5,
  ai_interaction: 20,
  friend_invited: 100,
  challenge_completed: 200,
  achievement_earned: 150
};

export default function PointsEconomyDashboard({ user, onPointsUpdate }) {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPointsData();
  }, [user.id]);

  const loadPointsData = async () => {
    setIsLoading(true);
    try {
      const [transactions, rewardsData, userRedemptions] = await Promise.all([
        PointTransaction.filter({ user_id: user.id }, '-created_date', 20),
        RewardItem.filter({ is_active: true }),
        UserRedemption.filter({ user_id: user.id })
      ]);
      
      setRecentTransactions(transactions);
      setRewards(rewardsData);
      setRedemptions(userRedemptions);
    } catch (error) {
      console.error('Failed to load points data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemReward = async (reward) => {
    if (user.points < reward.point_cost) {
      toast({
        variant: "destructive",
        title: "Insufficient Points",
        description: `You need ${reward.point_cost - user.points} more points to redeem this reward.`
      });
      return;
    }

    try {
      // Create redemption record
      await UserRedemption.create({
        user_id: user.id,
        reward_id: reward.id,
        points_spent: reward.point_cost
      });

      // Create point transaction
      await PointTransaction.create({
        user_id: user.id,
        points_change: -reward.point_cost,
        reason: 'purchase',
        reference_id: reward.id,
        reference_type: 'purchase',
        balance_after: user.points - reward.point_cost
      });

      toast({
        title: "Reward Redeemed!",
        description: `You've successfully redeemed ${reward.name}!`
      });

      // Update user points and reload data
      onPointsUpdate(user.points - reward.point_cost);
      loadPointsData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Redemption Failed",
        description: "Could not process your redemption. Please try again."
      });
    }
  };

  const getRewardIcon = (category) => {
    const icons = {
      avatar: '👤',
      theme: '🎨',
      feature_unlock: '🔓',
      discount: '💰',
      donation: '❤️',
      badge_upgrade: '⭐'
    };
    return icons[category] || '🎁';
  };

  const pointsToNextGoal = user.point_goal - (user.points % user.point_goal);
  const goalProgress = ((user.points % user.point_goal) / user.point_goal) * 100;

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-600" />
            Your Points Economy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-yellow-700">{user.points?.toLocaleString() || 0}</p>
              <p className="text-sm text-yellow-600">Total Points</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-yellow-700">{pointsToNextGoal}</p>
              <p className="text-xs text-yellow-600">to next goal</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Goal Progress</span>
              <span>{Math.round(goalProgress)}%</span>
            </div>
            <Progress value={goalProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="earn" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earn">Earn Points</TabsTrigger>
          <TabsTrigger value="rewards">Redeem Rewards</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="earn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ways to Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(POINT_REWARDS).map(([action, points]) => (
                  <div key={action} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{action.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-500">
                        {action === 'activity_completed' && 'Complete any family activity'}
                        {action === 'daily_checkin' && 'Check in daily on Teachmo'}
                        {action === 'tip_read' && 'Read a parenting tip'}
                        {action === 'ai_interaction' && 'Chat with AI assistant'}
                        {action === 'friend_invited' && 'Invite a friend to join'}
                        {action === 'challenge_completed' && 'Complete a community challenge'}
                        {action === 'achievement_earned' && 'Unlock any achievement'}
                      </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      +{points} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {rewards.map((reward) => {
                const canAfford = user.points >= reward.point_cost;
                const hasRedeemed = redemptions.some(r => r.reward_id === reward.id);
                
                return (
                  <motion.div
                    key={reward.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className={`${canAfford ? 'border-green-200 hover:shadow-lg' : 'border-gray-200 opacity-75'} transition-all`}>
                      <CardContent className="p-4">
                        <div className="text-center space-y-3">
                          <div className="text-4xl">{getRewardIcon(reward.category)}</div>
                          <h3 className="font-semibold">{reward.name}</h3>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                          <div className="flex items-center justify-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold">{reward.point_cost}</span>
                          </div>
                          <Button
                            onClick={() => handleRedeemReward(reward)}
                            disabled={!canAfford || hasRedeemed}
                            className="w-full"
                            variant={canAfford ? "default" : "outline"}
                          >
                            {hasRedeemed ? 'Redeemed' : canAfford ? 'Redeem' : 'Need More Points'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${transaction.points_change > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-medium capitalize">{transaction.reason.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transaction.points_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.points_change > 0 ? '+' : ''}{transaction.points_change}
                      </p>
                      <p className="text-xs text-gray-500">Balance: {transaction.balance_after}</p>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No transactions yet. Start earning points!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}