
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Play, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Lightbulb,
  Star,
  Trophy,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Tutorial steps configuration
const TUTORIAL_STEPS = {
  parent: [
    {
      id: 'welcome',
      title: 'Welcome to Teachmo!',
      description: 'Your AI-powered parenting companion is ready to help you create meaningful moments with your children.',
      target: '#main-content',
      position: 'center',
      action: 'highlight',
      points: 50,
      category: 'onboarding'
    },
    {
      id: 'add_child',
      title: 'Add Your First Child',
      description: 'Tell us about your child so we can personalize activities and recommendations just for them.',
      target: '[data-tour="add-child"]',
      position: 'bottom',
      action: 'click',
      points: 100,
      category: 'setup',
      navigationUrl: 'Settings'
    },
    {
      id: 'discover_activities',
      title: 'Discover Amazing Activities',
      description: 'Explore thousands of age-appropriate activities designed by child development experts.',
      target: '[data-tour="activities"]',
      position: 'right',
      action: 'navigate',
      points: 75,
      category: 'core_features',
      navigationUrl: 'UnifiedDiscover'
    },
    {
      id: 'ai_coach',
      title: 'Meet Your AI Coach',
      description: 'Get personalized parenting advice and guidance whenever you need it.',
      target: '[data-tour="ai-coach"]',
      position: 'right',
      action: 'navigate',
      points: 75,
      category: 'core_features',
      navigationUrl: 'AIAssistant'
    },
    {
      id: 'schedule_activity',
      title: 'Schedule Family Time',
      description: 'Plan activities and create a routine that works for your family.',
      target: '[data-tour="calendar"]',
      position: 'right',
      action: 'navigate',
      points: 50,
      category: 'organization',
      navigationUrl: 'Calendar'
    },
    {
      id: 'track_progress',
      title: 'Track Your Journey',
      description: 'See your child\'s development progress and celebrate milestones together.',
      target: '[data-tour="progress"]',
      position: 'right',
      action: 'navigate',
      points: 50,
      category: 'tracking',
      navigationUrl: 'Progress'
    }
  ],
  teacher: [
    {
      id: 'teacher_welcome',
      title: 'Welcome, Educator!',
      description: 'Teachmo helps you connect with parents and support student success at home.',
      target: '#main-content',
      position: 'center',
      action: 'highlight',
      points: 50,
      category: 'onboarding'
    },
    {
      id: 'manage_classes',
      title: 'Manage Your Classes',
      description: 'View and organize all your students in one place.',
      target: '[data-tour="classes"]',
      position: 'right',
      action: 'navigate',
      points: 75,
      category: 'core_features',
      navigationUrl: 'TeacherClasses'
    },
    {
      id: 'parent_communication',
      title: 'Connect with Parents',
      description: 'Send messages and share updates with families.',
      target: '[data-tour="messages"]',
      position: 'right',
      action: 'navigate',
      points: 75,
      category: 'communication',
      navigationUrl: 'TeacherMessages'
    }
  ]
};

// Feature checklist for ongoing engagement
const FEATURE_CHECKLIST = {
  parent: [
    {
      id: 'complete_profile',
      title: 'Complete Your Family Profile',
      description: 'Add details about your children for better recommendations',
      category: 'setup',
      points: 100,
      checkUrl: 'Settings',
      estimatedTime: '3 min'
    },
    {
      id: 'first_activity',
      title: 'Try Your First Activity',
      description: 'Complete an activity with your child and see the magic happen',
      category: 'engagement',
      points: 150,
      checkUrl: 'UnifiedDiscover',
      estimatedTime: '15-30 min'
    },
    {
      id: 'ai_conversation',
      title: 'Chat with Your AI Coach',
      description: 'Ask a parenting question and get personalized advice',
      category: 'support',
      points: 75,
      checkUrl: 'AIAssistant',
      estimatedTime: '2 min'
    },
    {
      id: 'schedule_routine',
      title: 'Create a Family Routine',
      description: 'Schedule regular activities to build consistency',
      category: 'organization',
      points: 100,
      checkUrl: 'Calendar',
      estimatedTime: '5 min'
    },
    {
      id: 'track_milestone',
      title: 'Track a Milestone',
      description: 'Record your child\'s progress and celebrate achievements',
      category: 'tracking',
      points: 100,
      checkUrl: 'Progress',
      estimatedTime: '2 min'
    },
    {
      id: 'join_community',
      title: 'Connect with Other Parents',
      description: 'Join discussions and share experiences with the community',
      category: 'community',
      points: 50,
      checkUrl: 'UnifiedCommunity',
      estimatedTime: '5 min'
    },
    {
      id: 'customize_preferences',
      title: 'Personalize Your Experience',
      description: 'Set your preferences and notification settings',
      category: 'personalization',
      points: 75,
      checkUrl: 'Settings',
      estimatedTime: '3 min'
    }
  ]
};

