
import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Message } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  Send, 
  Paperclip, 
  Languages, 
  Download
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import backendAdapter from '@/backend/adapter';

export default function ChatWindow({ conversationId, recipientUser, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Real-time typing indicator simulation
  const typingTimeoutRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const messagesData = await Message.filter(
        { conversation_id: conversationId },
        '-created_date'
      );
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load messages.' });
    }
  }, [conversationId, toast]);

  const simulateOnlineStatus = useCallback(() => {
    // Simulate online status - in production this would be via WebSocket
    const isRecipientOnline = Math.random() > 0.3; // 70% chance online
    if (isRecipientOnline && recipientUser?.id) {
      setOnlineUsers((prev) => new Set(prev).add(recipientUser.id));
    }
  }, [recipientUser?.id]);

  useEffect(() => {
    loadMessages();
    // In a real app, you'd set up WebSocket connections here for real-time updates
    simulateOnlineStatus();
  }, [conversationId, loadMessages, simulateOnlineStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await backendAdapter.createMessage({
        conversationId,
        senderId: currentUser.id,
        content: messageContent
      });

      loadMessages(); // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
      setNewMessage(messageContent); // Restore message
    } finally {
      setIsLoading(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Simulate typing indicator
    if (!isTyping) {
      setIsTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please select a file smaller than 10MB.' });
      return;
    }

    setUploadingFile(true);
    try {
      const uploadResult = await backendAdapter.uploadFile(file, file.name);
      const fileUrl = uploadResult?.url;
      
      await backendAdapter.createMessage({
        conversationId,
        senderId: currentUser.id,
        content: `Shared file: ${file.name}`,
        attachments: [{
          url: fileUrl,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          filename: file.name,
          size: file.size
        }]
      });

      loadMessages();
      toast({ title: 'File sent', description: 'Your file has been shared.' });
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload the file.' });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleTranslateMessage = async (messageId, targetLang = 'en') => {
    const message = messages.find(m => m.id === messageId);
    if (!message || translatedMessages[messageId]) return;

    try {
      const response = await fetch('/functions/translateMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Or however you store the token
        },
        body: JSON.stringify({
          text: message.content,
          targetLanguage: targetLang
        })
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: data.translatedText
      }));
    } catch (error) {
      console.error('Translation error:', error);
      toast({ variant: 'destructive', title: 'Translation failed', description: 'Could not translate this message.' });
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const renderAttachment = (attachment) => {
    if (attachment.type === 'image') {
      return (
        <div className="mt-2">
          <img 
            src={attachment.url} 
            alt={attachment.filename}
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => window.open(attachment.url, '_blank')}
          />
        </div>
      );
    }

    return (
      <div className="mt-2 flex items-center gap-2 p-3 bg-gray-50 rounded-lg max-w-xs">
        <Paperclip className="w-4 h-4 text-gray-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.filename}</p>
          <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
        </div>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => window.open(attachment.url, '_blank')}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="font-semibold text-blue-700">
                {recipientUser.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            {onlineUsers.has(recipientUser.id) && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{recipientUser.full_name}</h3>
            <p className="text-sm text-gray-500">
              {onlineUsers.has(recipientUser.id) ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isFromCurrentUser = message.sender_id === currentUser.id;
          const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;

          return (
            <div
              key={message.id}
              className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${isFromCurrentUser ? 'order-2' : 'order-1'}`}>
                <div
                  className={`p-3 rounded-lg ${
                    isFromCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  
                  {message.attachments?.map((attachment, idx) => (
                    <div key={idx}>
                      {renderAttachment(attachment)}
                    </div>
                  ))}

                  {translatedMessages[message.id] && (
                    <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-80">
                      {translatedMessages[message.id]}
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-2 mt-1 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.created_date)}
                  </span>
                  {!isFromCurrentUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleTranslateMessage(message.id)}
                    >
                      <Languages className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && recipientUser && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="h-8 w-8 p-0"
              >
                {uploadingFile ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Input
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              disabled={isLoading}
              className="resize-none"
            />
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || isLoading}
            className="h-10 w-10 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

ChatWindow.propTypes = {
  conversationId: PropTypes.string.isRequired,
  recipientUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    full_name: PropTypes.string
  }).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
  }).isRequired
};
