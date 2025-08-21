import React, { useState } from 'react';
import { Task, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, X, Clock, User as UserIcon, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskManagementTable({ tasks, onTaskUpdate, currentUser }) {
  const [isLoading, setIsLoading] = useState({});
  const { toast } = useToast();

  const handleApproveTask = async (taskId) => {
    setIsLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      await Task.update(taskId, { 
        status: 'completed',
        approved_by: currentUser.id 
      });
      
      // Award points to the assignee
      const task = tasks.find(t => t.id === taskId);
      if (task?.assignee_id) {
        const assignee = await User.get(task.assignee_id);
        await User.update(task.assignee_id, {
          points: (assignee.points || 0) + task.points_reward
        });
      }
      
      onTaskUpdate();
      toast({ title: 'Task Approved', description: 'Points have been awarded to the volunteer.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve task.' });
    } finally {
      setIsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleRejectTask = async (taskId) => {
    setIsLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      await Task.update(taskId, { 
        status: 'in_progress',
        feedback: 'Task completion was not approved. Please review and resubmit.' 
      });
      onTaskUpdate();
      toast({ title: 'Task Rejected', description: 'Volunteer has been notified to revise.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reject task.' });
    } finally {
      setIsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { color: 'bg-green-100 text-green-800', label: 'Open' },
      claimed: { color: 'bg-blue-100 text-blue-800', label: 'Claimed' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      pending_approval: { color: 'bg-purple-100 text-purple-800', label: 'Pending Approval' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.open;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <Card key={task.id} className="border-l-4 border-l-blue-500">
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
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(task.status)}
                <span className="text-sm font-medium text-green-600">
                  {task.points_reward} points
                </span>
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

            {task.feedback && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800"><strong>Feedback:</strong> {task.feedback}</p>
              </div>
            )}

            {task.status === 'pending_approval' && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  onClick={() => handleApproveTask(task.id)}
                  disabled={isLoading[task.id]}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isLoading[task.id] ? 'Approving...' : 'Approve & Award Points'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectTask(task.id)}
                  disabled={isLoading[task.id]}
                >
                  <X className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            )}

            {task.completed_at && (
              <div className="mt-4 text-sm text-gray-500">
                Completed on {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}