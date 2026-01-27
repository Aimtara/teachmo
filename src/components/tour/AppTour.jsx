import React, { useContext, useState } from 'react';
import { ShepherdTour, ShepherdTourContext } from 'react-shepherd';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/api/entities';
import { X, ArrowRight, Zap, Check, SkipForward } from 'lucide-react';
import 'shepherd.js/dist/css/shepherd.css';
import { useToast } from "@/components/ui/use-toast";

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true,
    },
    classes: 'shadow-lg bg-white p-4 rounded-lg',
    scrollTo: { behavior: 'smooth', block: 'center' },
  },
  useModalOverlay: true,
};

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to Teachmo!',
    text: 'Let\'s take a quick tour to show you how to get the most out of the platform.',
    attachTo: { element: '[data-tour="main-header"]', on: 'bottom' },
    buttons: [{ action() { return this.next(); }, text: 'Start Tour' }],
  },
  {
    id: 'dashboard-overview',
    title: 'Your Dashboard',
    text: 'This is your mission control. Find daily tips, suggested activities, and a quick overview of your family\'s progress.',
    attachTo: { element: '[data-tour="dashboard-welcome"]', on: 'bottom' },
    buttons: [{ action() { return this.back(); }, text: 'Back' }, { action() { return this.next(); }, text: 'Next' }],
  },
  {
    id: 'mood-checkin',
    title: 'Emotional Check-in',
    text: 'Let us know how you\'re feeling. This helps us tailor suggestions and support for your day.',
    attachTo: { element: '[data-tour="mood-checkin"]', on: 'bottom' },
    buttons: [{ action() { return this.back(); }, text: 'Back' }, { action() { return this.next(); }, text: 'Next' }],
  },
  {
    id: 'discover-activities',
    title: 'Find Activities',
    text: 'Use the "Activities" tab to discover fun, educational things to do with your children, personalized just for them.',
    attachTo: { element: '[data-tour-nav="UnifiedDiscover"]', on: 'right' },
    buttons: [{ action() { return this.back(); }, text: 'Back' }, { action() { return this.next(); }, text: 'Next' }],
  },
  {
    id: 'ai-coach',
    title: 'Your AI Coach',
    text: 'Have a parenting question? Ask our AI Coach for evidence-based advice, available 24/7.',
    attachTo: { element: '[data-tour-nav="AIAssistant"]', on: 'right' },
    buttons: [{ action() { return this.back(); }, text: 'Back' }, { action() { return this.next(); }, text: 'Next' }],
  },
  {
    id: 'finish',
    title: 'You\'re All Set!',
    text: 'You\'re ready to explore. Remember, you can restart this tour anytime from the Settings page.',
    buttons: [{ action() { return this.back(); }, text: 'Back' }, { action() { return this.complete(); }, text: 'Finish' }],
  },
];

const TourInstance = () => {
  const tour = useContext(ShepherdTourContext);
  return null; 
};

export default function AppTour({ user, onTourComplete }) {
  const [showTourPrompt, setShowTourPrompt] = useState(true);
  const [isDismissed, setIsDismissed] = useState(user?.tutorial_progress?.isDismissed || false);
  const { toast } = useToast();

  const tour = useContext(ShepherdTourContext);

  const startTour = () => {
    setShowTourPrompt(false);
    if (tour) {
      tour.start();
    }
  };

  const handlePermanentDismiss = async () => {
    setShowTourPrompt(false);
    setIsDismissed(true);
    try {
      const currentProgress = user.tutorial_progress || {};
      await User.updateMyUserData({
        tutorial_progress: {
          ...currentProgress,
          isDismissed: true,
        },
      });
      toast({
        title: "Tour Dismissed",
        description: "You can restart the tour anytime from your settings.",
      });
    } catch (error) {
      console.error("Failed to dismiss tour:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save your preference. Please try again.",
      });
    }
  };

  const handleSkipForNow = () => {
    setShowTourPrompt(false);
  };
  
  if (!user || user.tutorial_progress?.hasSeenTutorial || isDismissed) {
    return null;
  }
  
  return (
    <ShepherdTour steps={steps} tourOptions={tourOptions}>
      <TourInstance />

      <AnimatePresence>
        {showTourPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Welcome to Teachmo!</h3>
                  <p className="text-gray-600 mt-1 mb-4">
                    Ready for a quick tour to see how everything works?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={startTour}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Start Guided Tour
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSkipForNow}
                    >
                      Skip for now
                    </Button>
                  </div>
                   <div className="text-center mt-3">
                    <Button
                      variant="link"
                      className="text-gray-500 h-auto p-1 text-xs"
                      onClick={handlePermanentDismiss}
                    >
                      <X className="w-3 h-3 mr-1"/>
                      Don't show this again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ShepherdTour>
  );
}

export { AppTour };
