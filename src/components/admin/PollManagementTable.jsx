import React, { useState } from 'react';
import { Poll, PollVote } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { BarChart3, Users, Calendar, Archive } from 'lucide-react';
import { format, isAfter } from 'date-fns';

export default function PollManagementTable({ polls, onPollUpdate }) {
  const [isLoading, setIsLoading] = useState({});
  const { toast } = useToast();

  const handleClosePoll = async (pollId) => {
    setIsLoading(prev => ({ ...prev, [pollId]: true }));
    try {
      await Poll.update(pollId, { status: 'closed' });
      onPollUpdate();
      toast({ title: 'Poll Closed', description: 'Poll has been closed and results are final.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to close poll.' });
    } finally {
      setIsLoading(prev => ({ ...prev, [pollId]: false }));
    }
  };

  const getStatusBadge = (poll) => {
    const now = new Date();
    const closesAt = new Date(poll.closes_at);
    
    if (poll.status === 'closed' || isAfter(now, closesAt)) {
      return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const calculateResults = (poll) => {
    const totalVotes = poll.total_votes || 0;
    return poll.options.map(option => ({
      ...option,
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
    }));
  };

  return (
    <div className="space-y-4">
      {polls.map(poll => {
        const results = calculateResults(poll);
        const isActive = poll.status === 'active' && isAfter(new Date(poll.closes_at), new Date());
        
        return (
          <Card key={poll.id} className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {poll.total_votes} votes
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Closes: {format(new Date(poll.closes_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    {poll.is_anonymous && (
                      <Badge variant="outline" className="text-xs">Anonymous</Badge>
                    )}
                    {poll.allow_multiple && (
                      <Badge variant="outline" className="text-xs">Multiple Choice</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(poll)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((option, index) => (
                  <div key={option.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{option.text}</span>
                      <span className="text-sm text-gray-500">
                        {option.votes} votes ({option.percentage}%)
                      </span>
                    </div>
                    <Progress value={option.percentage} className="h-2" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t">
                {isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClosePoll(poll.id)}
                    disabled={isLoading[poll.id]}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {isLoading[poll.id] ? 'Closing...' : 'Close Poll Early'}
                  </Button>
                )}
                <Button size="sm" variant="ghost">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}