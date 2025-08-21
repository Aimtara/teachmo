import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, ClipboardList, Calendar, MapPin, Clock, Users, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateTaskModal({ onSave, onCancel, defaultCategory = 'volunteer' }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: defaultCategory,
    due_date: '',
    location: '',
    time_required: '',
    max_volunteers: 1,
    points_reward: 5,
    skills_needed: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const categories = [
    { value: 'volunteer', label: 'General Volunteering' },
    { value: 'fundraising', label: 'Fundraising' },
    { value: 'event_help', label: 'Event Support' },
    { value: 'classroom_support', label: 'Classroom Support' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'pta_general', label: 'PTA Activities' },
    { value: 'pta_internal', label: 'PTA Board Only' },
    { value: 'other', label: 'Other' }
  ];

  const timeOptions = [
    '30 minutes',
    '1 hour',
    '2 hours',
    '3 hours',
    'Half day (4 hours)',
    'Full day (8 hours)',
    'Multiple days',
    'Ongoing'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills_needed.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills_needed: [...prev.skills_needed, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills_needed: prev.skills_needed.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Task category is required';
    }

    if (formData.max_volunteers < 1) {
      newErrors.max_volunteers = 'Must allow at least 1 volunteer';
    }

    if (formData.points_reward < 1) {
      newErrors.points_reward = 'Points reward must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const taskData = {
        ...formData,
        max_volunteers: parseInt(formData.max_volunteers),
        points_reward: parseInt(formData.points_reward),
        status: 'open'
      };

      await onSave(taskData);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <Card className="shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Create New Task</CardTitle>
                  <p className="text-sm text-gray-600">Set up a volunteer opportunity</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
                  
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={errors.title ? 'border-red-500' : ''}
                      placeholder="Help with school carnival setup"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={errors.description ? 'border-red-500' : ''}
                      placeholder="Detailed description of what volunteers will do..."
                      rows={3}
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>
                </div>

                {/* Schedule & Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Schedule & Location</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="due_date"
                          type="datetime-local"
                          value={formData.due_date}
                          onChange={(e) => handleInputChange('due_date', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="time_required">Time Required</Label>
                      <Select value={formData.time_required} onValueChange={(value) => handleInputChange('time_required', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="School gymnasium, Room 101, etc."
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Volunteer Requirements */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Volunteer Requirements</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_volunteers">Max Volunteers</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="max_volunteers"
                          type="number"
                          min="1"
                          value={formData.max_volunteers}
                          onChange={(e) => handleInputChange('max_volunteers', e.target.value)}
                          className={`pl-10 ${errors.max_volunteers ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.max_volunteers && <p className="text-red-500 text-sm mt-1">{errors.max_volunteers}</p>}
                    </div>

                    <div>
                      <Label htmlFor="points_reward">Points Reward</Label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="points_reward"
                          type="number"
                          min="1"
                          value={formData.points_reward}
                          onChange={(e) => handleInputChange('points_reward', e.target.value)}
                          className={`pl-10 ${errors.points_reward ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.points_reward && <p className="text-red-500 text-sm mt-1">{errors.points_reward}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="skills_needed">Skills Needed (Optional)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="e.g., Heavy lifting, Computer skills..."
                      />
                      <Button type="button" variant="outline" onClick={handleAddSkill}>
                        Add
                      </Button>
                    </div>
                    {formData.skills_needed.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.skills_needed.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-red-100" onClick={() => handleRemoveSkill(skill)}>
                            {skill} <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
