import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Bug, Lightbulb, AlertTriangle, Star, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackTypeCard = ({ type, icon: Icon, title, description, selected, onClick }) => (
  <Card 
    className={`cursor-pointer transition-all hover:shadow-md ${
      selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const StarRating = ({ rating, onRatingChange, disabled = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={disabled}
        onClick={() => onRatingChange?.(star)}
        className={`transition-colors ${disabled ? 'cursor-not-allowed' : 'hover:text-yellow-500'}`}
      >
        <Star 
          className={`w-6 h-6 ${
            star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
          }`} 
        />
      </button>
    ))}
  </div>
);

export default function FeedbackSystem({ 
  isOpen, 
  onClose, 
  context = 'general',
  contextData = {},
  user 
}) {
  const [step, setStep] = useState(1); // 1: Type, 2: Details, 3: Confirmation
  const [feedbackType, setFeedbackType] = useState('');
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
    contactPreference: 'none',
    allowFollowUp: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const feedbackTypes = [
    {
      id: 'bug',
      icon: Bug,
      title: 'Report a Bug',
      description: 'Something isn\'t working as expected'
    },
    {
      id: 'feature',
      icon: Lightbulb,
      title: 'Request a Feature',
      description: 'Suggest a new feature or improvement'
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      title: 'General Feedback',
      description: 'Share your thoughts about Teachmo'
    },
    {
      id: 'content',
      icon: AlertTriangle,
      title: 'Content Issue',
      description: 'Report inappropriate or incorrect content'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would typically send to your feedback/support system
      const feedbackData = {
        type: feedbackType,
        context,
        contextData,
        ...formData,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: user?.id
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Feedback submitted:', feedbackData);
      
      setStep(3);
      
      toast({
        title: "Thank you for your feedback!",
        description: "We've received your submission and will review it soon."
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "There was an error submitting your feedback. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFeedbackType('');
    setFormData({
      rating: 0,
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      reproductionSteps: '',
      expectedBehavior: '',
      actualBehavior: '',
      contactPreference: 'none',
      allowFollowUp: false
    });
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300); // Reset after close animation
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">What would you like to share?</h2>
            <div className="grid gap-3">
              {feedbackTypes.map((type) => (
                <FeedbackTypeCard
                  key={type.id}
                  type={type.id}
                  icon={type.icon}
                  title={type.title}
                  description={type.description}
                  selected={feedbackType === type.id}
                  onClick={() => setFeedbackType(type.id)}
                />
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!feedbackType}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {React.createElement(feedbackTypes.find(t => t.id === feedbackType)?.icon, {
                  className: "w-4 h-4 text-blue-600"
                })}
              </div>
              <h2 className="text-xl font-semibold">
                {feedbackTypes.find(t => t.id === feedbackType)?.title}
              </h2>
            </div>

            {/* Rating for general feedback */}
            {feedbackType === 'feedback' && (
              <div className="space-y-2">
                <Label>How would you rate your overall experience?</Label>
                <StarRating 
                  rating={formData.rating} 
                  onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
                />
              </div>
            )}

            {/* Title/Summary */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {feedbackType === 'bug' ? 'Brief description of the issue' : 'Title'}
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={
                  feedbackType === 'bug' 
                    ? "e.g., Calendar events not saving properly"
                    : feedbackType === 'feature'
                    ? "e.g., Ability to share activities with other parents"
                    : "Brief summary of your feedback"
                }
                required
              />
            </div>

            {/* Category for content issues */}
            {feedbackType === 'content' && (
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="resource">Library Resource</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="post">Community Post</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority for bugs */}
            {feedbackType === 'bug' && (
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <RadioGroup 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low">Low - Minor inconvenience</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium">Medium - Affects functionality</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high">High - Prevents core features from working</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Detailed description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {feedbackType === 'bug' ? 'What happened?' : 'Details'}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={
                  feedbackType === 'bug'
                    ? "Describe what you were doing when the issue occurred..."
                    : feedbackType === 'feature'
                    ? "Describe the feature you'd like to see and how it would help..."
                    : feedbackType === 'content'
                    ? "Please explain the issue with this content..."
                    : "Share your thoughts, suggestions, or concerns..."
                }
                rows={4}
                required
              />
            </div>

            {/* Bug-specific fields */}
            {feedbackType === 'bug' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="steps">Steps to Reproduce (optional)</Label>
                  <Textarea
                    id="steps"
                    value={formData.reproductionSteps}
                    onChange={(e) => setFormData(prev => ({ ...prev, reproductionSteps: e.target.value }))}
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. Notice that..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected">What did you expect to happen? (optional)</Label>
                  <Input
                    id="expected"
                    value={formData.expectedBehavior}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                    placeholder="e.g., The event should save and appear on my calendar"
                  />
                </div>
              </>
            )}

            {/* Contact preferences */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="followup"
                  checked={formData.allowFollowUp}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowFollowUp: checked }))}
                />
                <Label htmlFor="followup" className="text-sm">
                  I'm open to follow-up questions about this feedback
                </Label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 mr-2"
                    >
                      ⏳
                    </motion.div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        );

      case 3:
        return (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                ✅
              </motion.div>
            </div>
            <h2 className="text-xl font-semibold">Thank you!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve Teachmo.
            </p>
            <p className="text-sm text-gray-500">
              This window will close automatically, or you can close it manually.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Send Feedback</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}