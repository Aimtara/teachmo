
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, MessageSquare, ShieldPlus, Phone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UserCard({ user, isFollowing, onFollowToggle }) {
  const navigate = useNavigate();

  const handleMessage = () => {
    // Navigate to messages page with this user
    navigate(createPageUrl('Messages', { startConversation: user.id }));
  };

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm text-center">
      <CardContent className="p-6">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{backgroundColor: 'var(--teachmo-coral)'}}>
            <span className="text-white font-bold text-3xl">{user.full_name[0]}</span>
          </div>
        )}
        <h3 className="font-bold text-lg text-gray-900">{user.full_name}</h3>
        <p className="text-sm text-gray-500 mb-4">@{user.username || user.email}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => onFollowToggle(user.id, isFollowing)}
            variant={isFollowing ? 'outline' : 'default'}
            className="w-full"
            style={!isFollowing ? {backgroundColor: 'var(--teachmo-sage)'} : {}}
          >
            {isFollowing ? (
              <UserCheck className="w-4 h-4 mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MessageSquare className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleMessage}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ShieldPlus className="w-4 h-4 mr-2" />
                Invite to Pod
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