export const TutorialProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tutorialState, setTutorialState] = useState({
    isActive: false,
    currentStep: 0,
    completedSteps: [],
    showChecklist: false,
    isDismissedPermanently: false
  });

  useEffect(() => {
    const loadUserTutorialState = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        
        const tutorialData = userData.tutorial_progress || {
          completedSteps: [],
          checklistProgress: [],
          hasSeenTutorial: false,
          isDismissed: false
        };

        setTutorialState(prev => ({
          ...prev,
          completedSteps: tutorialData.completedSteps || [],
          isDismissedPermanently: tutorialData.isDismissed || false,
          showChecklist: !tutorialData.hasSeenTutorial && !tutorialData.isDismissed && userData.onboarding_completed
        }));
      } catch (error) {
        console.error('Error loading tutorial state:', error);
      }
    };

    loadUserTutorialState();
  }, []);

  const startTutorial = () => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isDismissedPermanently: false // Reset dismissal if user explicitly starts tutorial
    }));
  };

  const dismissTutorialPermanently = async () => {
    try {
      const tutorialData = {
        ...(user.tutorial_progress || {}),
        isDismissed: true,
        dismissedAt: new Date().toISOString()
      };

      await User.updateMyUserData({
        tutorial_progress: tutorialData
      });

      setTutorialState(prev => ({
        ...prev,
        isActive: false,
        showChecklist: false, // Also hide checklist if dismissed
        isDismissedPermanently: true
      }));
    } catch (error) {
      console.error('Error dismissing tutorial:', error);
    }
  };

  const completeTutorial = async () => {
    try {
      const tutorialData = {
        ...(user.tutorial_progress || {}),
        hasSeenTutorial: true,
        completedAt: new Date().toISOString()
      };

      await User.updateMyUserData({
        tutorial_progress: tutorialData,
        points: (user.points || 0) + 200 // Bonus for completing tutorial
      });

      setTutorialState(prev => ({
        ...prev,
        isActive: false,
        showChecklist: true // Show checklist after tutorial completion
      }));
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const value = {
    user,
    tutorialState,
    startTutorial,
    completeTutorial,
    dismissTutorialPermanently,
    setTutorialState
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TutorialOverlay />
      <FeatureChecklist />
    </TutorialContext.Provider>
  );
};

const TutorialContext = React.createContext({});

export const useTutorial = () => {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

// Tutorial Overlay Component
const TutorialOverlay = () => {
  const { user, tutorialState, setTutorialState, completeTutorial, dismissTutorialPermanently } = useTutorial();
  const navigate = useNavigate();
  const [currentStepData, setCurrentStepData] = useState(null);

  const steps = user?.role ? TUTORIAL_STEPS[user.role] || [] : [];

  useEffect(() => {
    if (tutorialState.isActive && steps.length > 0) {
      setCurrentStepData(steps[tutorialState.currentStep]);
    }
  }, [tutorialState.isActive, tutorialState.currentStep, steps]);

  const nextStep = () => {
    if (tutorialState.currentStep < steps.length - 1) {
      setTutorialState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (tutorialState.currentStep > 0) {
      setTutorialState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  };

  // If tutorial is not active, no current step data, or permanently dismissed, don't render.
  if (!tutorialState.isActive || !currentStepData || tutorialState.isDismissedPermanently) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      
      {/* Tutorial Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
      >
        <Card className="w-96 max-w-[90vw] bg-white shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {tutorialState.currentStep + 1} / {steps.length}
                </Badge>
                {/* Close button now triggers permanent dismissal */}
                <Button variant="ghost" size="sm" onClick={dismissTutorialPermanently}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Progress value={((tutorialState.currentStep + 1) / steps.length) * 100} className="h-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{currentStepData.description}</p>
            
            {currentStepData.points && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Star className="w-4 h-4" />
                <span>+{currentStepData.points} points</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {/* Button to permanently dismiss the tutorial */}
              <Button
                variant="ghost"
                onClick={dismissTutorialPermanently}
                className="text-gray-500 text-sm"
              >
                Don't show again
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={tutorialState.currentStep === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={() => {
                    if (currentStepData.navigationUrl) {
                      navigate(createPageUrl(currentStepData.navigationUrl));
                    }
                    nextStep();
                  }}
                  className="gap-2"
                  style={{backgroundColor: 'var(--teachmo-sage)'}}
                >
                  {currentStepData.navigationUrl ? 'Take Me There' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Feature Checklist Component
const FeatureChecklist = () => {
  const { user, tutorialState, setTutorialState, dismissTutorialPermanently } = useTutorial();
  const navigate = useNavigate();
  const [checklistProgress, setChecklistProgress] = useState([]);

  const checklist = user?.role ? FEATURE_CHECKLIST[user.role] || [] : [];

  useEffect(() => {
    if (user?.tutorial_progress?.checklistProgress) {
      setChecklistProgress(user.tutorial_progress.checklistProgress);
    }
  }, [user]);

  const markCompleted = async (itemId) => {
    try {
      const newProgress = [...checklistProgress, itemId];
      const tutorialData = {
        ...(user.tutorial_progress || {}),
        checklistProgress: newProgress
      };

      const completedItem = checklist.find(item => item.id === itemId);
      const pointsEarned = completedItem?.points || 0;

      await User.updateMyUserData({
        tutorial_progress: tutorialData,
        points: (user.points || 0) + pointsEarned
      });

      setChecklistProgress(newProgress);
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const completedCount = checklistProgress.length;
  const totalPoints = checklist
    .filter(item => checklistProgress.includes(item.id))
    .reduce((sum, item) => sum + item.points, 0);

  // If checklist is not set to show or permanently dismissed, don't render.
  if (!tutorialState.showChecklist || tutorialState.isDismissedPermanently) return null;

  return (
    <Dialog open={tutorialState.showChecklist} onOpenChange={(open) => {
      // If dialog is being closed by user (not by dismissTutorialPermanently which sets showChecklist to false explicitly)
      if (!open) {
        setTutorialState(prev => ({ ...prev, showChecklist: false }));
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Feature Discovery Checklist
            </DialogTitle>
            {/* Button to permanently dismiss the checklist */}
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissTutorialPermanently}
              className="text-gray-500"
            >
              Don't show again
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Your Progress</h3>
              <div className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-green-500" />
                <span className="font-medium">{totalPoints} points earned</span>
              </div>
            </div>
            <Progress value={(completedCount / checklist.length) * 100} className="h-2" />
            <p className="text-sm text-gray-600 mt-2">
              {completedCount} of {checklist.length} features discovered
            </p>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {checklist.map((item) => {
              const isCompleted = checklistProgress.includes(item.id);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 transition-all ${
                    isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => !isCompleted && markCompleted(item.id)}
                      className="mt-1 text-green-500 hover:text-green-600 transition-colors"
                      disabled={isCompleted}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${isCompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                          {item.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          +{item.points}
                        </Badge>
                        {item.estimatedTime && (
                          <Badge variant="secondary" className="text-xs">
                            {item.estimatedTime}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {item.description}
                      </p>
                      
                      {!isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigate(createPageUrl(item.checkUrl));
                            setTutorialState(prev => ({ ...prev, showChecklist: false }));
                          }}
                          className="gap-2"
                        >
                          <Play className="w-3 h-3" />
                          Try Now
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Completion Reward */}
          {completedCount === checklist.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6 text-center"
            >
              <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-yellow-800 mb-2">
                Congratulations! 🎉
              </h3>
              <p className="text-yellow-700 mb-4">
                You've discovered all the key features! You're now a Teachmo expert.
              </p>
              <Badge className="bg-yellow-500 text-white px-4 py-2">
                Feature Explorer Badge Earned
              </Badge>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Tutorial Trigger Component (for manual tutorial start)
export const TutorialTrigger = ({ children }) => {
  const { startTutorial } = useTutorial();
  
  return (
    <div onClick={startTutorial}>
      {children}
    </div>
  );
};
