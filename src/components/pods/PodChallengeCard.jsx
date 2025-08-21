import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';

export default function PodChallengeCard({ challenge }) {
  // Mock progress for now. In a real app, this would be calculated.
  const progress = Math.floor(Math.random() * 80) + 10; 

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader className="p-4">
        <CardTitle className="text-base font-bold text-yellow-900">{challenge.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-yellow-800 mb-3">{challenge.description}</p>
        <div className="mb-3">
            <div className="flex justify-between text-xs text-yellow-800 font-medium mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 [&>div]:bg-yellow-500" />
            <p className="text-xs text-center text-yellow-700 mt-1">Goal: {challenge.goal_target} {challenge.goal_type}</p>
        </div>
        <div className="text-xs text-yellow-700">
          Ends on: {format(new Date(challenge.end_date), 'MMM d, yyyy')}
        </div>
      </CardContent>
    </Card>
  );
}