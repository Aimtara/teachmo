
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  BookOpen,
  Calendar,
  Users,
  Heart,
  Lightbulb,
  AlertTriangle,
  Bookmark,
  Share2,
  MoreHorizontal,
  X, // New import
  Loader2, // New import
  Search // New import
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { AIConversation } from '@/api/entities';
import { User } from '@/api/entities';
import { invokeAdvancedAI } from '@/api/functions';
import { logAiInteraction } from '@/api/ai/log';
import { resolveAiModel } from '@/api/ai/resolveModel';
import { estimateTokens, scoreHallucinationRisk } from '@/observability/aiSafety';
import { useTenantScope } from '@/hooks/useTenantScope';
import { useTenantFeatureFlags } from '@/hooks/useTenantFeatureFlags';

const MessageTypeIcons = {
  crisis: AlertTriangle,
  developmental: Heart,
  behavioral: Users,
  educational: BookOpen,
  general: Bot
};

export function AdvancedAIAssistant({ onIntent }) {
  const { data: tenantScope } = useTenantScope();
  const featureFlagsQuery = useTenantFeatureFlags();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userMessage, setUserMessage] = useState(''); // Renamed from inputMessage
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState(null);
  const [conversationType, setConversationType] = useState('general');

  const [suggestedActions, setSuggestedActions] = useState([]); // New state
  const [showSuggestions, setShowSuggestions] = useState(true); // New state

  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const synthesis = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadConversations();
    initializeSpeechAPIs();

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (synthesis.current) {
        synthesis.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSpeechAPIs = () => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserMessage(transcript); // Updated
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
        toast({
          variant: "destructive",
          title: "Speech Recognition Error",
          description: "Could not understand speech. Please try again."
        });
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthesis.current = window.speechSynthesis;
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const userConversations = await AIConversation.list('-last_activity', 20);
      setConversations(userConversations);

      if (userConversations.length > 0 && !activeConversation) {
        setActiveConversation(userConversations[0]);
        setMessages(userConversations[0].conversation_history || []);
        setConversationType(userConversations[0].conversation_type || 'general');
        setSuggestedActions(userConversations[0].suggested_actions || []); // Load suggested actions
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startListening = () => {
    if (recognition.current && !isListening) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  const stopListening = () => {
    if (recognition.current && isListening) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text) => {
    if (synthesis.current && !isSpeaking) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthesis.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthesis.current && isSpeaking) {
      synthesis.current.cancel();
      setIsSpeaking(false);
    }
  };

  const detectConversationType = (message) => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('crisis') || lowerMessage.includes('emergency') ||
        lowerMessage.includes('urgent') || lowerMessage.includes('help')) {
      return 'crisis';
    }
    if (lowerMessage.includes('development') || lowerMessage.includes('milestone') ||
        lowerMessage.includes('growth')) {
      return 'developmental';
    }
    if (lowerMessage.includes('behavior') || lowerMessage.includes('discipline') ||
        lowerMessage.includes('tantrum')) {
      return 'behavioral';
    }
    if (lowerMessage.includes('school') || lowerMessage.includes('learning') ||
        lowerMessage.includes('education')) {
      return 'educational';
    }

    return 'general';
  };

  const handleSendMessage = async (query = userMessage) => { // Renamed and added query parameter
    if (!query.trim() || isLoading) return;

    const userMessageObj = { // Renamed from userMessage
      role: 'user',
      content: query.trim(), // Updated
      timestamp: new Date().toISOString(),
      tokens_used: 0,
      model: 'user-input'
    };

    const newMessages = [...messages, userMessageObj];
    setMessages(newMessages);
    setUserMessage(''); // Updated
    setIsLoading(true);
    setSuggestedActions([]); // Clear previous suggestions
    setShowSuggestions(true); // Ensure suggestions are visible if new ones come

    try {
      const startTime = Date.now();
      // Detect conversation type for specialized responses
      const detectedType = detectConversationType(userMessageObj.content);
      if (detectedType !== conversationType) {
        setConversationType(detectedType);
      }

      // Prepare context for AI
      const context = {
        child_ages: user?.children?.map(c => c.age) || [],
        parenting_style: user?.parenting_style || 'balanced',
        conversation_type: detectedType,
        recent_messages: newMessages.slice(-10) // Last 10 messages for context
      };

      const tokenPrompt = estimateTokens(userMessageObj.content);
      const featureFlags = featureFlagsQuery.data ?? {};
      let resolvedModel = { allowed: true, model: 'gpt-4o-mini', reason: 'default' };
      try {
        resolvedModel = await resolveAiModel({
          preferredModel: tokenPrompt > 300 ? 'gpt-4o' : 'gpt-4o-mini',
          estimatedTokens: tokenPrompt,
          featureFlags,
        });
      } catch (error) {
        console.warn('AI model resolution failed, using default model.', error);
      }

      if (!resolvedModel.allowed) {
        toast({
          variant: 'destructive',
          title: 'AI budget reached',
          description: "Your organization's AI budget has been reached. Please try again later."
        });
        setIsLoading(false);
        return;
      }

      // Call advanced AI service
      const aiResponse = await invokeAdvancedAI({
        message: userMessageObj.content, // Updated
        context,
        conversation_type: detectedType,
        user_id: user?.id,
        model: resolvedModel.model
      });

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
        tokens_used: aiResponse.tokens_used || 0,
        model: aiResponse.model || 'gpt-4',
        suggestions: aiResponse.suggested_actions || [] // Still stored here for conversation history
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      setSuggestedActions(aiResponse.suggested_actions || []); // Set current suggested actions

      if (tenantScope?.organizationId) {
        const tokenResponse = estimateTokens(aiResponse.response);
        const tokenTotal = tokenPrompt + tokenResponse;
        const risk = scoreHallucinationRisk(aiResponse.response);
        const reviewRequired = risk.score >= 0.7;
        const reviewReason = reviewRequired
          ? `Risk score ${risk.score}${risk.flags.length ? ` (${risk.flags.join(', ')})` : ''}`
          : null;

        Promise.allSettled([
          logAiInteraction(
            { organizationId: tenantScope.organizationId, schoolId: tenantScope.schoolId },
            {
              prompt: userMessageObj.content,
              response: aiResponse.response,
              tokenPrompt,
              tokenResponse,
              tokenTotal,
              safetyRiskScore: risk.score,
              safetyFlags: risk.flags,
              model: aiResponse.model || resolvedModel.model || 'unknown',
              metadata: {
                modelReason: resolvedModel.reason,
                budgetExceeded: resolvedModel.budgetExceeded,
                confidence: aiResponse.confidence,
                suggestedActions: aiResponse.suggested_actions || []
              },
              inputs: {
                message: userMessageObj.content,
                context,
                conversationType: detectedType,
                userId: user?.id
              },
              outputs: {
                response: aiResponse.response,
                suggestedActions: aiResponse.suggested_actions || [],
                confidence: aiResponse.confidence
              },
              reviewRequired,
              reviewReason,
              latencyMs: Date.now() - startTime
            }
          )
        ]).catch(() => {});
      }

      // Update or create conversation
      if (activeConversation) {
        const updatedConversation = {
          ...activeConversation,
          conversation_history: updatedMessages,
          last_activity: new Date().toISOString(),
          total_tokens_used: (activeConversation.total_tokens_used || 0) + (aiResponse.tokens_used || 0),
          conversation_type: detectedType,
          suggested_actions: aiResponse.suggested_actions || []
        };

        await AIConversation.update(activeConversation.id, updatedConversation);
        setActiveConversation(updatedConversation);
      } else {
        // Create new conversation
        const newConversation = await AIConversation.create({
          user_id: user.id,
          title: `Chat ${new Date().toLocaleDateString()}`,
          conversation_history: updatedMessages,
          conversation_type: detectedType,
          total_tokens_used: aiResponse.tokens_used || 0,
          last_activity: new Date().toISOString(),
          suggested_actions: aiResponse.suggested_actions || []
        });

        setActiveConversation(newConversation);
        setConversations([newConversation, ...conversations]);
      }

      // Auto-speak response if requested
      if (user?.accessibility_preferences?.voice_commands) {
        speakText(aiResponse.response);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not get AI response. Please try again."
      });

      // Remove the user message if AI failed (reverts messages state)
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    if (action.type === 'navigate') {
      onIntent?.(action.intent, action.data);
    } else if (action.type === 'query') {
      setUserMessage(action.query);
      handleSendMessage(action.query);
    }
    setShowSuggestions(false); // Hide suggestions after one is clicked
  };

  // TypeIcon is still used for the header badge
  const TypeIcon = MessageTypeIcons[conversationType] || Bot;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto rounded-lg shadow-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ask Teachmo™</h1>
            <p className="text-sm text-gray-600">Your AI parenting assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Audio controls for last assistant message */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isSpeaking ? stopSpeaking : () => speakText(messages[messages.length - 1]?.content)}
            disabled={!messages.length || messages[messages.length - 1]?.role !== 'assistant'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {conversationType.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Conversation Area */}
      <ScrollArea className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
            <p className="text-gray-600 mb-6">Ask me anything about parenting, child development, or activities!</p>

            {/* Suggested Starter Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => handleSendMessage("My 5-year-old is having trouble with bedtime. What should I do?")}
              >
                <div>
                  <div className="font-medium text-sm">Bedtime Struggles</div>
                  <div className="text-xs text-gray-500 mt-1">Get help with sleep routines</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => handleSendMessage("Can you suggest some educational activities for a 7-year-old?")}
              >
                <div>
                  <div className="font-medium text-sm">Educational Activities</div>
                  <div className="text-xs text-gray-500 mt-1">Find learning activities</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => handleSendMessage("How do I handle tantrums in a toddler?")}
              >
                <div>
                  <div className="font-medium text-sm">Toddler Tantrums</div>
                  <div className="text-xs text-gray-500 mt-1">Managing difficult moments</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto p-4"
                onClick={() => handleSendMessage("What are some fun weekend activities for families?")}
              >
                <div>
                  <div className="font-medium text-sm">Family Fun</div>
                  <div className="text-xs text-gray-500 mt-1">Weekend activity ideas</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.timestamp && (
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Suggested Actions from AI */}
            {suggestedActions.length > 0 && showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-purple-50 rounded-lg p-4 border border-purple-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-purple-900">Suggested Actions</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {suggestedActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-3 bg-white hover:bg-purple-100"
                      onClick={() => handleSuggestedAction(action)}
                    >
                      <div className="flex items-center gap-3">
                        {action.icon && MessageTypeIcons[action.icon] ? React.createElement(MessageTypeIcons[action.icon], { className: "w-4 h-4 text-purple-600" }) : <Lightbulb className="w-4 h-4 text-purple-600" />} {/* Handle icon rendering dynamically */}
                        <div>
                          <div className="font-medium text-sm">{action.title}</div>
                          {action.description && (
                            <div className="text-xs text-gray-600">{action.description}</div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about parenting..."
              className="pr-12"
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              onClick={() => handleSendMessage()}
              disabled={!userMessage.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={isListening ? stopListening : startListening}
            disabled={!recognition.current || isLoading}
            className={isListening ? 'bg-red-100 text-red-600' : ''}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onIntent?.('find_activity', {})}
            className="text-xs"
          >
            <Search className="w-3 h-3 mr-1" />
            Find Activities
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onIntent?.('ask_community', { query: userMessage })}
            className="text-xs"
          >
            <Users className="w-3 h-3 mr-1" />
            Ask Community
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConversationType(conversationType === 'crisis' ? 'general' : 'crisis')}
            className="text-xs"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {conversationType === 'crisis' ? 'General Mode' : 'Crisis Mode'}
          </Button>
        </div>
      </div>
    </div>
  );
}
