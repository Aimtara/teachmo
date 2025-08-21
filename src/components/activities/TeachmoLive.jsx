import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, MessageSquareQuote, CheckSquare, Target, Lightbulb, Heart } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWarmOpener, getAdaptiveResponse, FALLBACK_RESPONSES, DISTRESS_RESPONSES } from '../shared/TeachmoTone';
import { User } from '@/api/entities';

export default function TeachmoLive() {
  const [situation, setSituation] = useState('');
  const [teachableMoment, setTeachableMoment] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showDistressHelp, setShowDistressHelp] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Could not fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const detectDistressKeywords = (text) => {
    const distressWords = ['stressed', 'overwhelmed', 'exhausted', 'can\'t handle', 'breaking down', 'losing it', 'at my wit\'s end'];
    return distressWords.some(word => text.toLowerCase().includes(word));
  };

  const handleGenerate = async () => {
    if (!situation) return;
    
    // Check for distress indicators
    if (detectDistressKeywords(situation)) {
      setShowDistressHelp(true);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setTeachableMoment(null);

    try {
      const warmOpener = generateWarmOpener('general', user?.current_mood);
      
      const response = await InvokeLLM({
        prompt: `${warmOpener} You're Teachmo, a warm, professional, and empowering AI parenting coach. A parent needs immediate, actionable advice for their current situation.

        TEACHMO'S TONE GUIDELINES:
        - Start responses warmly but professionally
        - Be concise and actionable (never preachy)
        - Use empowering language like "You've got this!" and "Trust your instincts"
        - Adapt tone based on situation complexity
        - Always acknowledge the parent's feelings first

        Parent's situation: "${situation}"

        Create a supportive "teachable moment" response that:
        1. Acknowledges their situation with empathy
        2. Provides immediate, practical steps
        3. Includes empowering language
        4. Explains briefly why the approach works
        5. Ends with encouragement

        Format as JSON with specific fields for title, learning_goal, what_to_say, what_to_do, and why_it_works.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            empathy_acknowledgment: { type: "string" },
            learning_goal: { type: "string" },
            what_to_say: { type: "array", items: { type: "string" } },
            what_to_do: { type: "array", items: { type: "string" } },
            why_it_works: { type: "string" },
            encouragement: { type: "string" }
          },
          required: ["title", "empathy_acknowledgment", "learning_goal", "what_to_say", "what_to_do", "why_it_works", "encouragement"],
        },
      });
      setTeachableMoment(response);
    } catch (e) {
      console.error("Error generating teachable moment:", e);
      const fallbackResponse = FALLBACK_RESPONSES.technical_error[Math.floor(Math.random() * FALLBACK_RESPONSES.technical_error.length)];
      setError(fallbackResponse);
    }
    setIsGenerating(false);
  };

  const handleDistressSupport = () => {
    setShowDistressHelp(false);
    // Automatically generate a calming response
    setTeachableMoment({
      title: "Taking a Moment for You 💙",
      empathy_acknowledgment: "I can hear how hard this is for you right now, and that takes real courage to share.",
      learning_goal: "Self-care and emotional regulation",
      what_to_say: [
        "It's okay to feel overwhelmed - you're human",
        "Taking a break doesn't make you a bad parent",
        "You're doing better than you think you are"
      ],
      what_to_do: [
        "Take 3 deep breaths with me right now",
        "Step outside or look out a window for 30 seconds",
        "Remind yourself: 'This feeling will pass, and I am capable'"
      ],
      why_it_works: "When we're overwhelmed, our nervous system needs a reset. Simple breathing and grounding techniques help us move from reactive to responsive mode.",
      encouragement: "You've got this, even when it doesn't feel like it. Every parent has been exactly where you are. 🤗"
    });
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm mb-8 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Wand2 />
          Teachmo Live
        </CardTitle>
        <CardDescription className="text-blue-100 mt-2">
          {generateWarmOpener('general', user?.current_mood)} Get an on-the-spot teachable moment for any situation.
        </CardDescription>
      </div>
      
      <CardContent className="p-6 space-y-4">
        <Textarea
          placeholder="What's happening right now? e.g., 'My 5-year-old is having a meltdown because I said no to candy before dinner.'"
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={3}
          className="bg-white"
        />
        
        <Button onClick={handleGenerate} disabled={isGenerating || !situation} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating your teachable moment...
            </>
          ) : (
            'Get Teachable Moment'
          )}
        </Button>

        {/* Distress Support Modal */}
        <AnimatePresence>
          {showDistressHelp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-400"
            >
              <div className="flex items-start gap-3">
                <Heart className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">I can sense you're having a really tough moment 💙</h4>
                  <p className="text-blue-800 text-sm mb-4">
                    Before we tackle the situation, let's take care of you first. You're doing an incredible job, even when it doesn't feel like it.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDistressSupport} className="bg-blue-600">
                      I'm ready for support
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDistressHelp(false)}>
                      Continue anyway
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {teachableMoment && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 space-y-4 pt-6 border-t border-gray-200"
            >
              <h3 className="font-bold text-xl text-gray-900">{teachableMoment.title}</h3>
              
              {teachableMoment.empathy_acknowledgment && (
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                  <p className="text-purple-800 font-medium">{teachableMoment.empathy_acknowledgment}</p>
                </div>
              )}
              
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-semibold text-indigo-800 flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4"/>Learning Goal
                </h4>
                <p className="text-indigo-700">{teachableMoment.learning_goal}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                    <MessageSquareQuote className="w-4 h-4"/>What to Say
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-green-700">
                    {teachableMoment.what_to_say.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4"/>What to Do
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    {teachableMoment.what_to_do.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
              
              <div className="p-3 bg-gray-100 rounded-lg">
                 <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-1">
                   <Lightbulb className="w-4 h-4"/>Why It Works
                 </h4>
                 <p className="text-sm text-gray-600">{teachableMoment.why_it_works}</p>
              </div>

              {teachableMoment.encouragement && (
                <div className="p-4 bg-green-100 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    {teachableMoment.encouragement}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {error && (
          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
            <p className="text-orange-800">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setError(null)} 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
