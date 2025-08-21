import React, { useState } from 'react';
import { Task, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Clock, User as UserIcon, MapPin, Calendar, Trophy } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskCard({ task, currentUser, onUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClaimTask = async () => {
    setIsLoading(true);
    try {
      if (task.current_volunteers >= task.max_volunteers) {
        toast({ variant: 'destructive', title: 'Task Full', description: 'This task has reached maximum volunteers.' });
        return;
      }

      await Task.update(task.id, {
        status: 'claimed',
        assignee_id: currentUser.id,
        current_volunteers: task.current_volunteers + 1
      });

      // Award points immediately for claiming
      await User.update(currentUser.id, {
        points: (currentUser.points || 0) + Math.floor(task.points_reward * 0.5) // 50% for claiming, 50% for completion
      });

      onUpdate();
      toast({ 
        title: 'Task Claimed!', 
        description: `You've claimed "${task.title}" and earned ${Math.floor(task.points_reward * 0.5)} points.` 
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to claim task.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      await Task.update(task.id, {
        status: 'pending_approval',
        completed_at: new Date().toISOString()
      });

      onUpdate();
      toast({ 
        title: 'Task Submitted!', 
        description: 'Your completion is pending approval from the task creator.' 
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to mark task as complete.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-green-100 text-green-800', label: 'Open' },
      claimed: { color: 'bg-blue-100 text-blue-800', label: 'Claimed' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      pending_approval: { color: 'bg-purple-100 text-purple-800', label: 'Pending Approval' }
    };
    const config = statusConfig[status] || statusConfig.open;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const isAssignedToUser = task.assignee_id === currentUser.id;
  const canClaim = task.status === 'open' && task.current_volunteers < task.max_volunteers && !isAssignedToUser;
  const canMarkComplete = isAssignedToUser && task.status === 'claimed';

  return (
    <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                {task.current_volunteers}/{task.max_volunteers} volunteers
              </span>
              {task.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {task.location}
                </span>
              )}
              {task.time_required && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {task.time_required}
                </span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Due: {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(task.status)}
            <div className="flex items-center gap-1 text-green-600 font-medium">
              <Trophy className="w-4 h-4" />
              {task.points_reward} pts
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{task.description}</p>
        
        {task.skills_needed && task.skills_needed.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Skills needed:</p>
            <div className="flex flex-wrap gap-1">
              {task.skills_needed.map(skill => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {task.feedback && isAssignedToUser && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800"><strong>Feedback:</strong> {task.feedback}</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {canClaim && (
            <Button
              onClick={handleClaimTask}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Claiming...' : 'Claim Task'}
            </Button>
          )}
          
          {canMarkComplete && (
            <Button
              onClick={handleMarkComplete}
              disabled={isLoading}
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isLoading ? 'Submitting...' : 'Mark Complete'}
            </Button>
          )}
          
          {isAssignedToUser && task.status === 'pending_approval' && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Awaiting approval...
            </div>
          )}
        </div>

        {task.completed_at && task.status === 'completed' && (
          <div className="mt-4 text-sm text-green-600 font-medium">
            ✅ Completed on {format(new Date(task.completed_at), 'MMM d, yyyy')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}