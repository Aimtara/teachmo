import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { X, BarChart3, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatePollModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    closes_at: '',
    is_anonymous: false,
    allow_multiple: false,
    visibility: 'school'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Poll question is required';
    }

    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    if (!formData.closes_at) {
      newErrors.closes_at = 'Poll closing date is required';
    } else if (new Date(formData.closes_at) <= new Date()) {
      newErrors.closes_at = 'Poll must close in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const validOptions = formData.options
        .filter(opt => opt.trim())
        .map((text, index) => ({
          id: `option-${index}`,
          text: text.trim(),
          votes: 0
        }));

      const pollData = {
        ...formData,
        options: validOptions,
        status: 'active',
        total_votes: 0
      };

      await onSave(pollData);
    } catch (error) {
      console.error('Error creating poll:', error);
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
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Create New Poll</CardTitle>
                  <p className="text-sm text-gray-600">Get community input on important decisions</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Poll Question */}
                <div>
                  <Label htmlFor="question">Poll Question *</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) => handleInputChange('question', e.target.value)}
                    className={errors.question ? 'border-red-500' : ''}
                    placeholder="What's your question for the community?"
                  />
                  {errors.question && <p className="text-red-500 text-sm mt-1">{errors.question}</p>}
                </div>

                {/* Poll Options */}
                <div>
                  <Label>Answer Options *</Label>
                  <div className="space-y-3 mt-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1"
                        />
                        {formData.options.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {errors.options && <p className="text-red-500 text-sm">{errors.options}</p>}
                    
                    {formData.options.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addOption}
                        className="w-full text-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Option
                      </Button>
                    )}
                  </div>
                </div>

                {/* Poll Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Poll Settings</h3>
                  
                  <div>
                    <Label htmlFor="closes_at">Poll Closes At *</Label>
                    <Input
                      id="closes_at"
                      type="datetime-local"
                      value={formData.closes_at}
                      onChange={(e) => handleInputChange('closes_at', e.target.value)}
                      className={errors.closes_at ? 'border-red-500' : ''}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {errors.closes_at && <p className="text-red-500 text-sm mt-1">{errors.closes_at}</p>}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="is_anonymous">Anonymous Voting</Label>
                        <p className="text-sm text-gray-500">Voters' identities will not be visible</p>
                      </div>
                      <Switch
                        id="is_anonymous"
                        checked={formData.is_anonymous}
                        onCheckedChange={(checked) => handleInputChange('is_anonymous', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allow_multiple">Allow Multiple Selections</Label>
                        <p className="text-sm text-gray-500">Voters can choose more than one option</p>
                      </div>
                      <Switch
                        id="allow_multiple"
                        checked={formData.allow_multiple}
                        onCheckedChange={(checked) => handleInputChange('allow_multiple', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Poll Preview */}
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">Poll Preview</h4>
                  <div className="bg-white rounded-lg p-4">
                    <h5 className="font-medium mb-3">
                      {formData.question || 'Your poll question will appear here'}
                    </h5>
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        option.trim() && (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <input 
                              type={formData.allow_multiple ? 'checkbox' : 'radio'} 
                              disabled 
                              className="text-blue-600"
                            />
                            <span className="text-sm">{option}</span>
                          </div>
                        )
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      <p>Closes: {formData.closes_at ? new Date(formData.closes_at).toLocaleString() : 'Not set'}</p>
                      {formData.is_anonymous && <p>• Anonymous voting enabled</p>}
                      {formData.allow_multiple && <p>• Multiple selections allowed</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Poll'}
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
