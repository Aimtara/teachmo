import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, MessageSquare, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Conversation, ConversationMember, User } from '@/api/entities';
import { useApi } from '@/components/hooks/useApi';

export default function ConversationList({ onSelectConversation, selectedConversationId, onNewConversation }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const api = useApi({ context: 'conversations' });

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Get conversations where user is a member
      const memberRecords = await api.execute(
        () => ConversationMember.filter({ user_id: currentUser.id }, '-last_read_at'),
        { key: 'members' }
      );

      if (memberRecords && memberRecords.length > 0) {
        // Get full conversation details
        const conversationIds = memberRecords.map(m => m.conversation_id);
        const conversationPromises = conversationIds.map(id => 
          Conversation.filter({ id }, '-last_message_at', 1).then(results => results[0])
        );
        
        const conversationDetails = await Promise.all(conversationPromises);
        
        // Enrich with member information
        const enrichedConversations = await Promise.all(
          conversationDetails.filter(Boolean).map(async (conv) => {
            const members = await ConversationMember.filter({ conversation_id: conv.id });
            const otherMembers = members.filter(m => m.user_id !== currentUser.id);
            
            // For DMs, get the other person's info
            if (conv.type === 'DM' && otherMembers.length > 0) {
              try {
                const otherUser = await User.filter({ id: otherMembers[0].user_id }, null, 1);
                return {
                  ...conv,
                  other_user: otherUser[0] || { full_name: 'Unknown User', avatar_url: null },
                  unread_count: 0 // Would calculate from messages
                };
              } catch (error) {
                console.error('Error loading other user:', error);
                return {
                  ...conv,
                  other_user: { full_name: 'Unknown User', avatar_url: null },
                  unread_count: 0
                };
              }
            }
            
            return {
              ...conv,
              member_count: members.length,
              unread_count: 0
            };
          })
        );
        
        setConversations(enrichedConversations.sort((a, b) => 
          new Date(b.last_message_at || b.created_date) - new Date(a.last_message_at || a.created_date)
        ));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    if (conv.type === 'DM' && conv.other_user) {
      return conv.other_user.full_name?.toLowerCase().includes(query);
    }
    return conv.name?.toLowerCase().includes(query);
  });

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString();
  };

  const getConversationIcon = (conversation) => {
    switch (conversation.type) {
      case 'CHANNEL':
        return <Users className="w-4 h-4" />;
      case 'OFFICE_HOURS':
        return <Clock className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'DM' && conversation.other_user) {
      return conversation.other_user.full_name || 'Unknown User';
    }
    return conversation.name || `${conversation.type} Conversation`;
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'DM' && conversation.other_user) {
      return {
        url: conversation.other_user.avatar_url,
        fallback: (conversation.other_user.full_name || 'U')[0].toUpperCase()
      };
    }
    return {
      url: null,
      fallback: conversation.name ? conversation.name[0].toUpperCase() : 'C'
    };
  };

  return (
    <Card className="h-full flex flex-col bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          {api.isLoading('members') ? (
            <div className="p-4">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-500 mb-2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Start a new conversation to connect with other parents'
                }
              </p>
              {!searchQuery && (
                <Button onClick={onNewConversation} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Start chatting
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation.id;
                const avatar = getConversationAvatar(conversation);
                const conversationName = getConversationName(conversation);
                
                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-r-2 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={avatar.url} />
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          {avatar.fallback}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {conversationName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getConversationIcon(conversation)}
                              <span className="text-xs text-gray-500">
                                {conversation.type === 'CHANNEL' 
                                  ? `${conversation.member_count} members`
                                  : conversation.type
                                }
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 ml-2">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(conversation.last_message_at)}
                            </span>
                            {conversation.unread_count > 0 && (
                              <Badge className="bg-blue-500 text-white text-xs h-5 min-w-[20px] flex items-center justify-center rounded-full">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {conversation.last_message_preview && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {conversation.last_message_preview}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
