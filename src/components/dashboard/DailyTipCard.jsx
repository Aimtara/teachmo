
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Target, CheckCircle, Loader2, BrainCircuit, ListChecks, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { ParentingTip } from "@/api/entities";

const categoryColors = {
  communication: "bg-blue-100 text-blue-800",
  discipline: "bg-red-100 text-red-800", 
  development: "bg-green-100 text-green-800",
  education: "bg-purple-100 text-purple-800",
  health: "bg-pink-100 text-pink-800",
  creativity: "bg-orange-100 text-orange-800",
  social_skills: "bg-cyan-100 text-cyan-800",
  emotional_intelligence: "bg-indigo-100 text-indigo-800",
  independence: "bg-yellow-100 text-yellow-800",
  confidence: "bg-emerald-100 text-emerald-800"
};

const difficultyColors = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  advanced: "bg-red-100 text-red-800"
};

export default function DailyTipCard({ tip, isLoading }) {
  const [isRead, setIsRead] = useState(tip?.is_read || false);

  const markAsRead = async () => {
    if (!tip || isRead) return;
    
    try {
      await ParentingTip.update(tip.id, { is_read: true });
      setIsRead(true);
    } catch (error) {
      console.error("Error marking tip as read:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{color: 'var(--teachmo-sage)'}} />
            Generating your daily tip...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tip) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Add a child profile to get personalized daily tips!</p>
        </CardContent>
      </Card>
    );
  }
  
  // Handle both new structured tips and old single-content tips
  const isStructuredTip = tip.summary && tip.action_steps && Array.isArray(tip.action_steps);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-0 shadow-lg transition-all duration-300 ${isRead ? 'bg-white/60' : 'bg-white/90'} backdrop-blur-sm`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className={`p-2 rounded-lg ${isRead ? 'bg-gray-100' : ''}`} style={!isRead ? {backgroundColor: 'var(--teachmo-sage)', color: 'white'} : {}}>
                <Sparkles className="w-5 h-5" />
              </div>
              Today's Parenting Tip
            </CardTitle>
            {isRead && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-900 mb-2">{tip.title}</h3>
          
          {isStructuredTip ? (
            <div className="space-y-5">
              <p className="text-gray-700 italic leading-relaxed border-l-4 pl-4" style={{borderColor: 'var(--teachmo-sage)'}}>
                {tip.summary}
              </p>

              <div className="space-y-2">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                  Why It Matters
                </div>
                <p className="text-gray-600 text-sm">{tip.why_it_matters}</p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <ListChecks className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                  Action Steps
                </div>
                <ul className="space-y-2 pl-2">
                  {tip.action_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 mt-1 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs" style={{backgroundColor: 'var(--teachmo-blue)'}}>{index + 1}</div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {tip.conversation_starter && (
                <div className="space-y-2 p-3 rounded-lg" style={{backgroundColor: 'var(--teachmo-cream)'}}>
                  <div className="font-semibold text-gray-800 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                    Conversation Starter
                  </div>
                  <p className="text-gray-600 text-sm italic">"{tip.conversation_starter}"</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{tip.content}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 mt-4">
            <Badge className={categoryColors[tip.category] || "bg-gray-100 text-gray-800"}>
              {tip.category?.replace(/_/g, ' ')}
            </Badge>
            {tip.difficulty && (
              <Badge variant="outline" className={difficultyColors[tip.difficulty]}>
                <Target className="w-3 h-3 mr-1" />
                {tip.difficulty}
              </Badge>
            )}
            {tip.time_required && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                {tip.time_required}
              </Badge>
            )}
          </div>

          {!isRead && (
            <div className="pt-2">
              <Button 
                onClick={markAsRead}
                className="w-full font-medium"
                style={{backgroundColor: 'var(--teachmo-sage)'}}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Implemented
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
