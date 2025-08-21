import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

export default function UserContentForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'activity',
    category: 'educational',
    age_range: { min_age: 3, max_age: 8 },
    materials_needed: [],
    instructions: [''],
    learning_objectives: [''],
    tags: []
  });
  
  const [currentMaterial, setCurrentMaterial] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  const handleChange = (field, value) => {
    if (field === 'min_age' || field === 'max_age') {
      setFormData(prev => ({
        ...prev,
        age_range: { ...prev.age_range, [field]: parseInt(value) }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const addMaterial = () => {
    if (currentMaterial.trim()) {
      setFormData(prev => ({
        ...prev,
        materials_needed: [...prev.materials_needed, currentMaterial.trim()]
      }));
      setCurrentMaterial('');
    }
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials_needed: prev.materials_needed.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const updateInstruction = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData(prev => ({ ...prev, instructions: newInstructions }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      setFormData(prev => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateObjective = (index, value) => {
    const newObjectives = [...formData.learning_objectives];
    newObjectives[index] = value;
    setFormData(prev => ({ ...prev, learning_objectives: newObjectives }));
  };

  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: [...prev.learning_objectives, '']
    }));
  };

  const removeObjective = (index) => {
    if (formData.learning_objectives.length > 1) {
      setFormData(prev => ({
        ...prev,
        learning_objectives: prev.learning_objectives.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      instructions: formData.instructions.filter(inst => inst.trim()),
      learning_objectives: formData.learning_objectives.filter(obj => obj.trim())
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Activity name"
            required
          />
        </div>
        <div>
          <Label htmlFor="content_type">Content Type *</Label>
          <Select value={formData.content_type} onValueChange={(value) => handleChange('content_type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Activity</SelectItem>
              <SelectItem value="resource">Resource</SelectItem>
              <SelectItem value="tip">Parenting Tip</SelectItem>
              <SelectItem value="guide">Guide</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe your activity..."
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="emotional">Emotional</SelectItem>
              <SelectItem value="stem">STEM</SelectItem>
              <SelectItem value="arts">Arts</SelectItem>
              <SelectItem value="outdoor">Outdoor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Age Range</Label>
          <div className="flex items-center gap-2">
            <Select value={formData.age_range.min_age.toString()} onValueChange={(value) => handleChange('min_age', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => i + 2).map(age => (
                  <SelectItem key={age} value={age.toString()}>{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>to</span>
            <Select value={formData.age_range.max_age.toString()} onValueChange={(value) => handleChange('max_age', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => i + 2).map(age => (
                  <SelectItem key={age} value={age.toString()}>{age}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label>Materials Needed</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={currentMaterial}
            onChange={(e) => setCurrentMaterial(e.target.value)}
            placeholder="Add a material..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
          />
          <Button type="button" onClick={addMaterial} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.materials_needed.map((material, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {material}
              <button type="button" onClick={() => removeMaterial(index)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Instructions</Label>
        {formData.instructions.map((instruction, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <div className="flex-1">
              <Textarea
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder={`Step ${index + 1}...`}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button type="button" onClick={addInstruction} size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
              {formData.instructions.length > 1 && (
                <Button type="button" onClick={() => removeInstruction(index)} size="sm" variant="outline">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Learning Objectives</Label>
        {formData.learning_objectives.map((objective, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={objective}
              onChange={(e) => updateObjective(index, e.target.value)}
              placeholder="What will children learn?"
            />
            <Button type="button" onClick={addObjective} size="sm" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
            {formData.learning_objectives.length > 1 && (
              <Button type="button" onClick={() => removeObjective(index)} size="sm" variant="outline">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            placeholder="Add a tag..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map(tag => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Submit for Review
        </Button>
      </div>
    </form>
  );
}
