import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, Plus, Send, MoreHorizontal } from 'lucide-react';
import { Conversation, Message, ConversationMember } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';
import { LoadingSpinner, EmptyState } from '@/components/shared/LoadingStates';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';

const ConversationItem = ({ conversation, isActive, onClick, unreadCount }) => (
  <motion.div
    whileHover={{ backgroundColor: '#f8fafc' }}
    className={`p-4 cursor-pointer border-b transition-colors ${
      isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-gray-900 truncate">
        {conversation.name || 'Direct Message'}
      </h4>
      {unreadCount > 0 && (
        <Badge className="bg-blue-600 text-white text-xs">
          {unreadCount}
        </Badge>
      )}
    </div>
    
    {conversation.last_message_preview && (
      <p className="text-sm text-gray-600 truncate mb-1">
        {conversation.last_message_preview}
      </p>
    )}
    
    {conversation.last_message_at && (
      <p className="text-xs text-gray-400">
        {formatDistanceToNow(new Date(conversation.last_message_at))} ago
      </p>
    )}
  </motion.div>
);

const MessageBubble = ({ message, isOwn, senderName }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
  >
    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
      isOwn 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-200 text-gray-800'
    }`}>
      {!isOwn && (
        <p className="text-xs font-semibold mb-1 opacity-70">
          {senderName}
        </p>
      )}
      <p className="text-sm">{message.content}</p>
      <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
        {format(new Date(message.created_date), 'HH:mm')}
      </p>
    </div>
  </motion.div>
);

export default function CommunityMessages({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const api = useApi({ context: 'community-messages' });
  const { toast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const conversationsData = await api.execute(() => Conversation.filter({
        // Get conversations where user is a member
        // This would typically involve a join with ConversationMember
      }), {
        key: 'conversations',
        errorContext: 'loading conversations'
      });
      
      setConversations(conversationsData || []);
      
      // Auto-select first conversation
      if (conversationsData && conversationsData.length > 0) {
        setActiveConversation(conversationsData[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        variant: "destructive",
        title: "Loading Error",
        description: "Failed to load your conversations. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    setIsLoadingMessages(true);
    try {
      const messagesData = await api.execute(() => 
        Message.filter({ conversation_id: conversationId }, '-created_date', 50), {
        key: `messages-${conversationId}`,
        errorContext: 'loading messages'
      });
      
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        variant: "destructive",
        title: "Loading Error",
        description: "Failed to load messages. Please try again."
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      const message = await Message.create({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content: newMessage.trim()
      });

      // Add message to local state immediately for optimistic update
      setMessages(prev => [...prev, {
        ...message,
        sender_name: user.full_name
      }]);
      
      setNewMessage('');
      
      // Update conversation last message
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversation.id 
          ? { ...conv, last_message_preview: newMessage.trim(), last_message_at: new Date().toISOString() }
          : conv
      ));

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        variant: "destructive",
        title: "Send Error",
        description: "Failed to send your message. Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[600px] flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Messages</h3>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-gray-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <LoadingSpinner text="Loading conversations..." />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No conversations"
                description="Start a new conversation to connect with other parents and teachers."
                action={
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {filteredConversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={activeConversation?.id === conversation.id}
                  onClick={() => setActiveConversation(conversation)}
                  unreadCount={0} // Would calculate based on last_read_at
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {activeConversation.name || 'Direct Message'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeConversation.participant_count || 2} participants
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <LoadingSpinner text="Loading messages..." />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === user.id}
                      senderName={message.sender_name || 'Unknown'}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}