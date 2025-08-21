import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ArrowRight, Heart, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Child } from '@/api/entities';
import { Activity } from '@/api/entities';
import { User } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';

const SAMPLE_ACTIVITIES = [
  {
    title: "Nature Scavenger Hunt",
    description: "Find 5 different leaves, rocks, or flowers in your backyard or local park.",
    category: "outdoor",
    duration: "20 minutes",
    age_range: { min_age: 3, max_age: 8 }
  },
  {
    title: "DIY Playdough",
    description: "Make colorful playdough using simple kitchen ingredients.",
    category: "creative",
    duration: "15 minutes",
    age_range: { min_age: 2, max_age: 6 }
  },
  {
    title: "Story Time Theater",
    description: "Act out your favorite story with props and costumes.",
    category: "creative",
    duration: "30 minutes",
    age_range: { min_age: 4, max_age: 10 }
  }
];

export default function ProgressiveOnboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [childData, setChildData] = useState({
    name: '',
    age: '',
    birth_date: ''
  });
  const [suggestedActivities, setSuggestedActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    if (step === 2 && childData.age) {
      generatePersonalizedActivities();
    }
  }, [step, childData.age]);

  const generatePersonalizedActivities = () => {
    const age = parseInt(childData.age);
    const filtered = SAMPLE_ACTIVITIES.filter(activity => 
      age >= activity.age_range.min_age && age <= activity.age_range.max_age
    );
    
    // If no age-appropriate activities, show all
    setSuggestedActivities(filtered.length > 0 ? filtered : SAMPLE_ACTIVITIES);
  };

  const handleStep1Next = () => {
    if (!childData.name || !childData.age) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your child's name and age to continue."
      });
      return;
    }

    // Calculate birth_date from age
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(childData.age);
    setChildData(prev => ({
      ...prev,
      birth_date: `${birthYear}-01-01`
    }));

    setStep(2);
  };

  const handleActivitySelect = (activity) => {
    setSelectedActivity(activity);
    setStep(3);
  };

  const handleFinishOnboarding = async () => {
    setIsLoading(true);
    try {
      // Create the child profile
      const newChild = await Child.create({
        name: childData.name,
        birth_date: childData.birth_date,
        age: parseInt(childData.age),
        interests: [],
        challenges: [],
        avatar: "👶",
        color: "#7C9885"
      });

      // Create the selected activity for this child
      if (selectedActivity) {
        await Activity.create({
          ...selectedActivity,
          child_id: newChild.id,
          status: 'suggested',
          is_personalized: true
        });
      }

      // Mark onboarding as completed
      await User.updateMyUserData({
        onboarding_completed: true,
        has_viewed_activities: true
      });

      toast({
        title: "Welcome to Teachmo! 🎉",
        description: `${childData.name}'s profile has been created and your first activity is ready!`
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: "destructive",
        title: "Setup Error",
        description: "There was a problem setting up your account. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{backgroundColor: 'var(--teachmo-cream)'}}>
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8" style={{color: 'var(--teachmo-sage)'}} />
            <h1 className="text-2xl font-bold" style={{color: 'var(--teachmo-sage)'}}>Teachmo</h1>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-gray-600">Step {step} of {totalSteps}</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Basic Child Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Let's find the perfect activity for your child</CardTitle>
                  <p className="text-gray-600">Just two quick details to get started</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="childName" className="text-base font-medium">What's your child's first name?</Label>
                    <Input
                      id="childName"
                      placeholder="e.g., Emma"
                      value={childData.name}
                      onChange={(e) => setChildData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2 text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="childAge" className="text-base font-medium">How old are they?</Label>
                    <Input
                      id="childAge"
                      type="number"
                      min="0"
                      max="18"
                      placeholder="e.g., 4"
                      value={childData.age}
                      onChange={(e) => setChildData(prev => ({ ...prev, age: e.target.value }))}
                      className="mt-2 text-lg p-3"
                    />
                  </div>
                  <Button 
                    onClick={handleStep1Next}
                    size="lg" 
                    className="w-full mt-6"
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    Show Me Activities <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Activity Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <CardTitle className="text-2xl">Perfect activities for {childData.name}!</CardTitle>
                  </div>
                  <p className="text-gray-600">Choose one to try first - you can always find more later</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {suggestedActivities.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border rounded-lg hover:border-green-300 cursor-pointer transition-colors"
                        onClick={() => handleActivitySelect(activity)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{activity.title}</h3>
                          <Badge variant="outline" className="capitalize">{activity.category}</Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{activity.description}</p>
                        <p className="text-sm text-gray-500">⏱️ {activity.duration}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Activity Preview */}
          {step === 3 && selectedActivity && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Great choice!</CardTitle>
                  <p className="text-gray-600">Here's your first activity with {childData.name}</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold">{selectedActivity.title}</h3>
                      <Badge className="bg-green-100 text-green-800">{selectedActivity.duration}</Badge>
                    </div>
                    <p className="text-gray-700 mb-4">{selectedActivity.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-white rounded-full capitalize">{selectedActivity.category}</span>
                      <span>•</span>
                      <span>Ages {selectedActivity.age_range.min_age}-{selectedActivity.age_range.max_age}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Button 
                      onClick={() => setStep(4)}
                      size="lg" 
                      className="w-full"
                      style={{backgroundColor: 'var(--teachmo-sage)'}}
                    >
                      Set Up My Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Completion */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl">You're all set!</CardTitle>
                  <p className="text-gray-600">Your personalized parenting dashboard is ready</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold mb-2">What you'll find on your dashboard:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Your selected activity ready to try
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Daily personalized activity suggestions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Progress tracking for {childData.name}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        AI parenting coach available 24/7
                      </li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handleFinishOnboarding}
                    disabled={isLoading}
                    size="lg" 
                    className="w-full"
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    {isLoading ? 'Setting up...' : 'Enter Teachmo'} 
                    <Heart className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}