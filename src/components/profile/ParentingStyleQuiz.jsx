import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Heart, X, Save, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "When your child misbehaves, what's your first instinct?",
    options: [
      { id: 'a', text: "Talk to them about why their behavior was wrong", style: 'authoritative' },
      { id: 'b', text: "Give them time to calm down, then discuss feelings", style: 'gentle' },
      { id: 'c', text: "Redirect to positive behavior with encouragement", style: 'positive' },
      { id: 'd', text: "Stay close and help them process their emotions", style: 'attachment' }
    ]
  },
  {
    id: 2,
    question: "How do you prefer to teach your child new skills?",
    options: [
      { id: 'a', text: "Set clear expectations and guide them step by step", style: 'authoritative' },
      { id: 'b', text: "Let them explore and learn from natural consequences", style: 'gentle' },
      { id: 'c', text: "Celebrate small wins and focus on effort over outcome", style: 'positive' },
      { id: 'd', text: "Follow their interests and provide rich environments", style: 'montessori' }
    ]
  },
  {
    id: 3,
    question: "What's most important for your child's development?",
    options: [
      { id: 'a', text: "Learning self-discipline and responsibility", style: 'authoritative' },
      { id: 'b', text: "Developing emotional intelligence and empathy", style: 'gentle' },
      { id: 'c', text: "Building confidence and self-esteem", style: 'positive' },
      { id: 'd', text: "Forming secure, trusting relationships", style: 'attachment' }
    ]
  },
  {
    id: 4,
    question: "How do you handle your child's big emotions?",
    options: [
      { id: 'a', text: "Acknowledge feelings but maintain boundaries", style: 'authoritative' },
      { id: 'b', text: "Validate their emotions and teach coping strategies", style: 'gentle' },
      { id: 'c', text: "Help them see the positive and reframe situations", style: 'positive' },
      { id: 'd', text: "Provide comfort and stay physically close", style: 'attachment' }
    ]
  },
  {
    id: 5,
    question: "What's your philosophy on independence?",
    options: [
      { id: 'a', text: "Kids need structure first, then gradual independence", style: 'authoritative' },
      { id: 'b', text: "Independence comes naturally when children feel safe", style: 'gentle' },
      { id: 'c', text: "Encourage independence by praising attempts", style: 'positive' },
      { id: 'd', text: "Independence develops from a secure base of attachment", style: 'attachment' }
    ]
  }
];

const STYLE_DESCRIPTIONS = {
  authoritative: {
    name: "Authoritative",
    description: "You believe in balanced parenting with clear expectations and emotional warmth. You set boundaries while being responsive to your child's needs.",
    traits: ["Clear expectations", "Emotional support", "Consistent boundaries", "Reasoning with child"]
  },
  gentle: {
    name: "Gentle Parenting",
    description: "You focus on understanding your child's perspective and teaching through empathy rather than punishment. You prioritize emotional connection.",
    traits: ["Empathy-focused", "Natural consequences", "Emotional validation", "Collaborative problem-solving"]
  },
  positive: {
    name: "Positive Parenting",
    description: "You emphasize encouragement and positive reinforcement. You believe in building your child's confidence through celebrating their efforts.",
    traits: ["Positive reinforcement", "Growth mindset", "Celebration of effort", "Optimistic outlook"]
  },
  attachment: {
    name: "Attachment Parenting",
    description: "You prioritize building a strong emotional bond with your child. You believe security comes from consistent, responsive caregiving.",
    traits: ["Strong bonding", "Responsive caregiving", "Physical closeness", "Trust-building"]
  },
  montessori: {
    name: "Montessori-Inspired",
    description: "You believe in following your child's natural development and providing prepared environments that encourage independence and exploration.",
    traits: ["Child-led learning", "Prepared environment", "Natural development", "Independence focus"]
  }
};

