import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Plus, Globe, Lock, School, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Pod, PodMember } from '@/api/entities';
import { User } from '@/api/entities';

const POD_TYPES = [
  {
    value: 'public',
    label: 'Public',
    icon: Globe,
    description: 'Anyone can find and join this pod'
  },
  {
    value: 'private',
    icon: Lock,
    label: 'Private',
    description: 'Only people you invite can join'
  },
  {
    value: 'school',
    icon: School,
    label: 'School',
    description: 'Only people from your school can join'
  }
];

const ACTIVITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Casual, few posts per week' },
  { value: 'medium', label: 'Medium', description: 'Regular discussions' },
  { value: 'high', label: 'High', description: 'Very active, daily posts' }
];

const SUGGESTED_TAGS = [
  'toddlers', 'preschool', 'elementary', 'middle-school', 'high-school',
  'new-parents', 'working-parents', 'single-parents', 'special-needs',
  'activities', 'education', 'behavior', 'sleep', 'nutrition',
  'local', 'playdates', 'support', 'advice'
];

export default function CreatePodModal({ open, onOpenChange, onPodCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public',
    tags: [],
    max_members: '',
    activity_level: 'medium',
    join_approval_required: false
  });
  const [customTag, setCustomTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddTag = (tag) => {
    if (formData.tags.includes(tag) || formData.tags.length >= 5) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddCustomTag = () => {
    if (!customTag.trim()) return;
    
    const cleanTag = customTag.toLowerCase().replace(/\s+/g, '-');
    if (!formData.tags.includes(cleanTag) && formData.tags.length < 5) {
      handleAddTag(cleanTag);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please give your pod a name.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await User.me();
      
      // Create the pod
      const podData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        owner_id: user.id,
        tags: formData.tags,
        max_members: formData.max_members ? parseInt(formData.max_members) : null,
        activity_level: formData.activity_level,
        join_approval_required: formData.join_approval_required,
        member_count: 1,
        school_id: formData.type === 'school' ? user.school_id : null,
        last_activity_at: new Date().toISOString()
      };

      const newPod = await Pod.create(podData);
      
      // Add creator as first member
      await PodMember.create({
        pod_id: newPod.id,
        user_id: user.id
      });

      // Award points for creating community
      await User.updateMyUserData({
        points: (user.points || 0) + 10
      });

      toast({
        title: "Pod created! +10 points",
        description: `${formData.name} is ready for members`,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'public',
        tags: [],
        max_members: '',
        activity_level: 'medium',
        join_approval_required: false
      });

      if (onPodCreated) {
        onPodCreated(newPod);
      }

      onOpenChange(false);

    } catch (error) {
      console.error('Error creating pod:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create pod. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = POD_TYPES.find(t => t.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Pod
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="pod-name">Pod Name *</Label>
              <Input
                id="pod-name"
                placeholder="e.g., Brooklyn Parents, STEM Activities, New Mom Support"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/50 characters
              </p>
            </div>

            <div>
              <Label htmlFor="pod-description">Description</Label>
              <Textarea
                id="pod-description"
                placeholder="What is this pod about? What kind of discussions and activities will members have?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="h-24"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Pod Type */}
          <div>
            <Label>Pod Type</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {POD_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isSelected = formData.type === type.value;
                
                return (
                  <div
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      <div>
                        <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {type.label}
                        </h4>
                        <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (up to 5)</Label>
            <p className="text-xs text-gray-500 mb-2">
              Help people find your pod with relevant tags
            </p>
            
            {/* Current Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Suggested Tags */}
            {formData.tags.length < 5 && (
              <>
                <div className="flex flex-wrap gap-1 mb-3">
                  {SUGGESTED_TAGS.filter(tag => !formData.tags.includes(tag)).slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>

                {/* Custom Tag */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomTag}
                    disabled={!customTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-members">Max Members (optional)</Label>
              <Input
                id="max-members"
                type="number"
                placeholder="No limit"
                value={formData.max_members}
                onChange={(e) => setFormData(prev => ({ ...prev, max_members: e.target.value }))}
                min="2"
                max="500"
              />
            </div>

            <div>
              <Label htmlFor="activity-level">Expected Activity</Label>
              <Select 
                value={formData.activity_level} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, activity_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-gray-500">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Approval Required */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <Label htmlFor="approval-required" className="text-base font-medium">
                Require join approval
              </Label>
              <p className="text-sm text-gray-600">
                New members must be approved before they can participate
              </p>
            </div>
            <Switch
              id="approval-required"
              checked={formData.join_approval_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, join_approval_required: checked }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Pod'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
