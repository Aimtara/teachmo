
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Send, Bot, User as UserIcon, Sparkles, Loader2, ArrowLeft, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { invokeLLM } from '@/api/integrations';

const CONVERSATION_STARTERS = [
    {
      category: "Quick Help",
      questions: [
        "My 4-year-old won't listen. What should I do?",
        "How do I handle bedtime resistance?",
        "Tips for dealing with sibling rivalry?",
      ]
    },
    {
      category: "Activities",
      questions: [
        "Indoor activities for a rainy day?",
        "Educational games for my 6-year-old?",
        "Art projects we can do together?",
      ]
    },
    {
      category: "Development",
      questions: [
        "Is my child meeting developmental milestones?",
        "How to encourage independence?",
        "Building emotional intelligence?",
      ]
    }
];

const MessageBubble = ({ message, isUser }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={`flex gap-3 mb-4 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
  >
    {!isUser && (
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
    )}
    <div className="max-w-md">
      <div
        className={`p-3 rounded-2xl break-words ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 rounded-bl-sm'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      <p className="text-xs text-gray-500 mt-1 px-2">
        {format(new Date(message.timestamp), 'h:mm a')}
      </p>
    </div>
    {isUser && (
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
        <UserIcon className="w-4 h-4 text-gray-600" />
      </div>
    )}
  </motion.div>
);


export default function ChatWindow({ conversation, childContext, onBack, isMobileView, updateConversations, allConversations }) {
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [localConversation, setLocalConversation] = useState(conversation);
    const scrollAreaRef = useRef(null);

    useEffect(() => {
        setLocalConversation(conversation);
    }, [conversation]);
    
    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }
    }, [localConversation.messages]);

    const sendMessage = async (messageText = newMessage) => {
        if (!messageText.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = {
            id: Date.now().toString(),
            content: messageText.trim(),
            isUser: true,
            timestamp: new Date().toISOString()
        };
        
        // Smart title generation for new conversations
        let updatedTitle = localConversation.title;
        if (localConversation.title === "New Conversation") {
            updatedTitle = messageText.trim().split(' ').slice(0, 5).join(' ') + '...';
        }

        const updatedConversation = {
            ...localConversation,
            title: updatedTitle,
            messages: [...localConversation.messages, userMessage],
            updatedAt: new Date().toISOString()
        };
        
        setLocalConversation(updatedConversation);
        setNewMessage("");

        try {
            const context = childContext.length > 0 ? 
              `I have ${childContext.length} child${childContext.length > 1 ? 'ren' : ''}: ${childContext.map(c => `${c.name} (age ${c.age})`).join(', ')}.` : 
              "I don't have any child profiles set up yet.";

            const response = await invokeLLM({
                prompt: `You are Teachmo, a warm, supportive, and emotionally intelligent AI parenting coach. A parent is messaging you for help.

                **Parent's context:** ${context}
                **Parent's message:** "${messageText}"
                
                **Your Task:**
                1.  **Detect Emotion:** First, silently analyze the parent's message to gauge their likely emotional state (e.g., stressed, frustrated, tired, curious, happy, proud).
                2.  **Adapt Your Tone:** Adjust your response to match their emotional state. 
                    *   If they seem stressed or frustrated, be extra empathetic, calming, and reassuring.
                    *   If they seem curious or happy, be encouraging and enthusiastic.
                3.  **Provide Actionable Advice:** Offer 2-3 practical, actionable tips.
                4.  **Proactive Follow-up:** CRITICAL - ALWAYS end your response with a specific, proactive offer to help them take the next step. Examples:
                    *   "Would you like me to create a custom activity plan to practice this?"
                    *   "I can help you role-play what to say. Would that be helpful?"
                    *   "Shall I find a few fun activities for [child's name] that focus on this skill?"
                    *   "Would you like me to break this down into a step-by-step action plan for your calendar?"
                
                Keep your response concise and focused (under 200 words), but always end with a specific, helpful follow-up offer.`
            });

            const aiMessage = {
                id: (Date.now() + 1).toString(),
                content: response,
                isUser: false,
                timestamp: new Date().toISOString()
            };

            const finalConversation = { ...updatedConversation, messages: [...updatedConversation.messages, aiMessage] };
            setLocalConversation(finalConversation);
            
            const conversationsToUpdate = allConversations.map(c => c.id === finalConversation.id ? finalConversation : c);
            await updateConversations(conversationsToUpdate);

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage = { 
                id: (Date.now() + 1).toString(), 
                content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment. Would you like me to help you troubleshoot this issue?", 
                isUser: false, 
                timestamp: new Date().toISOString() 
            };
            const errorConversation = { ...updatedConversation, messages: [...updatedConversation.messages, errorMessage] };
            setLocalConversation(errorConversation);
        }

        setIsLoading(false);
    };

    const handleStarterClick = (question) => {
        sendMessage(question);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="border-b flex-row items-center p-4">
                {isMobileView && (
                    <Button variant="ghost" size="icon" className="mr-2" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                )}
                <CardTitle className="text-lg flex-1 truncate">{localConversation.title}</CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 relative flex flex-col">
              <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="p-4">
                <AnimatePresence>
                    {localConversation.messages.length <= 1 ? (
                        <div className="h-full flex flex-col justify-center">
                            <h3 className="text-center font-semibold text-lg mb-6">How can I help you today?</h3>
                            
                            {/* Message Input - Positioned ABOVE conversation starters */}
                            <div className="mb-6 px-4">
                                <div className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Ask me anything about parenting..."
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                        disabled={isLoading}
                                        className="flex-1"
                                    />
                                    <Button 
                                        onClick={() => sendMessage()}
                                        disabled={!newMessage.trim() || isLoading}
                                        style={{backgroundColor: 'var(--teachmo-sage)'}}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Conversation Starters - Now positioned below input */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {CONVERSATION_STARTERS.map((starter) => (
                                    <Card key={starter.category} className="hover:bg-gray-50 transition-colors">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-500"/>
                                                {starter.category}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {starter.questions.map(q => (
                                                <Button 
                                                    key={q} 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full text-left h-auto whitespace-normal justify-start p-2" 
                                                    onClick={() => handleStarterClick(q)}
                                                >
                                                    {q}
                                                </Button>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        localConversation.messages.map((message) => (
                            <MessageBubble key={message.id} message={message} isUser={message.isUser} />
                        ))
                    )}
                </AnimatePresence>
                {isLoading && (
                    <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm p-3 flex items-center">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                </div>
              </ScrollArea>
            </CardContent>
            
            {/* Message Input for ongoing conversations - Only show when there are messages */}
            {localConversation.messages.length > 1 && (
                <CardFooter className="border-t p-4">
                    <div className="flex gap-2 w-full">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Ask me anything about parenting..."
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            disabled={isLoading}
                        />
                        <Button onClick={() => sendMessage()} disabled={!newMessage.trim() || isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