export default function ParentingStyleQuiz({ onComplete, onClose, user, savedProgress = null }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (savedProgress) {
        setCurrentQuestion(savedProgress.currentQuestion || 0);
        setAnswers(savedProgress.answers || {});
    }
    setIsMounted(true);
  }, [savedProgress]);


  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const handleAnswer = (questionId, styleId) => {
    setAnswers(prev => ({ ...prev, [questionId]: styleId }));
  };

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSaveForLater = async () => {
    try {
      const progressData = {
        parenting_quiz_progress: {
          currentQuestion,
          answers,
          savedAt: new Date().toISOString()
        }
      };
      
      await onComplete({ saveOnly: true, progress: progressData });
      setShowSaveConfirm(true);
      
      // Auto-close after showing confirmation
      setTimeout(() => {
        // onClose is called via onComplete in the parent
      }, 2000);
    } catch (error) {
      console.error("Failed to save quiz progress:", error);
    }
  };

  const handleExit = () => {
    if (Object.keys(answers).length > 0 && !showResults) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  const calculateResults = () => {
    const styleCount = {};
    
    Object.values(answers).forEach(style => {
      styleCount[style] = (styleCount[style] || 0) + 1;
    });

    const primaryStyle = Object.keys(styleCount).reduce((a, b) =>
      styleCount[a] > styleCount[b] ? a : b
    );

    const styleInfo = STYLE_DESCRIPTIONS[primaryStyle];
    
    setResults({
      primaryStyle,
      ...styleInfo,
      scores: styleCount
    });
    setShowResults(true);
  };

  const handleComplete = () => {
    onComplete({ 
      saveOnly: false, 
      results,
      parenting_style: results.primaryStyle,
      parenting_philosophy: results.description 
    });
  };

  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;
  const currentQ = QUIZ_QUESTIONS[currentQuestion];
  const hasAnswered = answers[currentQ?.id];

  if (!isMounted) return null;

  return (
    <>
      <Dialog open onOpenChange={(isOpen) => !isOpen && handleExit()} className="max-w-2xl">
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3" style={{color: 'var(--teachmo-sage)'}}>
              <Heart className="w-6 h-6" />
              {showResults ? "Your Parenting Style" : "Parenting Style Quiz"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExit}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!showResults ? (
              <>
                {/* Progress and Save Options */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}</span>
                    <div className="flex items-center gap-2">
                      <span>{Math.round(progress)}% complete</span>
                      {Object.keys(answers).length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleSaveForLater}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save for later
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Saved Progress Notice */}
                {savedProgress && Object.keys(answers).length > 0 && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Welcome back! We've restored your progress from where you left off.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save Confirmation */}
                <AnimatePresence>
                  {showSaveConfirm && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800 flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          Progress saved! You can continue this quiz anytime from your profile.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Question Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentQ?.question}
                    </h3>

                    <div className="space-y-3">
                      {currentQ?.options.map((option) => (
                        <Card 
                          key={option.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            answers[currentQ.id] === option.style 
                              ? 'ring-2 ring-sage-500 bg-sage-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleAnswer(currentQ.id, option.style)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                answers[currentQ.id] === option.style 
                                  ? 'bg-sage-500 border-sage-500' 
                                  : 'border-gray-300'
                              }`}>
                                {answers[currentQ.id] === option.style && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                              <p className="text-gray-800">{option.text}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!hasAnswered}
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    {currentQuestion === QUIZ_QUESTIONS.length - 1 ? "See Results" : "Next"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {results?.name}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    {results?.description}
                  </p>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Your Key Strengths:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {results?.traits.map((trait, index) => (
                        <div key={index} className="flex items-center gap-2 text-blue-800">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-sm">{trait}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleExit} className="flex-1">
                    Done
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    className="flex-1"
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    Save My Style
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You've answered {Object.keys(answers).length} out of {QUIZ_QUESTIONS.length} questions. 
              Would you like to save your progress for later or exit without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              Continue Quiz
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handleSaveForLater}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save for Later
            </Button>
            <AlertDialogAction 
              onClick={confirmExit}
              className="bg-red-600 hover:bg-red-700"
            >
              Exit Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}