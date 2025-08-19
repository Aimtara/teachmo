import React, { useState, useEffect } from 'react';
import { UserConversation, UserMessage, User, Follow } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, Users, Plus, UserPlus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function UserChatList({ currentUser, onSelectConversation, activeConversation }) {
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [following, setFollowing] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadFollowing();
    }
  }, [currentUser]);

  const loadConversations = async () => {
    try {
      // Get all conversations where current user is a participant
      const allConversations = await UserConversation.list('-last_activity');
      const userConversations = allConversations.filter(conv => 
        conv.participant_ids.includes(currentUser.id)
      );

      // Get participant details for each conversation
      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conv) => {
          const otherParticipantId = conv.participant_ids.find(id => id !== currentUser.id);
          if (otherParticipantId) {
            try {
              const allUsers = await User.list();
              const otherUser = allUsers.find(u => u.id === otherParticipantId);
              return {
                ...conv,
                otherUser: otherUser || { full_name: 'Unknown User', avatar_url: null }
              };
            } catch (error) {
              return {
                ...conv,
                otherUser: { full_name: 'Unknown User', avatar_url: null }
              };
            }
          }
          return conv;
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadFollowing = async () => {
    try {
      const followingRecords = await Follow.filter({ follower_id: currentUser.id });
      const followingIds = followingRecords.map(f => f.following_id);
      
      if (followingIds.length > 0) {
        const allUsers = await User.list();
        const followingUsers = allUsers.filter(u => followingIds.includes(u.id));
        setFollowing(followingUsers);
      }
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  const createNewConversation = async (otherUserId) => {
    try {
      const threadId = `${Math.min(currentUser.id, otherUserId)}_${Math.max(currentUser.id, otherUserId)}`;
      
      // Check if conversation already exists
      const existingConv = conversations.find(conv => conv.thread_id === threadId);
      if (existingConv) {
        onSelectConversation(existingConv);
        setShowNewChatModal(false);
        return;
      }

      // Create new conversation
      const newConversation = await UserConversation.create({
        thread_id: threadId,
        participant_ids: [currentUser.id, otherUserId],
        last_activity: new Date().toISOString(),
        unread_count: {}
      });

      // Get other user details
      const allUsers = await User.list();
      const otherUser = allUsers.find(u => u.id === otherUserId);
      
      const conversationWithDetails = {
        ...newConversation,
        otherUser
      };

      setConversations(prev => [conversationWithDetails, ...prev]);
      onSelectConversation(conversationWithDetails);
      setShowNewChatModal(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and New Chat */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowNewChatModal(!showNewChatModal)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* New Chat Options */}
      {showNewChatModal && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Start New Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {following.length > 0 ? (
              following.slice(0, 5).map(user => (
                <Button
                  key={user.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-2"
                  onClick={() => createNewConversation(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.full_name}</span>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                Follow other parents to start chatting!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.length > 0 ? (
          filteredConversations.map(conversation => (
            <Button
              key={conversation.thread_id}
              variant={activeConversation?.thread_id === conversation.thread_id ? "default" : "ghost"}
              className="w-full justify-start h-auto p-3"
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex items-center gap-3 w-full">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={conversation.otherUser?.avatar_url} />
                  <AvatarFallback>
                    {conversation.otherUser?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {conversation.otherUser?.full_name || 'Unknown User'}
                    </span>
                    {conversation.last_activity && (
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_activity), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {conversation.last_message_preview && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {conversation.last_message_preview}
                    </p>
                  )}
                </div>
                {conversation.unread_count?.[currentUser.id] > 0 && (
                  <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 rounded-full">
                    {conversation.unread_count[currentUser.id]}
                  </Badge>
                )}
              </div>
            </Button>
          ))
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Follow other parents and start chatting!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}