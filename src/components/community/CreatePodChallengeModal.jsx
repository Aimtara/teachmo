import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PodChallenge } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

export default function CreatePodChallengeModal({ isOpen, onClose, podId, onChallengeCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('posts');
  const [goalTarget, setGoalTarget] = useState(10);
  const [rewardPoints, setRewardPoints] = useState(25);
  const [endDate, setEndDate] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title || !description || !endDate) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out all required fields.' });
      return;
    }
    if (endDate <= new Date()) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'End date must be in the future.' });
        return;
    }

    setIsLoading(true);
    try {
      await PodChallenge.create({
        pod_id: podId,
        title,
        description,
        goal_type: goalType,
        goal_target: Number(goalTarget),
        reward_points: Number(rewardPoints),
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
      });
      toast({ title: 'Challenge Created!', description: 'The new pod challenge is now active.' });
      onChallengeCreated();
      resetForm();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create challenge.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
      setTitle('');
      setDescription('');
      setGoalType('posts');
      setGoalTarget(10);
      setRewardPoints(25);
      setEndDate(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Pod Challenge</DialogTitle>
          <DialogDescription>
            Set a collective goal for your pod members and reward them for their participation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Challenge Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Weekly Post-a-Thon" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the challenge about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goalType">Goal Type</Label>
              <Select value={goalType} onValueChange={setGoalType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="kudos">Kudos</SelectItem>
                  <SelectItem value="activities" disabled>Activities (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalTarget">Goal Target</Label>
              <Input id="goalTarget" type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rewardPoints">Points per Member</Label>
              <Input id="rewardPoints" type="number" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} min="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Challenge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}