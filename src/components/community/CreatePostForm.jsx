
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  CalendarIcon,
  Plus,
  MessageSquare,
  HelpCircle,
  BarChart,
  Users,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Post, Poll, Task, User } from '@/api/entities';
import { moderateContent } from '@/api/functions';
import { useDebounce } from '@/components/shared/useDebounce';

export default function CreatePostForm({
  onPostCreated,
  initialContent = '',
  initialType = 'general',
  currentUser
}) {
  const [activeTab, setActiveTab] = useState(initialType === 'question' ? 'question' : initialType === 'poll' ? 'poll' : initialType === 'task' ? 'task' : 'general');
  const [postContent, setPostContent] = useState(initialContent);
  const [postType, setPostType] = useState(initialType); // Used for 'general' and 'question' post types

  // Poll states
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollCloseDate, setPollCloseDate] = useState();
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollVisibility, setPollVisibility] = useState('public');

  // Task states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('volunteer');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskTimeRequired, setTaskTimeRequired] = useState('');
  const [taskPointsReward, setTaskPointsReward] = useState(5);
  const [taskMaxVolunteers, setTaskMaxVolunteers] = useState(1);
  const [taskDueDate, setTaskDueDate] = useState();
  const [taskSkillsNeeded, setTaskSkillsNeeded] = useState([]);
  const [newSkill, setNewSkill] = useState('');

  // Moderation states
  const [moderationResult, setModerationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Debounced content for moderation
  const debouncedContent = useDebounce(postContent, 500);

  useEffect(() => {
    // Only moderate if content is present and it's a general/question post
    if (debouncedContent && debouncedContent.trim() && (activeTab === 'general' || activeTab === 'question')) {
      checkContentModeration(debouncedContent);
    } else if (activeTab === 'task' || activeTab === 'poll') {
      // Clear moderation result if switching to poll/task as moderation logic is different or not applicable directly
      setModerationResult(null);
    }
  }, [debouncedContent, activeTab]);

  const checkContentModeration = async (content) => {
    try {
      const result = await moderateContent({
        content: content.trim(),
        contentType: 'text'
      });
      setModerationResult(result.data);
    } catch (error) {
      console.error('Error checking content moderation:', error);
      // Optionally clear moderation result on error or set a specific error state
      setModerationResult(null);
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const addSkill = () => {
    if (newSkill.trim() && !taskSkillsNeeded.includes(newSkill.trim())) {
      setTaskSkillsNeeded([...taskSkillsNeeded, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setTaskSkillsNeeded(taskSkillsNeeded.filter(s => s !== skill));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (activeTab === 'general' || activeTab === 'question') {
        if (moderationResult?.action === 'block') {
            toast({
                variant: "destructive",
                title: "Content blocked",
                description: "Please revise your content before sharing.",
            });
            return;
        }
    }


    setIsSubmitting(true);

    try {
      let createdItem = null;

      if (activeTab === 'poll') {
        // Validate poll
        if (!pollQuestion.trim()) {
          throw new Error('Poll question is required');
        }
        if (pollOptions.filter(opt => opt.trim()).length < 2) {
          throw new Error('At least 2 poll options are required');
        }
        if (!pollCloseDate) {
          throw new new Error('Poll closing date is required');
        }
        if (pollCloseDate <= new Date()) {
          throw new Error('Poll closing date must be in the future');
        }

        const pollData = {
          question: pollQuestion.trim(),
          options: pollOptions
            .filter(opt => opt.trim())
            .map((opt, index) => ({
              id: `option_${index}`,
              text: opt.trim(),
              votes: 0
            })),
          creator_id: currentUser.id,
          closes_at: pollCloseDate.toISOString(),
          is_anonymous: pollIsAnonymous,
          allow_multiple: pollAllowMultiple,
          visibility: pollVisibility,
          status: 'active',
          total_votes: 0
        };

        createdItem = await Poll.create(pollData);

        // Create associated post
        await Post.create({
          content: `📊 **Poll:** ${pollQuestion}`,
          type: 'poll',
          user_id: currentUser.id,
          author_name: currentUser.full_name || 'Anonymous',
          status: 'published',
          visibility: 'public', // Default public for associated poll post
          poll_id: createdItem.id
        });

      } else if (activeTab === 'task') {
        // Validate task
        if (!taskTitle.trim()) {
          throw new Error('Task title is required');
        }
        if (!taskDescription.trim()) {
          throw new Error('Task description is required');
        }

        const taskData = {
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          category: taskCategory,
          creator_id: currentUser.id,
          location: taskLocation.trim() || null,
          time_required: taskTimeRequired.trim() || null,
          points_reward: taskPointsReward,
          max_volunteers: taskMaxVolunteers,
          due_date: taskDueDate ? taskDueDate.toISOString() : null,
          skills_needed: taskSkillsNeeded,
          status: 'open',
          current_volunteers: 0,
          school_id: currentUser.school_id || null
        };

        createdItem = await Task.create(taskData);

      } else {
        // Regular post (general or question)
        if (!postContent.trim()) {
          throw new Error('Post content is required');
        }

        const postData = {
          content: postContent.trim(),
          type: postType,
          user_id: currentUser.id,
          author_name: currentUser.full_name || 'Anonymous',
          status: 'published',
          visibility: 'public', // Default public for general posts
          is_flagged: moderationResult?.action === 'flag',
          toxicity_score: moderationResult?.scores?.toxicity || 0
        };

        createdItem = await Post.create(postData);
      }

      // Reset form
      setPostContent(initialContent || '');
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollCloseDate(null);
      setPollIsAnonymous(false);
      setPollAllowMultiple(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskLocation('');
      setTaskTimeRequired('');
      setTaskSkillsNeeded([]);
      setTaskDueDate(null);
      setModerationResult(null);

      if (onPostCreated) {
        onPostCreated(createdItem);
      }

      toast({
        title: "Success!",
        description: `${activeTab === 'poll' ? 'Poll' : activeTab === 'task' ? 'Task' : 'Post'} created successfully.`,
      });

    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create item. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'Share', icon: MessageSquare },
    { id: 'question', name: 'Ask', icon: HelpCircle },
    { id: 'poll', name: 'Poll', icon: BarChart },
    { id: 'task', name: 'Task', icon: Users }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'general' || tab.id === 'question') {
                    setPostType(tab.id); // Ensure postType is correct for general/question tabs
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(activeTab === 'general' || activeTab === 'question') && (
              <div className="space-y-3">
                <Textarea
                  placeholder={activeTab === 'question' ? "What would you like to ask the community?" : "What's on your mind?"}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isSubmitting}
                  maxLength={2000}
                />

                {/* Moderation Feedback */}
                {moderationResult && (
                  <div className={`text-sm p-3 rounded-lg ${
                    moderationResult.action === 'block'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : moderationResult.action === 'flag'
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {moderationResult.action === 'block' && '⚠️ This content may violate community guidelines. Please revise before sharing.'}
                    {moderationResult.action === 'flag' && '⚡ This content will be reviewed by moderators before being published.'}
                    {moderationResult.action === 'allow' && '✅ Content looks good!'}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'poll' && (
              <div className="space-y-4">
                <Input
                  placeholder="What would you like to ask?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="space-y-2">
                  <Label>Poll Options</Label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        disabled={isSubmitting}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePollOption(index)}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPollOption}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Poll Closes</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            !pollCloseDate && "text-muted-foreground"
                          }`}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pollCloseDate ? format(pollCloseDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pollCloseDate}
                          onSelect={setPollCloseDate}
                          disabled={(date) => date <= new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Visibility</Label>
                    <Select value={pollVisibility} onValueChange={setPollVisibility} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="school">School Only</SelectItem>
                        <SelectItem value="pod">Pod Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anonymous"
                      checked={pollIsAnonymous}
                      onCheckedChange={setPollIsAnonymous}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="anonymous" className="text-sm">Anonymous voting</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="multiple"
                      checked={pollAllowMultiple}
                      onCheckedChange={setPollAllowMultiple}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="multiple" className="text-sm">Allow multiple selections</Label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'task' && (
              <div className="space-y-4">
                <Input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  disabled={isSubmitting}
                />

                <Textarea
                  placeholder="Describe what volunteers need to do..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={taskCategory} onValueChange={setTaskCategory} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volunteer">General Volunteer</SelectItem>
                        <SelectItem value="fundraising">Fundraising</SelectItem>
                        <SelectItem value="event_help">Event Help</SelectItem>
                        <SelectItem value="classroom_support">Classroom Support</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Points Reward</Label>
                    <Input
                      type="number"
                      value={taskPointsReward}
                      onChange={(e) => setTaskPointsReward(parseInt(e.target.value) || 5)}
                      min="1"
                      max="50"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input
                      placeholder="Where is this task located?"
                      value={taskLocation}
                      onChange={(e) => setTaskLocation(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label>Time Required</Label>
                    <Select value={taskTimeRequired} onValueChange={setTaskTimeRequired} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estimated time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 minutes">15 minutes</SelectItem>
                        <SelectItem value="30 minutes">30 minutes</SelectItem>
                        <SelectItem value="1 hour">1 hour</SelectItem>
                        <SelectItem value="2 hours">2 hours</SelectItem>
                        <SelectItem value="Half day">Half day</SelectItem>
                        <SelectItem value="Full day">Full day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Max Volunteers</Label>
                    <Input
                      type="number"
                      value={taskMaxVolunteers}
                      onChange={(e) => setTaskMaxVolunteers(parseInt(e.target.value) || 1)}
                      min="1"
                      max="20"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label>Due Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            !taskDueDate && "text-muted-foreground"
                          }`}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskDueDate ? format(taskDueDate, "PPP") : "No deadline"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={taskDueDate}
                          onSelect={setTaskDueDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label>Skills Needed (Optional)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      onClick={addSkill}
                      disabled={isSubmitting || !newSkill.trim()}
                      size="icon"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {taskSkillsNeeded.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => removeSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || (moderationResult?.action === 'block' && (activeTab === 'general' || activeTab === 'question'))}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {activeTab === 'poll' ? 'Creating Poll...' : activeTab === 'task' ? 'Creating Task...' : 'Sharing...'}
                </>
              ) : (
                <>
                  {activeTab === 'poll' ? 'Create Poll' : activeTab === 'task' ? 'Post Task' : 'Share Post'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
