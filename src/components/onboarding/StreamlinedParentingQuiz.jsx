import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "When your child misbehaves, you typically:",
    options: [
      { value: "gentle", label: "Talk through it calmly and find the root cause", style: "gentle" },
      { value: "authoritative", label: "Set clear boundaries with consistent consequences", style: "authoritative" },
      { value: "positive", label: "Redirect to positive behavior and praise good choices", style: "positive" },
      { value: "balanced", label: "Adapt your approach based on the situation", style: "balanced" }
    ]
  },
  {
    id: 2,
    question: "Your ideal learning environment for your child is:",
    options: [
      { value: "montessori", label: "Child-led exploration with hands-on materials", style: "montessori" },
      { value: "authoritative", label: "Structured activities with clear learning goals", style: "authoritative" },
      { value: "attachment", label: "Relationship-focused with emotional connection", style: "attachment" },
      { value: "balanced", label: "Mix of structure and free exploration", style: "balanced" }
    ]
  },
  {
    id: 3,
    question: "When planning family activities, you prioritize:",
    options: [
      { value: "attachment", label: "Bonding time and emotional connection", style: "attachment" },
      { value: "positive", label: "Fun experiences that build confidence", style: "positive" },
      { value: "authoritative", label: "Educational value and skill development", style: "authoritative" },
      { value: "balanced", label: "A good mix of fun and learning", style: "balanced" }
    ]
  }
];

const PARENTING_STYLES = {
  gentle: {
    name: "Gentle Parenting",
    description: "Empathetic, collaborative approach focused on understanding and guiding rather than controlling."
  },
  authoritative: {
    name: "Authoritative Parenting", 
    description: "Balanced approach with clear expectations, consistent boundaries, and warm responsiveness."
  },
  positive: {
    name: "Positive Parenting",
    description: "Strength-based approach focusing on encouragement, natural consequences, and building self-esteem."
  },
  attachment: {
    name: "Attachment Parenting",
    description: "Relationship-centered approach prioritizing emotional connection and responsive caregiving."
  },
  montessori: {
    name: "Montessori-Inspired",
    description: "Child-led learning with respect for natural development and hands-on exploration."
  },
  balanced: {
    name: "Balanced Approach",
    description: "Flexible parenting style that adapts to your child's needs and different situations."
  }
};

export default function StreamlinedParentingQuiz({ onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Calculate dominant parenting style
    const styleCount = {};
    Object.values(answers).forEach(answer => {
      styleCount[answer.style] = (styleCount[answer.style] || 0) + 1;
    });
    
    const dominantStyle = Object.entries(styleCount)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    const parentingData = {
      parenting_style: dominantStyle,
      parenting_philosophy: PARENTING_STYLES[dominantStyle].description,
      parenting_quiz_progress: null // Clear progress since completed
    };
    
    await onComplete(parentingData);
    setIsSubmitting(false);
  };

  const question = QUIZ_QUESTIONS[currentQuestion];
  const currentAnswer = answers[question.id];
  const canProceed = currentAnswer !== undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}</span>
          <span>{Math.round(((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300" 
            style={{
              width: `${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%`,
              backgroundColor: 'var(--teachmo-sage)'
            }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-gray-100">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {question.question}
              </h3>
              
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <button
                      onClick={() => handleAnswer(question.id, option)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        currentAnswer?.value === option.value
                          ? 'border-sage-400 bg-sage-50 text-sage-800'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        {currentAnswer?.value === option.value && (
                          <CheckCircle className="w-5 h-5 text-sage-600" />
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-6">
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={currentQuestion === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed || isSubmitting}
          className="flex items-center gap-2"
          style={{backgroundColor: 'var(--teachmo-sage)'}}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analyzing...
            </>
          ) : currentQuestion === QUIZ_QUESTIONS.length - 1 ? (
            <>
              Complete Quiz
              <CheckCircle className="w-4 h-4" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}