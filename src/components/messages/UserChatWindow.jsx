
import React, { useState, useEffect } from 'react';
import { UserMessage, UserConversation, Activity, LocalEvent } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Share, 
  Calendar,
  Lightbulb,
  MoreVertical,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const UserMessageBubble = ({ message, isCurrentUser, otherUser, currentUser }) => {
  const sender = isCurrentUser ? currentUser : otherUser;
  
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isCurrentUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback>{sender?.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-xs md:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
        <div
          className={`p-3 rounded-2xl ${
            isCurrentUser
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 rounded-bl-sm'
          }`}
        >
          {message.message_type === 'activity_share' && (
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <div className="flex items-center gap-2 text-xs">
                <Lightbulb className="w-3 h-3" />
                <span>Shared an activity</span>
              </div>
            </div>
          )}
          {message.message_type === 'event_invite' && (
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-3 h-3" />
                <span>Shared an event</span>
              </div>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1 px-2">
          {formatMessageTime(message.created_date)}
          {message.is_read && isCurrentUser && (
            <span className="ml-1 text-blue-500">✓</span>
          )}
        </p>
      </div>
      
      {isCurrentUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 order-2">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback>{sender?.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
};

export default function UserChatWindow({ conversation, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      markMessagesAsRead();
    }
  }, [conversation]);

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const conversationMessages = await UserMessage.filter(
        { thread_id: conversation.thread_id },
        'created_date'
      );
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    setIsLoadingMessages(false);
  };

  const markMessagesAsRead = async () => {
    try {
      // Mark unread messages as read
      const unreadMessages = messages.filter(
        msg => msg.recipient_id === currentUser.id && !msg.is_read
      );
      
      for (const message of unreadMessages) {
        await UserMessage.update(message.id, { is_read: true });
      }

      // Update conversation unread count
      const updatedUnreadCount = { ...conversation.unread_count };
      updatedUnreadCount[currentUser.id] = 0;
      
      await UserConversation.update(conversation.id, {
        unread_count: updatedUnreadCount
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const messageData = {
        sender_id: currentUser.id,
        recipient_id: conversation.otherUser.id,
        content: newMessage.trim(),
        thread_id: conversation.thread_id,
        message_type: 'text'
      };

      const sentMessage = await UserMessage.create(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');

      // Update conversation
      const updatedUnreadCount = { ...conversation.unread_count };
      updatedUnreadCount[conversation.otherUser.id] = (updatedUnreadCount[conversation.otherUser.id] || 0) + 1;

      await UserConversation.update(conversation.id, {
        last_message_preview: newMessage.trim().substring(0, 100),
        last_activity: new Date().toISOString(),
        unread_count: updatedUnreadCount
      });

    } catch (error) {
      console.error('Error sending message:', error);
    }
    setIsLoading(false);
  };

  const shareActivity = async (activityId) => {
    try {
      const activities = await Activity.list();
      const activity = activities.find(a => a.id === activityId);
      
      if (activity) {
        const messageData = {
          sender_id: currentUser.id,
          recipient_id: conversation.otherUser.id,
          content: `Check out this activity: "${activity.title}" - ${activity.description}`,
          thread_id: conversation.thread_id,
          message_type: 'activity_share',
          shared_resource_id: activityId,
          shared_resource_type: 'activity'
        };

        const sentMessage = await UserMessage.create(messageData);
        setMessages(prev => [...prev, sentMessage]);
      }
    } catch (error) {
      console.error('Error sharing activity:', error);
    }
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={conversation.otherUser?.avatar_url} />
              <AvatarFallback>
                {conversation.otherUser?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {conversation.otherUser?.full_name || 'Unknown User'}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {conversation.last_activity && (
                  `Last seen ${formatDistanceToNow(new Date(conversation.last_activity), { addSuffix: true })}`
                )}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Share className="w-4 h-4 mr-2" />
                Share Activity
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="w-4 h-4 mr-2" />
                Share Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <AnimatePresence>
            {messages.map(message => (
              <UserMessageBubble
                key={message.id}
                message={message}
                isCurrentUser={message.sender_id === currentUser.id}
                otherUser={conversation.otherUser}
                currentUser={currentUser}
              />
            ))}
          </AnimatePresence>
        )}
        
        {isLoading && (
          <div className="flex gap-3 mb-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar_url} />
              <AvatarFallback>{currentUser.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${conversation.otherUser?.full_name || 'user'}...`}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            style={{backgroundColor: 'var(--teachmo-sage)'}}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
