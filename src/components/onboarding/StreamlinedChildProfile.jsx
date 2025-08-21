
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Sparkles, 
  Heart, 
  User,
  School,
  GraduationCap
} from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

const GRADE_LEVELS = [
  'Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
  '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
  '11th Grade', '12th Grade', 'College'
];

const COMMON_INTERESTS = [
  "🎨 Art & Drawing", "📚 Reading", "⚽ Sports", "🎵 Music", "🔬 Science",
  "🎮 Video Games", "🏗️ Building/Legos", "🐕 Animals", "🍳 Cooking", "💃 Dancing"
];

const COMMON_CHALLENGES = [
  "📖 Reading fluency", "➕ Math concepts", "👥 Social skills", "⏰ Time management",
  "🗣️ Public speaking", "✏️ Writing", "🎯 Focus & attention", "😰 Test anxiety"
];

const AVATARS = ["😊", "🤗", "😎", "🤩", "🥳", "🤓", "😇", "🙂", "😋", "🤔"];
const COLORS = ["#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE"];

export default function StreamlinedChildProfile({ onSave, onCancel, child = null }) {
  const [formData, setFormData] = useState({
    name: child?.name || '',
    birth_date: child?.birth_date || '',
    grade_level: child?.grade_level || '',
    school_name: child?.school_name || '',
    school_domain: child?.school_domain || '',
    interests: child?.interests || [],
    challenges: child?.challenges || [],
    avatar: child?.avatar || AVATARS[0],
    color: child?.color || COLORS[0],
    onboarded: child?.onboarded || false
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { title: "Basic Info", icon: User },
    { title: "School Info", icon: School },
    { title: "Interests", icon: Heart },
    { title: "Personalize", icon: Sparkles }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Calculate age when birth_date changes
      if (field === 'birth_date' && value) {
        try {
          const age = differenceInYears(new Date(), parseISO(value));
          updated.age = age;
        } catch (error) {
          console.error('Error calculating age:', error);
          // If date is invalid, age might not be calculated, but the field will still update.
          // This allows for partial entry before full validation.
        }
      }
      
      return updated;
    });
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Basic validation before attempting to save
    if (!formData.name || !formData.birth_date) {
      // In a real app, you might set an error state here to show specific messages
      console.error("Name and Birth Date are required.");
      return;
    }

    setIsLoading(true);
    
    try {
      // Calculate age from birth_date before saving
      let age = 0;
      try {
        if (formData.birth_date) {
          age = differenceInYears(new Date(), parseISO(formData.birth_date));
        }
      } catch (dateError) {
        console.error('Error parsing birth date for final save:', dateError);
        // Default age to 0 if parsing fails
      }

      const childData = {
        ...formData,
        age,
        onboarded: false // Always false for manual profiles, if this is how new profiles are created
      };
      
      if (onSave && typeof onSave === 'function') {
        await onSave(childData);
      } else {
        console.error("onSave function not provided to StreamlinedChildProfile.");
      }
    } catch (error) {
      console.error('Error saving child profile:', error);
      // Handle global error display here if needed
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        // Name and birth_date are mandatory for the first step
        return !!formData.name && !!formData.birth_date && !isNaN(parseISO(formData.birth_date).getTime());
      case 1: // School Info
        return true; // School info is optional
      case 2: // Interests & Challenges
        return true; // Interests/challenges are optional
      case 3: // Personalize
        return true; // Personalization is optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Child's Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your child's first name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date *</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                required
              />
              {formData.birth_date && !isNaN(parseISO(formData.birth_date).getTime()) && (
                <p className="text-sm text-gray-600">
                  Age: {differenceInYears(new Date(), parseISO(formData.birth_date))} years old
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade_level">Grade Level</Label>
              <select
                id="grade_level"
                value={formData.grade_level}
                onChange={(e) => handleInputChange('grade_level', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select grade level...</option>
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <School className="w-12 h-12 mx-auto mb-3 text-blue-600" />
              <h3 className="text-lg font-semibold">School Information</h3>
              <p className="text-sm text-gray-600">
                Help us connect with your child's school for assignments and updates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_name">School Name</Label>
              <Input
                id="school_name"
                value={formData.school_name}
                onChange={(e) => handleInputChange('school_name', e.target.value)}
                placeholder="e.g., Lincoln Elementary School"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_domain">School Website (Optional)</Label>
              <Input
                id="school_domain"
                value={formData.school_domain}
                onChange={(e) => handleInputChange('school_domain', e.target.value)}
                placeholder="e.g., lincoln-elementary.edu"
              />
              <p className="text-xs text-gray-500">
                This helps us connect to your school's Google Classroom
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">All features work without school integration!</p>
                  <p>You can use Teachmo's full feature set even if your school isn't connected yet. 
                     We'll help you request integration later if you'd like.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 mx-auto mb-3 text-pink-500" />
              <h3 className="text-lg font-semibold">Interests & Challenges</h3>
              <p className="text-sm text-gray-600">
                Tell us what {formData.name || "your child"} loves and what they're working on
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">What does {formData.name || "your child"} enjoy?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {COMMON_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleArrayItem('interests', interest)}
                      className={`p-2 text-sm text-left rounded-lg border transition-colors ${
                        formData.interests.includes(interest)
                          ? 'bg-pink-100 border-pink-300 text-pink-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Areas to focus on</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {COMMON_CHALLENGES.map((challenge) => (
                    <button
                      key={challenge}
                      type="button"
                      onClick={() => toggleArrayItem('challenges', challenge)}
                      className={`p-2 text-sm text-left rounded-lg border transition-colors ${
                        formData.challenges.includes(challenge)
                          ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {challenge}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
              <h3 className="text-lg font-semibold">Personalize {formData.name || "your child"}'s Profile</h3>
              <p className="text-sm text-gray-600">
                Choose an avatar and color theme
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Avatar</Label>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => handleInputChange('avatar', avatar)}
                      className={`w-12 h-12 text-2xl rounded-full border-2 transition-all ${
                        formData.avatar === avatar
                          ? 'border-purple-400 bg-purple-50 scale-110'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Theme Color</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-12 h-12 rounded-full border-4 transition-all ${
                        formData.color === color
                          ? 'border-gray-400 scale-110'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{formData.name || 'Your child'}</p>
                    <p className="text-sm text-gray-600">Preview of their profile</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {child ? 'Edit' : 'Add'} Child Profile
            </CardTitle>
            <CardDescription>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </CardDescription>
          </div>
          <Badge variant="outline">
            Manual Profile
          </Badge>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <React.Fragment key={index}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  <StepIcon className="w-4 h-4" />
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-grow h-1 rounded-full ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {renderStep()}

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? onCancel : handleBack}
            disabled={isLoading}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : currentStep === steps.length - 1 ? (
              'Create Profile'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
