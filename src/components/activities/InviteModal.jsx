
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';
import { Follow } from '@/api/entities';
import { Pod } from '@/api/entities';
import { Invitation } from '@/api/entities';
import { Notification } from '@/api/entities';
import { Loader2, Send } from 'lucide-react';

export default function InviteModal({ resource, resourceType, currentUser, onClose }) {
  const [followers, setFollowers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const loadFollowers = async () => {
      // Load users who follow the current user.
      const follows = await Follow.filter({ following_id: currentUser.id });
      const followerIds = follows.map(f => f.follower_id);
      if (followerIds.length > 0) {
        // This is a placeholder for fetching multiple users, assuming platform limitation.
        const allUsers = await User.list();
        const followerUsers = allUsers.filter(u => followerIds.includes(u.id));
        setFollowers(followerUsers);
      }
      setIsLoading(false);
    };
    loadFollowers();
  }, [currentUser]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSendInvites = async () => {
    setIsSending(true);
    try {
      const invites = Array.from(selectedUsers).map(userId => ({
        inviter_id: currentUser.id,
        invitee_user_id: userId,
        resource_id: resource.id,
        resource_type: resourceType,
        status: 'pending'
      }));
      await Invitation.bulkCreate(invites);

      // Create notifications for each invited user
      const notifications = Array.from(selectedUsers).map(userId => ({
          recipient_id: userId,
          sender_id: currentUser.id,
          type: 'invitation',
          content: `${currentUser.full_name} invited you to the activity: "${resource.title}".`,
          resource_id: resource.id,
          resource_type: resourceType
      }));
      await Notification.bulkCreate(notifications);

    } catch (error) {
      console.error("Error sending invites:", error);
    }
    setIsSending(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to: {resource.title}</DialogTitle>
          <DialogDescription>
            Select followers to invite to this {resourceType}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <Loader2 className="mx-auto w-6 h-6 animate-spin" />
          ) : followers.length > 0 ? (
            <div className="space-y-2">
              {followers.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.has(user.id) ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium">{user.full_name}</p>
                  {selectedUsers.has(user.id) && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">You don't have any followers yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSendInvites}
            disabled={isSending || selectedUsers.size === 0}
            style={{backgroundColor: 'var(--teachmo-sage)'}}
          >
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Invites ({selectedUsers.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
