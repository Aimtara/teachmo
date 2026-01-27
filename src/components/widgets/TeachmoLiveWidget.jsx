import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wand2,
  Loader2,
  MessageSquareQuote,
  CheckSquare,
  Heart,
  Send,
  Sparkles,
  RotateCcw,
  Share2,
  BookmarkPlus,
  Volume2,
  VolumeX
} from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWarmOpener, FALLBACK_RESPONSES } from '../shared/TeachmoTone';
import { User } from '@/api/entities';
import { Activity } from '@/api/entities';
import WidgetContainer from './WidgetContainer';
import { useToast } from '@/components/ui/use-toast';

export default function TeachmoLiveWidget({
  isVisible,
  size = "compact"
}) {
  const { toast } = useToast();
  const [situation, setSituation] = useState('');
  const [teachableMoment, setTeachableMoment] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showDistressHelp, setShowDistressHelp] = useState(false);
  const [user, setUser] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const textareaRef = useRef(null);
  const conversationRef = useRef(null);

  useEffect(() => {
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

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationHistory, teachableMoment]);

  const detectDistressKeywords = (text) => {
    const distressWords = [
      'stressed',
      'overwhelmed',
      'exhausted',
      "can't handle",
      'breaking down',
      'losing it',
      "at my wit's end",
    ];
    return distressWords.some(word => text.toLowerCase().includes(word));
  };

  const speakText = (text) => {
    if (!soundEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleGenerate = async () => {
    if (!situation.trim()) return;
    
    // Add user message to conversation
    const userMessage = {
      type: 'user',
      content: situation,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, userMessage]);
    
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
      
      // Add AI response to conversation
      const aiMessage = {
        type: 'ai',
        content: response,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev, aiMessage]);
      
      // Speak the empathy acknowledgment
      if (response.empathy_acknowledgment) {
        speakText(response.empathy_acknowledgment);
      }
      
    } catch (e) {
      console.error("Error generating teachable moment:", e);
      const fallbackResponse = FALLBACK_RESPONSES.technical_error[Math.floor(Math.random() * FALLBACK_RESPONSES.technical_error.length)];
      setError(fallbackResponse);
    }
    
    setSituation('');
    setIsGenerating(false);
  };

  const handleDistressSupport = () => {
    setShowDistressHelp(false);
    const supportResponse = {
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
    };
    
    setTeachableMoment(supportResponse);
    
    // Add support message to conversation
    const supportMessage = {
      type: 'ai',
      content: supportResponse,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, supportMessage]);
    
    speakText(supportResponse.empathy_acknowledgment);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const saveAsActivity = async () => {
    if (!teachableMoment || !user) return;
    
    try {
      await Activity.create({
        title: teachableMoment.title,
        description: teachableMoment.what_to_do.join('. '),
        category: 'emotional',
        duration: '10-15 minutes',
        why_it_matters: teachableMoment.why_it_works,
        teachmo_tip: teachableMoment.encouragement,
        instructions: teachableMoment.what_to_do,
        learning_objectives: [teachableMoment.learning_goal],
        status: 'planned',
        is_personalized: true
      });
      
      // Show success feedback
      toast({
        title: 'Activity saved',
        description: 'Added to your activities successfully!'
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving activity',
        description: 'Could not save to activities. Please try again.'
      });
    }
  };

  const shareResponse = () => {
    if (!teachableMoment) return;
    
    const shareText = `Got great parenting advice from Teachmo!\n\n${teachableMoment.title}\n\n${teachableMoment.empathy_acknowledgment}\n\nKey insight: ${teachableMoment.why_it_works}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Teachmo Parenting Advice',
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied to clipboard',
        description: 'Share text has been copied successfully.'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <WidgetContainer
      title="Teachmo Live"
      icon={Wand2}
      size={size}
      className="bottom-16 right-4"
      defaultMinimized={true}
      showSettings={false}
    >
      <div className="space-y-3">
        {/* Quick Status - more compact */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs px-2 py-1">
            <Heart className="w-3 h-3 mr-1" />
            {user?.current_mood || 'Ready'}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-5 w-5"
            >
              {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </Button>
            {isSpeaking && (
              <Button
                variant="ghost"
                size="icon"
                onClick={stopSpeaking}
                className="h-5 w-5"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Conversation History - more compact */}
        {conversationHistory.length > 0 && (
          <div 
            ref={conversationRef}
            className="max-h-32 overflow-y-auto space-y-1 p-2 bg-gray-50 rounded text-xs"
          >
            {conversationHistory.slice(-2).map((message, index) => (
              <div
                key={index}
                className={`p-1.5 rounded text-xs ${
                  message.type === 'user' 
                    ? 'bg-blue-100 text-blue-800 ml-2' 
                    : 'bg-white text-gray-700 mr-2'
                }`}
              >
                {message.type === 'user' ? (
                  <p className="truncate">{message.content}</p>
                ) : (
                  <div>
                    <p className="font-medium truncate">{message.content.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Area - more compact */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            placeholder="What's happening right now?"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            className="text-xs resize-none"
            disabled={isGenerating}
          />
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !situation.trim()} 
            className="w-full h-8 text-xs"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                Get Help
              </>
            )}
          </Button>
        </div>

        {/* Distress Support Modal - more compact */}
        <AnimatePresence>
          {showDistressHelp && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-2 bg-blue-50 rounded border-l-4 border-blue-400"
            >
              <div className="flex items-start gap-2">
                <Heart className="w-3 h-3 text-blue-600 mt-1 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-blue-900 text-xs">Taking care of you first 💙</h4>
                  <p className="text-blue-800 text-xs">
                    {"Let's start with some support for you."}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleDistressSupport} className="bg-blue-600 text-xs h-6">
                      Ready
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDistressHelp(false)} className="text-xs h-6">
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response Display - more compact */}
        <AnimatePresence>
          {teachableMoment && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2 pt-2 border-t border-gray-200"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-900 truncate">{teachableMoment.title}</h3>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveAsActivity}
                    className="h-5 w-5"
                    title="Save as activity"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={shareResponse}
                    className="h-5 w-5"
                    title="Share response"
                  >
                    <Share2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {teachableMoment.empathy_acknowledgment && (
                <div className="p-2 bg-purple-50 rounded border-l-2 border-purple-400">
                  <p className="text-purple-800 text-xs font-medium">{teachableMoment.empathy_acknowledgment}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="p-2 bg-green-50 rounded">
                  <h4 className="font-semibold text-green-800 text-xs flex items-center gap-1 mb-1">
                    <MessageSquareQuote className="w-3 h-3"/>
                    What to Say
                  </h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    {teachableMoment.what_to_say.slice(0, 1).map((item, i) => (
                      <li key={i} className="text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-2 bg-yellow-50 rounded">
                  <h4 className="font-semibold text-yellow-800 text-xs flex items-center gap-1 mb-1">
                    <CheckSquare className="w-3 h-3"/>
                    What to Do
                  </h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {teachableMoment.what_to_do.slice(0, 1).map((item, i) => (
                      <li key={i} className="text-xs">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {teachableMoment.encouragement && (
                <div className="p-2 bg-green-100 rounded border-l-2 border-green-500">
                  <p className="text-green-800 text-xs font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {teachableMoment.encouragement}
                  </p>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTeachableMoment(null)}
                className="w-full text-xs h-6"
              >
                New Question
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {error && (
          <div className="p-2 bg-orange-50 rounded border-l-2 border-orange-400">
            <p className="text-orange-800 text-xs">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setError(null)} 
              className="mt-1 text-xs h-6"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

TeachmoLiveWidget.propTypes = {
  isVisible: PropTypes.bool,
  size: PropTypes.oneOf(['compact', 'default', 'large']),
};
