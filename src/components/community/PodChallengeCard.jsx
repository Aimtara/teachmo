import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock, Target } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Post, Kudo, Activity, PodChallenge, PodMember } from '@/api/entities'; // Assuming Activity is trackable

export default function PodChallengeCard({ challenge }) {
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        let count = 0;
        const members = await PodMember.filter({ pod_id: challenge.pod_id });
        const memberIds = members.map(m => m.user_id);
        
        // This is a simplified client-side progress fetch. 
        // In a real-world scenario, a dedicated backend function would be more efficient.
        switch(challenge.goal_type) {
          case 'posts':
            // This is an approximation. A proper implementation would filter by date on the backend.
            const posts = await Post.filter({ pod_id: challenge.pod_id });
            count = posts.length;
            break;
          case 'kudos':
             const podPosts = await Post.filter({ pod_id: challenge.pod_id });
             const postIds = podPosts.map(p => p.id);
             if(postIds.length > 0) {
                 // Note: This could be inefficient for large pods. Backend aggregation is better.
                 const kudos = await Kudo.filter({ post_id: { '$in': postIds }});
                 count = kudos.length;
             }
            break;
          case 'activities':
            // This assumes activities can be linked to a pod or its members, which isn't in the current schema.
            // This part is a placeholder for future logic.
            count = 0; // Placeholder
            break;
          default:
            count = 0;
        }

        setCurrentCount(count);
        setProgress(challenge.goal_target > 0 ? (count / challenge.goal_target) * 100 : 0);
      } catch (error) {
        console.error("Failed to fetch challenge progress:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, [challenge]);

  const isCompleted = currentCount >= challenge.goal_target;
  const isExpired = isPast(new Date(challenge.end_date));

  return (
    <Card className={`border-l-4 ${isCompleted ? 'border-green-500' : isExpired ? 'border-red-500' : 'border-blue-500'}`}>
      <CardHeader>
        <CardTitle className="text-md font-bold">{challenge.title}</CardTitle>
        <CardDescription>{challenge.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goal: {currentCount} / {challenge.goal_target} {challenge.goal_type}
            </span>
            <span className="font-semibold text-yellow-600 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {challenge.reward_points} pts
            </span>
          </div>
          <Progress value={progress} />
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isExpired || isCompleted
                ? (isCompleted ? `Completed!` : 'Ended')
                : `Ends in ${formatDistanceToNow(new Date(challenge.end_date))}`
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}