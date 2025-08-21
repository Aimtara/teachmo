import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Lock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Child } from '@/api/entities';
import { useEntityCrud } from '@/components/hooks/useApi';
import { differenceInYears } from 'date-fns';

const INTERESTS_OPTIONS = [
  'Reading', 'Art & Drawing', 'Music', 'Sports', 'Science', 'Animals', 'Cooking', 
  'Building/LEGO', 'Dancing', 'Video Games', 'Nature', 'Math', 'Writing', 'Photography'
];

const CHALLENGES_OPTIONS = [
  'Reading skills', 'Math skills', 'Social skills', 'Focus & attention', 'Organization',
  'Self-confidence', 'Emotional regulation', 'Physical coordination', 'Screen time', 'Sleep routine'
];

const PERSONALITY_OPTIONS = [
  'Creative', 'Analytical', 'Outgoing', 'Shy', 'Energetic', 'Calm', 'Independent',
  'Team player', 'Curious', 'Determined', 'Empathetic', 'Logical'
];

const DEVELOPMENT_GOALS = [
  'Build confidence', 'Improve social skills', 'Develop creativity', 'Strengthen academics',
  'Increase physical activity', 'Better emotional regulation', 'Foster independence', 'Enhance communication'
];

export default function EnhancedChildProfile({ existingChild, isEditing, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    grade_level: '',
    school_name: '',
    learning_style: 'not_sure',
    interests: [],
    challenges: [],
    personality_traits: [],
    development_goals: [],
    avatar: '👶',
    color: '#6B9DC8'
  });
  const [showCoppa, setShowCoppa] = useState(false);
  const [coppaConsent, setCoppaConsent] = useState(false);
  const [coppaMethod, setCoppaMethod] = useState('');

  const childApi = useEntityCrud(Child, { context: 'child profile' });

  useEffect(() => {
    if (existingChild) {
      setFormData({
        name: existingChild.name || '',
        birth_date: existingChild.birth_date || '',
        grade_level: existingChild.grade_level || '',
        school_name: existingChild.school_name || '',
        learning_style: existingChild.learning_style || 'not_sure',
        interests: existingChild.interests || [],
        challenges: existingChild.challenges || [],
        personality_traits: existingChild.personality_traits || [],
        development_goals: existingChild.development_goals || [],
        avatar: existingChild.avatar || '👶',
        color: existingChild.color || '#6B9DC8'
      });
      
      if (existingChild.birth_date) {
        const age = differenceInYears(new Date(), new Date(existingChild.birth_date));
        setShowCoppa(age < 13);
        setCoppaConsent(existingChild.coppa_consent_verified || false);
        setCoppaMethod(existingChild.coppa_consent_method || '');
      }
    }
    
    if (formData.birth_date) {
      const age = differenceInYears(new Date(), new Date(formData.birth_date));
      setShowCoppa(age < 13);
    } else {
      setShowCoppa(false);
    }
  }, [existingChild, formData.birth_date]);

  const handleDateChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, birth_date: value }));
    const age = differenceInYears(new Date(), new Date(value));
    setShowCoppa(age < 13);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return formData.name && formData.birth_date;
      case 2:
        return true; // Optional step
      case 3:
        if (showCoppa) {
          return coppaConsent && coppaMethod;
        }
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep() && step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    if (!validateStep()) return;
    
    const finalData = { ...formData };
    if (showCoppa) {
      finalData.coppa_consent_verified = coppaConsent;
      finalData.coppa_consent_method = coppaMethod;
      finalData.coppa_consent_timestamp = coppaConsent ? new Date().toISOString() : null;
    } else {
      finalData.coppa_consent_method = 'not_required';
    }

    if (isEditing) {
      await childApi.update(existingChild.id, finalData, {
        successMessage: "Child profile updated successfully!",
        onSuccess: onComplete,
      });
    } else {
      await childApi.create(finalData, {
        successMessage: "Child added successfully!",
        onSuccess: onComplete,
      });
    }
  };

  const steps = [
    { id: 1, title: 'Basics', icon: User },
    { id: 2, title: 'Details', icon: Sparkles },
    { id: 3, title: 'Permissions', icon: Lock },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 text-center">
            <User className="w-12 h-12 mx-auto text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-900">Tell us about your child</h3>
            
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div>
                <Label htmlFor="name">Child's Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter child's first name"
                  className="text-center"
                />
              </div>
              
              <div>
                <Label htmlFor="birth_date">Birth Date</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleDateChange}
                />
              </div>
              
              <div>
                <Label htmlFor="grade_level">Grade Level (Optional)</Label>
                <Select onValueChange={(value) => handleInputChange('grade_level', value)} value={formData.grade_level}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-K">Pre-K</SelectItem>
                    <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                    <SelectItem value="1st Grade">1st Grade</SelectItem>
                    <SelectItem value="2nd Grade">2nd Grade</SelectItem>
                    <SelectItem value="3rd Grade">3rd Grade</SelectItem>
                    <SelectItem value="4th Grade">4th Grade</SelectItem>
                    <SelectItem value="5th Grade">5th Grade</SelectItem>
                    <SelectItem value="6th Grade">6th Grade</SelectItem>
                    <SelectItem value="7th Grade">7th Grade</SelectItem>
                    <SelectItem value="8th Grade">8th Grade</SelectItem>
                    <SelectItem value="9th Grade">9th Grade</SelectItem>
                    <SelectItem value="10th Grade">10th Grade</SelectItem>
                    <SelectItem value="11th Grade">11th Grade</SelectItem>
                    <SelectItem value="12th Grade">12th Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="school_name">School Name (Optional)</Label>
                <Input
                  id="school_name"
                  value={formData.school_name}
                  onChange={(e) => handleInputChange('school_name', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-purple-500" />
            <h3 className="text-xl font-semibold text-gray-900">Help us personalize their experience</h3>
            
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              <div>
                <Label>Learning Style</Label>
                <Select onValueChange={(value) => handleInputChange('learning_style', value)} value={formData.learning_style}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual (learns through seeing)</SelectItem>
                    <SelectItem value="auditory">Auditory (learns through hearing)</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic (learns through doing)</SelectItem>
                    <SelectItem value="not_sure">Not sure yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Interests & Hobbies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INTERESTS_OPTIONS.map((interest) => (
                    <Badge
                      key={interest}
                      variant={formData.interests.includes(interest) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('interests', interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Areas to Work On</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CHALLENGES_OPTIONS.map((challenge) => (
                    <Badge
                      key={challenge}
                      variant={formData.challenges.includes(challenge) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('challenges', challenge)}
                    >
                      {challenge}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Personality Traits</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PERSONALITY_OPTIONS.map((trait) => (
                    <Badge
                      key={trait}
                      variant={formData.personality_traits.includes(trait) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('personality_traits', trait)}
                    >
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-900">Permissions & Consent</h3>
            
            <AnimatePresence>
              {showCoppa && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg text-left space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Parental Consent Required (COPPA)</h4>
                      <p className="text-sm text-yellow-700">
                        Because your child is under 13, we need your verifiable consent to collect personal information, in compliance with the Children's Online Privacy Protection Act.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>How was consent verified?</Label>
                    <Select onValueChange={setCoppaMethod} value={coppaMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select verification method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Plus Confirmation</SelectItem>
                        <SelectItem value="credit_card">Credit/Debit Card Charge</SelectItem>
                        <SelectItem value="signed_form">Signed Consent Form</SelectItem>
                        <SelectItem value="phone">Video/Phone Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox id="coppa-consent" checked={coppaConsent} onCheckedChange={setCoppaConsent} />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="coppa-consent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I confirm I am the parent or legal guardian and I provide consent.
                      </label>
                      <p className="text-xs text-muted-foreground">
                        You agree to our Terms of Service and Privacy Policy for child accounts.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!showCoppa && (
              <div className="p-4 border border-green-300 bg-green-50 rounded-lg text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-800">Standard Consent</h4>
                    <p className="text-sm text-green-700">
                      You are creating a profile for a child over 13. By continuing, you agree to our Terms of Service.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <Heart className="w-8 h-8" style={{ color: 'var(--teachmo-coral)' }} />
        </div>
        <CardTitle className="text-2xl">
          {isEditing ? 'Edit Child Profile' : 'Add Your Child'}
        </CardTitle>
        
        {/* Step Progress */}
        <div className="flex justify-center items-center gap-4 mt-6">
          {steps.map((stepItem, index) => {
            const StepIcon = stepItem.icon;
            const isActive = step === stepItem.id;
            const isCompleted = step > stepItem.id;
            
            return (
              <div key={stepItem.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  isCompleted ? 'bg-green-500 text-white' : 
                  isActive ? 'bg-blue-500 text-white' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {stepItem.title}
                </span>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px] flex flex-col justify-center"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Step {step} of {steps.length}
          </div>
          
          {step < 3 ? (
            <Button
              onClick={handleNextStep}
              disabled={!validateStep()}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!validateStep() || childApi.isLoading}
              className="flex items-center gap-2"
            >
              {childApi.isLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
              <Heart className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
