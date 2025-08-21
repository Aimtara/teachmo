import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Post, Poll, Task } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  X, 
  Send, 
  BarChart, 
  ClipboardCheck, 
  AlertTriangle, 
  Loader2, 
  Calendar as CalendarIcon 
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { moderateContent } from '@/api/functions';
import { useDebounce } from '@/components/hooks/useDebounce';

// Sub-components for each tab
const CreatePollForm = ({ pollData, setPollData }) => {
  // ... (UI and logic for poll creation form)
  const addOption = () => {
    setPollData(prev => ({ ...prev, options: [...prev.options, { text: '' }] }));
  };

  const removeOption = (index) => {
    setPollData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollData.options];
    newOptions[index].text = value;
    setPollData(prev => ({ ...prev, options: newOptions }));
  };
  
  return (
    <div className="space-y-4">
      <Textarea
        placeholder="What's your poll question?"
        value={pollData.question}
        onChange={(e) => setPollData(prev => ({ ...prev, question: e.target.value }))}
        className="text-base"
      />
      <div className="space-y-2">
        {pollData.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option.text}
              onChange={(e) => handleOptionChange(index, e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={() => removeOption(index)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addOption}><Plus className="mr-2 h-4 w-4" /> Add Option</Button>
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {pollData.closes_at ? format(pollData.closes_at, 'PPP') : 'Set closing date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={pollData.closes_at}
              onSelect={(date) => setPollData(prev => ({ ...prev, closes_at: date }))}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const CreateTaskForm = ({ taskData, setTaskData }) => {
  // ... (UI and logic for task creation form)
  const handleChange = (e) => {
    const { id, value } = e.target;
    setTaskData(prev => ({ ...prev, [id]: value }));
  };
  
  return (
    <div className="space-y-4">
       <Input id="title" placeholder="Task Title (e.g., 'Help with Book Fair Setup')" value={taskData.title} onChange={handleChange} />
       <Textarea id="description" placeholder="Describe the task..." value={taskData.description} onChange={handleChange} />
       <div className="grid grid-cols-2 gap-4">
          <Input id="location" placeholder="Location (e.g., 'School Library')" value={taskData.location} onChange={handleChange} />
          <Input id="time_required" placeholder="Time Required (e.g., '2 hours')" value={taskData.time_required} onChange={handleChange} />
          <Input id="points_reward" type="number" placeholder="Points Reward" value={taskData.points_reward} onChange={handleChange} />
          <Input id="max_volunteers" type="number" placeholder="Volunteers Needed" value={taskData.max_volunteers} onChange={handleChange} />
       </div>
    </div>
  );
};


export default function CreatePostForm({ user, onPostCreated, initialContent, initialType = 'general' }) {
  const [postType, setPostType] = useState(initialType);
  const [postContent, setPostContent] = useState(initialContent);
  const [pollData, setPollData] = useState({ question: '', options: [{ text: '' }, { text: '' }], closes_at: null });
  const [taskData, setTaskData] = useState({ title: '', description: '', location: '', time_required: '', points_reward: 10, max_volunteers: 1, category: 'volunteer' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);
  const { toast } = useToast();
  
  const debouncedContent = useDebounce(postContent, 500);

  useEffect(() => {
    setPostContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    setPostType(initialType);
  }, [initialType]);
  
  useEffect(() => {
    if (debouncedContent && postType === 'general' || postType === 'question') {
      handleModerationCheck(debouncedContent);
    } else {
      setModerationResult(null);
    }
  }, [debouncedContent, postType]);

  const handleModerationCheck = async (content) => {
    if (!content.trim()) return;
    const result = await moderateContent({ text: content });
    setModerationResult(result);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let newItem;
      switch (postType) {
        case 'poll':
          // Validation for poll
          if (!pollData.question.trim() || pollData.options.some(o => !o.text.trim()) || !pollData.closes_at) {
            toast({ variant: "destructive", title: "Please complete the poll details." });
            return;
          }
          newItem = await Poll.create({
            ...pollData,
            options: pollData.options.map(o => ({...o, id: crypto.randomUUID()})),
            creator_id: user.id,
            visibility: 'public', // Or add a selector
          });
          toast({ title: "Poll Created!", description: "Your poll is now live." });
          break;
        case 'task':
          // Validation for task
          if (!taskData.title.trim() || !taskData.description.trim()) {
            toast({ variant: "destructive", title: "Please complete the task details." });
            return;
          }
          newItem = await Task.create({
            ...taskData,
            creator_id: user.id,
            status: 'open',
          });
          toast({ title: "Task Posted!", description: "Your request for help is on the board." });
          break;
        default: // 'general' or 'question'
          if (!postContent.trim() || moderationResult?.shouldBlock) {
            toast({ variant: "destructive", title: "Cannot submit this post.", description: "Please revise your content." });
            return;
          }
          newItem = await Post.create({
            content: postContent,
            type: postType,
            user_id: user.id,
          });
          toast({ title: "Post Shared!", description: "Your post is now live in the community feed." });
      }
      
      if (onPostCreated) {
        onPostCreated(newItem);
      }
      // Reset forms
      setPostContent('');
      setPollData({ question: '', options: [{ text: '' }, { text: '' }], closes_at: null });
      setTaskData({ title: '', description: '', location: '', time_required: '', points_reward: 10, max_volunteers: 1, category: 'volunteer' });

    } catch (error) {
      console.error("Failed to create item:", error);
      toast({ variant: "destructive", title: "Submission Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || (postType === 'general' && moderationResult?.shouldBlock);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback>{user?.full_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="w-full">
            <Tabs value={postType} onValueChange={setPostType}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Post</TabsTrigger>
                <TabsTrigger value="poll"><BarChart className="w-4 h-4 mr-2" />Poll</TabsTrigger>
                <TabsTrigger value="task"><ClipboardCheck className="w-4 h-4 mr-2" />Task</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="mt-4">
                 <Textarea
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="min-h-[100px] text-base"
                  />
                  {moderationResult && (
                    <div className={`mt-2 text-sm flex items-center gap-2 ${moderationResult.shouldBlock ? 'text-red-600' : 'text-yellow-600'}`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span>{moderationResult.reason}</span>
                    </div>
                  )}
              </TabsContent>
               <TabsContent value="question" className="mt-4">
                 <Textarea
                    placeholder="What's your question for the community?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="min-h-[100px] text-base"
                  />
                   {moderationResult && (
                    <div className={`mt-2 text-sm flex items-center gap-2 ${moderationResult.shouldBlock ? 'text-red-600' : 'text-yellow-600'}`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span>{moderationResult.reason}</span>
                    </div>
                  )}
              </TabsContent>
              <TabsContent value="poll" className="mt-4">
                <CreatePollForm pollData={pollData} setPollData={setPollData} />
              </TabsContent>
              <TabsContent value="task" className="mt-4">
                <CreateTaskForm taskData={taskData} setTaskData={setTaskData} />
              </TabsContent>
            </Tabs>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
