import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, AlertCircle, Lightbulb, BookOpen, Users, Sparkles, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invokeAdvancedAI } from '@/api/functions';
import { logAiInteraction } from '@/api/ai/log';
import { resolveAiModel } from '@/api/ai/resolveModel';
import { useTenant } from '@/contexts/TenantContext';
import { estimateTokens, scoreHallucinationRisk } from '@/observability/aiSafety';
import { logAnalyticsEvent } from '@/observability/telemetry';
import { useTenantFeatureFlags } from '@/hooks/useTenantFeatureFlags';

const AICapabilityBadge = ({ icon: Icon, label, description }) => (
  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
    <Icon className="w-4 h-4 text-blue-600" />
    <div>
      <p className="text-sm font-medium text-blue-900">{label}</p>
      <p className="text-xs text-blue-700">{description}</p>
    </div>
  </div>
);

const AIMessage = ({ message, isUser, onFeedback, timestamp, confidence, sources }) => {
  const [feedback, setFeedback] = useState(null);

  const handleFeedback = (type) => {
    setFeedback(type);
    onFeedback?.(message.id, type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-blue-600 text-white ml-auto' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <div className="prose prose-sm max-w-none">
            {typeof message.content === 'string' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              message.content
            )}
          </div>
          
          {/* AI-specific enhancements */}
          {!isUser && (
            <div className="mt-3 space-y-2">
              {/* Confidence indicator */}
              {confidence && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      confidence > 0.8 ? 'bg-green-500' : 
                      confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span>
                      {confidence > 0.8 ? 'High confidence' : 
                       confidence > 0.6 ? 'Medium confidence' : 'Lower confidence'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Sources */}
              {sources && sources.length > 0 && (
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Feedback buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('positive')}
                  className={`h-6 px-2 ${feedback === 'positive' ? 'bg-green-100 text-green-700' : ''}`}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('negative')}
                  className={`h-6 px-2 ${feedback === 'negative' ? 'bg-red-100 text-red-700' : ''}`}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {timestamp && (
          <p className="text-xs text-gray-500 mt-1 px-1">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </motion.div>
  );
};

const AIThinkingIndicator = ({ stage }) => {
  const stages = [
    { key: 'analyzing', label: 'Analyzing your question...', icon: Sparkles },
    { key: 'researching', label: 'Researching relevant information...', icon: BookOpen },
    { key: 'formulating', label: 'Formulating response...', icon: Lightbulb },
  ];

  const currentStage = stages.find(s => s.key === stage) || stages[0];
  const Icon = currentStage.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
    >
      <Icon className="w-4 h-4 text-blue-600 animate-pulse" />
      <span className="text-sm text-blue-800">{currentStage.label}</span>
    </motion.div>
  );
};

export default function EnhancedAIAssistant({ user, children }) {
  const tenant = useTenant();
  const featureFlagsQuery = useTenantFeatureFlags();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(null);
  const [showCapabilities, setShowCapabilities] = useState(!messages.length);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome',
        content: `Hi! I'm your AI assistant. I'm here to help with parenting questions, activity suggestions, and homework support. I provide general guidance based on research and best practices, but I'm not a substitute for professional medical or therapeutic advice.

What would you like help with today?`,
        isUser: false,
        timestamp: new Date().toISOString(),
        confidence: 0.95
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowCapabilities(false);

    try {
      const startTime = Date.now();
      // Simulate thinking stages
      setThinkingStage('analyzing');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setThinkingStage('researching');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setThinkingStage('formulating');
      await new Promise(resolve => setTimeout(resolve, 600));

      const tokenPrompt = estimateTokens(inputValue);
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
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString() + '_blocked',
            content: "Your organization's AI budget has been reached. Please try again later or contact an administrator.",
            isUser: false,
            timestamp: new Date().toISOString(),
            confidence: 0.1
          }
        ]);
        setIsLoading(false);
        setThinkingStage(null);
        return;
      }

      const context = {
        user_type: user?.user_type,
        children: children || [],
        conversation_history: messages.slice(-5) // Last 5 messages for context
      };

      const aiResponse = await invokeAdvancedAI({
        query: inputValue,
        context,
        model: resolvedModel.model
      });

      const aiMessage = {
        id: Date.now().toString() + '_ai',
        content: aiResponse.response,
        isUser: false,
        timestamp: new Date().toISOString(),
        confidence: aiResponse.confidence || 0.8,
        sources: aiResponse.sources || []
      };

      setMessages(prev => [...prev, aiMessage]);

      if (tenant.organizationId) {
        const tokenResponse = estimateTokens(aiResponse.response);
        const tokenTotal = tokenPrompt + tokenResponse;
        const risk = scoreHallucinationRisk(aiResponse.response);
        const childId = Array.isArray(children) && children.length
          ? String(children[0].id || children[0].childId || '')
          : null;
        const reviewRequired = risk.score >= 0.7;
        const reviewReason = reviewRequired
          ? `Risk score ${risk.score}${risk.flags.length ? ` (${risk.flags.join(', ')})` : ''}`
          : null;

        Promise.allSettled([
          logAiInteraction(
            { organizationId: tenant.organizationId, schoolId: tenant.schoolId },
            {
              prompt: inputValue,
              response: aiResponse.response,
              tokenPrompt,
              tokenResponse,
              tokenTotal,
              safetyRiskScore: risk.score,
              safetyFlags: risk.flags,
              model: aiResponse.model || aiResponse.provider || resolvedModel.model || 'unknown',
              metadata: {
                confidence: aiResponse.confidence,
                sources: aiResponse.sources,
                modelReason: resolvedModel.reason,
                budgetExceeded: resolvedModel.budgetExceeded
              },
              childId,
              inputs: { query: inputValue, context },
              outputs: { response: aiResponse.response, confidence: aiResponse.confidence, sources: aiResponse.sources },
              reviewRequired,
              reviewReason,
              latencyMs: Date.now() - startTime
            }
          ),
          logAnalyticsEvent(
            { organizationId: tenant.organizationId, schoolId: tenant.schoolId },
            {
              eventName: 'ai_call',
              metadata: {
                tokenPrompt,
                tokenResponse,
                tokenTotal,
                safetyRiskScore: risk.score,
                safetyFlags: risk.flags,
                model: aiResponse.model || aiResponse.provider || resolvedModel.model || 'unknown',
                reviewRequired
              }
            }
          )
        ]).catch(() => {});
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = {
        id: Date.now().toString() + '_error',
        content: "I'm sorry, I encountered an error processing your request. Please try again, or rephrase your question.",
        isUser: false,
        timestamp: new Date().toISOString(),
        confidence: 0.1
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setThinkingStage(null);
    }
  };

  const handleFeedback = async (messageId, feedbackType) => {
    // Here you could send feedback to your analytics system
    console.log(`Feedback for message ${messageId}: ${feedbackType}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setShowCapabilities(true);
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Assistant</CardTitle>
              <p className="text-sm text-gray-600">Your personal parenting guide</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={startNewConversation}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </CardHeader>

      {/* Capabilities Display */}
      <AnimatePresence>
        {showCapabilities && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 border-b bg-gray-50"
          >
            <h3 className="font-medium text-sm mb-3 text-gray-800">I can help you with:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AICapabilityBadge
                icon={Users}
                label="Parenting Guidance"
                description="Age-appropriate strategies and tips"
              />
              <AICapabilityBadge
                icon={BookOpen}
                label="Homework Support"
                description="Learning strategies and explanations"
              />
              <AICapabilityBadge
                icon={Sparkles}
                label="Activity Suggestions"
                description="Personalized recommendations"
              />
              <AICapabilityBadge
                icon={Lightbulb}
                label="Development Insights"
                description="Understanding your child's growth"
              />
            </div>
            
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> I provide general guidance based on research and cannot replace professional medical, therapeutic, or educational advice. Always consult qualified professionals for specific concerns.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <AIMessage
            key={message.id}
            message={message}
            isUser={message.isUser}
            onFeedback={handleFeedback}
            timestamp={message.timestamp}
            confidence={message.confidence}
            sources={message.sources}
          />
        ))}
        
        {isLoading && thinkingStage && (
          <AIThinkingIndicator stage={thinkingStage} />
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about parenting, activities, or homework help..."
            className="resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
