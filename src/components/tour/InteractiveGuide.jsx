import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  Circle,
  Target,
  Lightbulb,
  Users,
  MessageSquare,
  Calendar,
  BookOpen,
  Bot,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';

// Role-specific tour definitions
const TOUR_DEFINITIONS = {
  parent: {
    title: "Welcome to Teachmo",
    description: "Let's get you started with your AI parenting coach",
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Parenting Journey',
        description: 'Teachmo is your AI-powered parenting coach, designed to support you every step of the way.',
        icon: Home,
        action: null,
        tips: [
          'Get personalized activities for your children',
          'Connect with teachers and other parents',
          'Track your family\'s progress and milestones'
        ]
      },
      {
        id: 'dashboard',
        title: 'Your Family Dashboard',
        description: 'This is your central hub where you can see today\'s activities, check in emotionally, and get quick insights.',
        icon: Home,
        action: 'Dashboard',
        selector: '[data-tour="dashboard"]',
        tips: [
          'View your daily parenting focus',
          'Check in with your current mood',
          'See quick stats about your week'
        ]
      },
      {
        id: 'add-child',
        title: 'Add Your First Child',
        description: 'Let\'s set up a profile for your child to get personalized activities and guidance.',
        icon: Users,
        action: null,
        selector: '[data-tour="add-child"]',
        tips: [
          'We keep all information secure and private',
          'Child profiles help us personalize recommendations',
          'You can add multiple children at any time'
        ]
      },
      {
        id: 'activities',
        title: 'Discover Activities',
        description: 'Find age-appropriate activities and local events for your family.',
        icon: Lightbulb,
        action: 'UnifiedDiscover',
        tips: [
          'Activities are personalized based on your child\'s age and interests',
          'Save activities to try later',
          'Rate activities to improve recommendations'
        ]
      },
      {
        id: 'ai-coach',
        title: 'Meet Your AI Coach',
        description: 'Get instant, personalized parenting advice whenever you need it.',
        icon: Bot,
        action: 'AIAssistant',
        tips: [
          'Ask questions about child development, discipline, and more',
          'Get evidence-based advice tailored to your situation',
          'Available 24/7 for whenever you need support'
        ]
      },
      {
        id: 'calendar',
        title: 'Plan Your Family Time',
        description: 'Schedule activities, track school events, and organize your family\'s schedule.',
        icon: Calendar,
        action: 'Calendar',
        tips: [
          'Drag activities from your suggestions to schedule them',
          'Sync with school calendars and events',
          'Set reminders for important family activities'
        ]
      }
    ]
  },
  teacher: {
    title: "Welcome to Teachmo for Educators",
    description: "Connect with parents and enhance student learning",
    steps: [
      {
        id: 'teacher-welcome',
        title: 'Welcome, Educator!',
        description: 'Teachmo helps you build stronger connections with families and support student success.',
        icon: BookOpen,
        action: null,
        tips: [
          'Communicate easily with parents',
          'Share classroom updates and assignments',
          'Support whole-child development'
        ]
      },
      {
        id: 'teacher-dashboard',
        title: 'Your Teaching Hub',
        description: 'Access your classes, recent messages, and important updates all in one place.',
        icon: Home,
        action: 'TeacherDashboard',
        tips: [
          'View all your classes and students',
          'See recent parent communications',
          'Quick access to announcements and resources'
        ]
      },
      {
        id: 'messaging',
        title: 'Parent Communication',
        description: 'Send messages to parents about their child\'s progress, behavior, or upcoming events.',
        icon: MessageSquare,
        action: 'TeacherMessages',
        tips: [
          'Messages are organized by student and class',
          'Send quick updates or detailed reports',
          'Parents receive notifications on their preferred schedule'
        ]
      },
      {
        id: 'announcements',
        title: 'Class Announcements',
        description: 'Keep parents informed with class-wide or school-wide announcements.',
        icon: Target,
        action: 'Announcements',
        tips: [
          'Send updates about homework, events, or policy changes',
          'Schedule announcements for optimal delivery times',
          'Track which parents have seen important messages'
        ]
      }
    ]
  },
  school_admin: {
    title: "School Administration Hub",
    description: "Manage your school's Teachmo integration",
    steps: [
      {
        id: 'admin-welcome',
        title: 'Welcome, Administrator',
        description: 'Manage your school\'s parent engagement and teacher communication tools.',
        icon: Target,
        action: null,
        tips: [
          'Oversee all teacher and parent communications',
          'Manage school-wide announcements',
          'View engagement analytics and insights'
        ]
      },
      {
        id: 'school-dashboard',
        title: 'School Overview',
        description: 'Monitor school-wide engagement metrics and communication trends.',
        icon: Home,
        action: 'SchoolAdminDashboard',
        tips: [
          'Track parent engagement across all classes',
          'See which communication channels are most effective',
          'Monitor teacher adoption and usage'
        ]
      },
      {
        id: 'user-management',
        title: 'Manage School Users',
        description: 'Add teachers, verify parent accounts, and manage user permissions.',
        icon: Users,
        action: 'SchoolUsers',
        tips: [
          'Invite new teachers to join Teachmo',
          'Verify parent-student relationships',
          'Set permissions for different user types'
        ]
      }
    ]
  }
};

