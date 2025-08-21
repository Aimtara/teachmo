import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Calendar } from "lucide-react";

const PERSONALITY_TRAITS = [
  "creative", "analytical", "social", "independent", "curious", 
  "energetic", "calm", "empathetic", "logical", "artistic"
];

const INTERESTS = [
  "art", "music", "sports", "reading", "science", "cooking", 
  "nature", "building", "dancing", "storytelling", "puzzles", "animals"
];

const AVATAR_OPTIONS = ["👶", "👧", "👦", "🧒", "👨", "👩", "🎨", "⚽", "📚", "🔬", "🎵", "🌟"];
const COLOR_OPTIONS = ["#E8A598", "#7C9885", "#6B9DC8", "#F4D03F", "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA"];

export default function NewChildProfile({ childToEdit, onSave, onCancel }) {
  // FIX: Better initialization of form data with proper defaults
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    birth_date: "",
    grade_level: "",
    learning_style: "",
    interests: [],
    challenges: [],
    development_goals: [],
    personality_traits: [],
    avatar: "👶",
    color: "#E8A598"
  });

  const [newInterest, setNewInterest] = useState("");
  const [newChallenge, setNewChallenge] = useState("");
  const [newGoal, setNewGoal] = useState("");

  // FIX: Properly initialize form when editing
  useEffect(() => {
    if (childToEdit) {
      setFormData({
        name: childToEdit.name || "",
        age: childToEdit.age?.toString() || "",
        birth_date: childToEdit.birth_date || "",
        grade_level: childToEdit.grade_level || "",
        learning_style: childToEdit.learning_style || "",
        interests: childToEdit.interests || [],
        challenges: childToEdit.challenges || [],
        development_goals: childToEdit.development_goals || [],
        personality_traits: childToEdit.personality_traits || [],
        avatar: childToEdit.avatar || "👶",
        color: childToEdit.color || "#E8A598"
      });
    }
  }, [childToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // FIX: Ensure age is converted to number
    const submitData = {
      ...formData,
      age: parseInt(formData.age, 10)
    };
    
    onSave(submitData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = (field, value, setValue) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
      setValue("");
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(item)
        ? prev[field].filter(i => i !== item)
        : [...(prev[field] || []), item]
    }));
  };

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
          {childToEdit ? "Edit Child Profile" : "Add New Child"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Child's Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="18"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="grade_level">Grade Level</Label>
              <Input
                id="grade_level"
                value={formData.grade_level}
                onChange={(e) => handleInputChange('grade_level', e.target.value)}
                placeholder="e.g., Kindergarten, 3rd Grade"
              />
            </div>
          </div>

          {/* Avatar and Color Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVATAR_OPTIONS.map(avatar => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => handleInputChange('avatar', avatar)}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                      formData.avatar === avatar ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Profile Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleInputChange('color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-gray-700 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Learning Style */}
          <div>
            <Label>Learning Style</Label>
            <Select 
              value={formData.learning_style} 
              onValueChange={(value) => handleInputChange('learning_style', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select learning style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="auditory">Auditory</SelectItem>
                <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                <SelectItem value="not_sure">Not Sure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interests */}
          <div>
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  variant={formData.interests?.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('interests', interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add custom interest"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('interests', newInterest, setNewInterest))}
              />
              <Button
                type="button"
                onClick={() => addItem('interests', newInterest, setNewInterest)}
                size="icon"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.interests?.filter(i => !INTERESTS.includes(i)).map((interest, index) => (
              <Badge key={interest} variant="secondary" className="mr-2 mt-2">
                {interest}
                <button
                  type="button"
                  onClick={() => removeItem('interests', formData.interests.indexOf(interest))}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Personality Traits */}
          <div>
            <Label>Personality Traits</Label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TRAITS.map(trait => (
                <Badge
                  key={trait}
                  variant={formData.personality_traits?.includes(trait) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem('personality_traits', trait)}
                >
                  {trait}
                </Badge>
              ))}
            </div>
          </div>

          {/* Development Goals */}
          <div>
            <Label>Development Goals</Label>
            <div className="space-y-2">
              {formData.development_goals?.map((goal, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-gray-50 p-2 rounded">{goal}</span>
                  <Button
                    type="button"
                    onClick={() => removeItem('development_goals', index)}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add development goal"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('development_goals', newGoal, setNewGoal))}
                />
                <Button
                  type="button"
                  onClick={() => addItem('development_goals', newGoal, setNewGoal)}
                  size="icon"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Challenges */}
          <div>
            <Label>Challenges or Focus Areas</Label>
            <div className="space-y-2">
              {formData.challenges?.map((challenge, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-gray-50 p-2 rounded">{challenge}</span>
                  <Button
                    type="button"
                    onClick={() => removeItem('challenges', index)}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add challenge or focus area"
                  value={newChallenge}
                  onChange={(e) => setNewChallenge(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('challenges', newChallenge, setNewChallenge))}
                />
                <Button
                  type="button"
                  onClick={() => addItem('challenges', newChallenge, setNewChallenge)}
                  size="icon"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" style={{backgroundColor: 'var(--teachmo-sage)'}}>
              {childToEdit ? "Update Child" : "Add Child"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}