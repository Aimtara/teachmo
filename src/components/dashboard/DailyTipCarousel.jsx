
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lightbulb, ChevronLeft, ChevronRight, CheckSquare, MessageCircle, Info, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DailyTipCarousel({ tips, children, isLoading }) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const scrollPrev = () => {
    setCurrentTipIndex(prev => prev > 0 ? prev - 1 : tips.length - 1);
  };

  const scrollNext = () => {
    setCurrentTipIndex(prev => prev < tips.length - 1 ? prev + 1 : 0);
  };

  const getChildForTip = (tip) => {
    if (!tip.child_id || !children || children.length === 0) return null;
    return children.find(c => c.id === tip.child_id);
  };

  if (isLoading) {
    return (
      <div className="relative w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: 'var(--teachmo-sage)'}}></div>
        <p className="text-gray-600">Generating your personalized tips for today...</p>
      </div>
    );
  }

  if (!tips || tips.length === 0) {
    return (
      <div className="relative w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No tips available today.</p>
      </div>
    );
  }

  const currentTip = tips[currentTipIndex];
  const child = getChildForTip(currentTip);

  return (
    <div className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTipIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="p-6 md:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {child && (
                <div 
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
                >
                  {child.avatar || child.name[0]}
                </div>
              )}
              <div>
                {child && <p className="font-bold text-gray-800">{child.name}'s Daily Tip</p>}
                <Badge className="text-xs" style={{backgroundColor: 'var(--teachmo-sage-light)', color: 'var(--teachmo-sage)'}}>
                  {currentTip.category}
                </Badge>
              </div>
            </div>
            
            {/* Tip counter */}
            {tips.length > 1 && (
              <div className="text-sm text-gray-500">
                {currentTipIndex + 1} of {tips.length}
              </div>
            )}
          </div>
          
          {/* Main content */}
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{currentTip.title}</h3>
          {currentTip.summary && <p className="text-gray-600 mb-4 text-sm md:text-base">{currentTip.summary}</p>}
          
          {/* Expandable sections */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Why & How to Apply This
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {currentTip.why_it_matters && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4" /> Why It Matters
                    </h4>
                    <p className="text-sm text-gray-600">{currentTip.why_it_matters}</p>
                  </div>
                )}
                
                {currentTip.action_steps && currentTip.action_steps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                      <CheckSquare className="w-4 h-4" /> Action Steps
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {currentTip.action_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {currentTip.conversation_starter && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4" /> Conversation Starter
                    </h4>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 italic">"{currentTip.conversation_starter}"</p>
                    </div>
                  </div>
                )}
                
                {currentTip.time_required && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" /> Time Needed
                    </h4>
                    <p className="text-sm text-gray-600">{currentTip.time_required}</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {tips.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-md z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-md z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Dot indicators */}
      {tips.length > 1 && (
        <div className="flex justify-center space-x-2 pb-4">
          {tips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentTipIndex 
                  ? 'bg-sage-500' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              style={{
                backgroundColor: index === currentTipIndex ? 'var(--teachmo-sage)' : undefined
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