// Interactive tour spotlight component
function TourSpotlight({ selector, onNext, onClose, step, isActive }) {
  const [element, setElement] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!selector || !isActive) return;

    const findElement = () => {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setElement(el);
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        
        // Scroll element into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Try to find element immediately and with a delay for dynamic content
    findElement();
    const timer = setTimeout(findElement, 500);
    
    return () => clearTimeout(timer);
  }, [selector, isActive]);

  if (!selector || !element || !isActive) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Spotlight */}
      <div
        className="fixed z-50 border-4 border-blue-500 rounded-lg shadow-lg"
        style={{
          top: position.top - 8,
          left: position.left - 8,
          width: position.width + 16,
          height: position.height + 16,
          pointerEvents: 'none'
        }}
      />
      
      {/* Tour card */}
      <Card 
        className="fixed z-50 max-w-sm shadow-xl"
        style={{
          top: position.top + position.height + 20,
          left: Math.max(20, Math.min(position.left, window.innerWidth - 400))
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <step.icon className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{step.description}</p>
          {step.tips && (
            <ul className="space-y-1 mb-4">
              {step.tips.map((tip, index) => (
                <li key={index} className="text-sm text-gray-500 flex items-start gap-2">
                  <Circle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={onNext} className="w-full">
            Next Step
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default function InteractiveGuide({ userRole = 'parent', onComplete, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const navigate = useNavigate();

  const tour = TOUR_DEFINITIONS[userRole] || TOUR_DEFINITIONS.parent;
  const step = tour.steps[currentStep];
  const progress = ((currentStep + 1) / tour.steps.length) * 100;

  // Save progress to user profile
  const saveProgress = useCallback(async () => {
    try {
      const currentUser = await User.me();
      const tutorialProgress = {
        ...currentUser.tutorial_progress,
        currentTour: userRole,
        currentStep: currentStep,
        completedSteps: Array.from(completedSteps),
        lastActive: new Date().toISOString()
      };
      
      await User.updateMyUserData({ tutorial_progress: tutorialProgress });
    } catch (error) {
      console.warn('Failed to save tour progress:', error);
    }
  }, [userRole, currentStep, completedSteps]);

  // Auto-save progress when it changes
  useEffect(() => {
    if (completedSteps.size > 0) {
      saveProgress();
    }
  }, [completedSteps, saveProgress]);

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, step.id]));
    
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      
      // Navigate to the next step's page if needed
      const nextStep = tour.steps[currentStep + 1];
      if (nextStep.action) {
        navigate(createPageUrl(nextStep.action));
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      
      // Navigate to the previous step's page if needed
      const prevStep = tour.steps[currentStep - 1];
      if (prevStep.action) {
        navigate(createPageUrl(prevStep.action));
      }
    }
  };

  const handleComplete = async () => {
    try {
      const currentUser = await User.me();
      const tutorialProgress = {
        ...currentUser.tutorial_progress,
        completedTours: [...(currentUser.tutorial_progress?.completedTours || []), userRole],
        hasSeenTutorial: true,
        completedAt: new Date().toISOString()
      };
      
      await User.updateMyUserData({ tutorial_progress: tutorialProgress });
      setIsActive(false);
      onComplete?.();
    } catch (error) {
      console.warn('Failed to save tour completion:', error);
      setIsActive(false);
      onComplete?.();
    }
  };

  const handleDismiss = async () => {
    try {
      const currentUser = await User.me();
      const tutorialProgress = {
        ...currentUser.tutorial_progress,
        isDismissed: true,
        dismissedAt: new Date().toISOString()
      };
      
      await User.updateMyUserData({ tutorial_progress: tutorialProgress });
      setIsActive(false);
      onDismiss?.();
    } catch (error) {
      console.warn('Failed to save tour dismissal:', error);
      setIsActive(false);
      onDismiss?.();
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsActive(true);
    
    // Navigate to first step if it has an action
    if (tour.steps[0].action) {
      navigate(createPageUrl(tour.steps[0].action));
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      {/* Tour Spotlight for steps with selectors */}
      {step.selector && (
        <TourSpotlight
          selector={step.selector}
          step={step}
          isActive={isActive}
          onNext={handleNext}
          onClose={handleDismiss}
        />
      )}

      {/* Main Tour Card for steps without selectors */}
      {!step.selector && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <Card className="shadow-xl border-2 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Step {currentStep + 1} of {tour.steps.length}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Progress value={progress} className="h-2 mb-3" />
              <div className="flex items-center gap-2">
                <step.icon className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{step.description}</p>
              
              {step.tips && (
                <ul className="space-y-2 mb-4">
                  {step.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrevious} className="flex-1">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {currentStep === tour.steps.length - 1 ? 'Complete' : 'Next'}
                  {currentStep < tour.steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>

              {step.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(createPageUrl(step.action))}
                  className="w-full mt-2 text-blue-600"
                >
                  Go to {step.action.replace(/([A-Z])/g, ' $1').trim()}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to check if user needs onboarding
export function useInteractiveGuide(userRole) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const currentUser = await User.me();
        const tutorialProgress = currentUser.tutorial_progress || {};
        
        const hasCompletedTour = tutorialProgress.completedTours?.includes(userRole);
        const isDismissed = tutorialProgress.isDismissed;
        const hasSeenTutorial = tutorialProgress.hasSeenTutorial;
        
        // Show tour if user hasn't completed it and hasn't permanently dismissed it
        setShouldShow(!hasCompletedTour && !isDismissed && currentUser.onboarding_completed);
      } catch (error) {
        console.warn('Failed to check tour status:', error);
        setShouldShow(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (userRole) {
      checkTourStatus();
    }
  }, [userRole]);

  return { shouldShow, isLoading };
}