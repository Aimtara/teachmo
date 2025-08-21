
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, Clock, Trophy, Flame, Calendar } from 'lucide-react';
import { Challenge, ChallengeParticipation, PodChallenge } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function ChallengeHub({ user }) {
  const [challenges, setChallenges] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [podChallenges, setPodChallenges] = useState([]);
  const [allChallengesForLookup, setAllChallengesForLookup] = useState([]); // New state for combined lookup
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadChallengesData();
  }, [user.id]);

  const loadChallengesData = async () => {
    setIsLoading(true);
    try {
      const [challengesData, participationsData, podChallengesData] = await Promise.all([
        Challenge.filter({ is_active: true }),
        ChallengeParticipation.filter({ user_id: user.id }),
        PodChallenge.filter({ is_active: true })
      ]);

      setChallenges(challengesData);
      setParticipations(participationsData);
      setPodChallenges(podChallengesData);
      
      // Create a combined, normalized list of all challenges for easy lookup
      // This prevents errors if a participation is for a type of challenge not in the main `challenges` list
      const normalizedPodChallenges = podChallengesData.map(pc => ({
        ...pc,
        challenge_type: 'community', // Add a consistent type for getChallengeIcon
        rewards: { points: pc.reward_points }, // Normalize the rewards structure
        isPodChallenge: true, // Marker to indicate it originated from PodChallenge
      }));
      setAllChallengesForLookup([...challengesData, ...normalizedPodChallenges]);

    } catch (error) {
      console.error('Failed to load challenges:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load challenge data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChallenge = async (challenge) => {
    try {
      await ChallengeParticipation.create({
        challenge_id: challenge.id,
        user_id: user.id
      });

      toast({
        title: "Challenge Joined!",
        description: `You've joined "${challenge.title}". Good luck!`
      });

      loadChallengesData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Join Failed",
        description: "Could not join challenge. Please try again."
      });
    }
  };

  const getChallengeIcon = (type) => {
    const icons = {
      individual: Target,
      family: Users,
      community: Flame, // Changed to Flame as per original code for community challenges
      school: Trophy
    };
    return icons[type] || Target;
  };

  const getProgressPercentage = (participation, challenge) => {
    if (!participation || !challenge.goal_target) return 0;
    return Math.min((participation.current_progress / challenge.goal_target) * 100, 100);
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0; // Guard against undefined or null dates
    return Math.max(0, differenceInDays(parseISO(endDate), new Date()));
  };

  const myParticipations = participations.filter(p => !p.completed);
  const availableChallenges = challenges.filter(c => 
    !participations.some(p => p.challenge_id === c.id)
  );

  return (
    <div className="space-y-6">
      {/* Challenge Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-xl font-bold text-blue-700">{myParticipations.length}</p>
            <p className="text-sm text-blue-600">Active</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-xl font-bold text-green-700">{participations.filter(p => p.completed).length}</p>
            <p className="text-sm text-green-600">Completed</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <p className="text-xl font-bold text-orange-700">{availableChallenges.length}</p>
            <p className="text-sm text-orange-600">Available</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-xl font-bold text-purple-700">{podChallenges.length}</p>
            <p className="text-sm text-purple-600">Community</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">My Challenges ({myParticipations.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableChallenges.length})</TabsTrigger>
          <TabsTrigger value="community">Community ({podChallenges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-4">
            <AnimatePresence>
              {myParticipations.map((participation) => {
                // Find the challenge from the combined & normalized list
                const challenge = allChallengesForLookup.find(c => c.id === participation.challenge_id);
                
                // If challenge is not found (e.g., it's no longer active or a transient data issue), skip rendering
                if (!challenge) return null;
                
                const IconComponent = getChallengeIcon(challenge.challenge_type);
                const progressPercentage = getProgressPercentage(participation, challenge);
                const daysRemaining = getDaysRemaining(challenge.end_date);
                
                return (
                  <motion.div
                    key={participation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-blue-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <IconComponent className="w-8 h-8 text-blue-600" />
                            <div>
                              <h3 className="font-bold text-lg">{challenge.title}</h3>
                              <p className="text-gray-600">{challenge.description}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysRemaining} days left
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{participation.current_progress}/{challenge.goal_target} {challenge.goal_type.replace('_', ' ')}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-3" />
                          <p className="text-sm text-blue-600">
                            {Math.round(progressPercentage)}% complete
                          </p>
                        </div>
                        
                        {challenge.rewards && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800">Rewards:</p>
                            <p className="text-sm text-yellow-700">
                              {challenge.rewards.points} points
                              {challenge.rewards.badges && ` + ${challenge.rewards.badges.join(', ')} badge(s)`}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {myParticipations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Challenges</h3>
                  <p className="text-gray-500 mb-4">Join a challenge to start earning rewards and tracking your progress!</p>
                  <Button onClick={() => setTab("available")}>
                    Browse Available Challenges
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {availableChallenges.map((challenge) => {
                const IconComponent = getChallengeIcon(challenge.challenge_type);
                const daysRemaining = getDaysRemaining(challenge.end_date);
                
                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-6 h-6 text-indigo-600" />
                            <Badge variant="outline" className="capitalize">
                              {challenge.challenge_type}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {daysRemaining}d
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-gray-600">{challenge.description}</p>
                        
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-800">Goal:</p>
                          <p className="text-sm text-gray-600">
                            {challenge.goal_target} {challenge.goal_type.replace('_', ' ')}
                          </p>
                        </div>
                        
                        {challenge.rewards && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800">Rewards:</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-yellow-100 text-yellow-800">
                                +{challenge.rewards.points} points
                              </Badge>
                              {challenge.rewards.badges && challenge.rewards.badges.map(badge => (
                                <Badge key={badge} variant="outline">
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={() => handleJoinChallenge(challenge)}
                          className="w-full"
                        >
                          Join Challenge
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="community">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {podChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                        <Badge className="bg-purple-100 text-purple-800">Community</Badge>
                      </div>
                      <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">{challenge.description}</p>
                      
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-purple-800">Community Goal:</p>
                        <p className="text-sm text-purple-600">
                          {challenge.goal_target} {challenge.goal_type.replace('_', ' ')} together
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span>Ends: {format(parseISO(challenge.end_date), 'MMM d, yyyy')}</span>
                        <span className="text-purple-600">+{challenge.reward_points} points</span>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        View Community Progress
                      </Button>
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
