import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Check, Target, Users, Calendar, Search, Plus, Bot } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const TourStep = ({ step, totalSteps, title, description, icon: Icon, action, onNext, onPrev, onSkip, onComplete, highlight }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-gray-500">{step} of {totalSteps}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-gray-700 mb-6">{description}</p>
          
          {action && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">Try it now:</p>
              <p className="text-sm text-blue-700">{action}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={onPrev}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              
              {step < totalSteps ? (
                <Button size="sm" onClick={onNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={onComplete}>
                  <Check className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const getTourSteps = (userType) => {
  const commonSteps = [
    {
      title: "Welcome to Teachmo!",
      description: "Let's take a quick tour to help you get the most out of your experience.",
      icon: Target,
    }
  ];

  const parentSteps = [
    {
      title: "Add Your Child",
      description: "Start by adding your child's profile to get personalized activities and track their progress.",
      icon: Users,
      action: "Click the 'Add Your First Child' button when you see it.",
      highlight: "add-child-button"
    },
    {
      title: "Discover Activities",
      description: "Browse thousands of activities tailored to your child's age, interests, and learning style.",
      icon: Search,
      action: "Visit the Discover page to explore activities, events, and resources.",
    },
    {
      title: "Plan Your Week",
      description: "Use the calendar to schedule activities and create a routine that works for your family.",
      icon: Calendar,
      action: "Check out the Calendar page to see how easy it is to plan ahead.",
    },
    {
      title: "Get AI Assistance",
      description: "Have questions? Our AI Assistant provides personalized parenting guidance 24/7.",
      icon: Bot,
      action: "Try asking the AI Assistant about a parenting challenge you're facing.",
    }
  ];

  const teacherSteps = [
    {
      title: "Set Up Your Classes",
      description: "Add your classes and connect with your students' families for better communication.",
      icon: Users,
      action: "Go to 'My Classes' to add your first class.",
    },
    {
      title: "Assign Activities",
      description: "Share educational activities with parents to support learning at home.",
      icon: Plus,
      action: "Browse activities and click 'Assign to Class' to share with families.",
    },
    {
      title: "Track Progress",
      description: "Monitor how families are engaging with assigned activities and homework support.",
      icon: Target,
    }
  ];

  const adminSteps = [
    {
      title: "Admin Dashboard",
      description: "Your central hub for managing users, content, and analytics across your organization.",
      icon: Target,
      action: "Explore the Admin Portal section in the sidebar.",
    },
    {
      title: "User Management",
      description: "Invite and manage teachers, parents, and other administrators in your system.",
      icon: Users,
    },
    {
      title: "Analytics & Insights",
      description: "Track engagement, usage patterns, and outcomes across your organization.",
      icon: Target,
    }
  ];

  switch (userType) {
    case 'parent':
      return [...commonSteps, ...parentSteps];
    case 'teacher':
      return [...commonSteps, ...teacherSteps];
    case 'school_admin':
    case 'district_admin':
    case 'system_admin':
      return [...commonSteps, ...adminSteps];
    default:
      return commonSteps;
  }
};

export default function InteractiveOnboardingTour({ user, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  
  const tourSteps = getTourSteps(user?.user_type);

  const handleNext = () => {
    if (currentStep < tourSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip?.();
  };

  if (!isVisible) return null;

  const currentStepData = tourSteps[currentStep - 1];

  return (
    <AnimatePresence>
      <TourStep
        step={currentStep}
        totalSteps={tourSteps.length}
        title={currentStepData.title}
        description={currentStepData.description}
        icon={currentStepData.icon}
        action={currentStepData.action}
        highlight={currentStepData.highlight}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />
    </AnimatePresence>
  );
}