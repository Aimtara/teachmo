import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Send, 
  Calendar,
  MapPin,
  Clock,
  X
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Pod, PodMember, UserMessage, Post, User } from '@/api/entities';

export default function InviteModal({ 
  open, 
  onOpenChange, 
  activity = null, 
  event = null,
  onInviteSent 
}) {
  const [pods, setPods] = useState([]);
  const [selectedPods, setSelectedPods] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const { toast } = useToast();

  const itemTitle = activity?.title || event?.title || 'Item';
  const itemType = activity ? 'activity' : 'event';

  useEffect(() => {
    if (open) {
      loadPods();
      loadUsers();
      generateDefaultMessage();
    }
  }, [open, activity, event]);

  const loadPods = async () => {
    try {
      // Get user's pods
      const user = await User.me();
      const userMemberships = await PodMember.filter({ user_id: user.id });
      const podIds = userMemberships.map(m => m.pod_id);
      
      if (podIds.length > 0) {
        const userPods = await Promise.all(
          podIds.map(id => Pod.filter({ id }).then(pods => pods[0]))
        );
        setPods(userPods.filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading pods:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // In a real app, you'd have a friends/contacts system
      // For now, we'll just show an empty list since we can't list all users
      setAvailableUsers([]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const generateDefaultMessage = () => {
    if (activity) {
      setMessage(`Hi! I found this great activity "${activity.title}" and thought you might be interested. Want to try it together?`);
    } else if (event) {
      setMessage(`Hey! There's an interesting event "${event.title}" coming up. Would you like to join me?`);
    }
  };

  const handlePodSelect = (podId, checked) => {
    if (checked) {
      setSelectedPods([...selectedPods, podId]);
    } else {
      setSelectedPods(selectedPods.filter(id => id !== podId));
    }
  };

  const handleUserSelect = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSendInvites = async () => {
    if (selectedPods.length === 0 && selectedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "No recipients selected",
        description: "Please select pods or users to invite.",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Missing message",
        description: "Please enter a message with your invitation.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = await User.me();
      let totalInvitesSent = 0;

      // Send invites to selected pods (as posts)
      for (const podId of selectedPods) {
        await Post.create({
          content: message,
          type: "general",
          user_id: user.id,
          author_name: user.full_name || "Anonymous",
          pod_id: podId,
          visibility: "pod",
          status: "published",
          attachments: activity || event ? [{
            url: activity?.id || event?.id,
            type: "link",
            filename: `${itemType}_${itemTitle}`
          }] : [],
          tags: [itemType, "invitation"]
        });
        totalInvitesSent++;
      }

      // Send direct messages to selected users
      for (const userId of selectedUsers) {
        // Create or find existing conversation
        const threadId = `${Math.min(user.id, userId)}_${Math.max(user.id, userId)}`;
        
        await UserMessage.create({
          sender_id: user.id,
          recipient_id: userId,
          content: message,
          message_type: activity ? "activity_share" : "event_invite",
          thread_id: threadId,
          shared_resource_id: activity?.id || event?.id,
          shared_resource_type: itemType
        });
        totalInvitesSent++;
      }

      // Award points for community engagement
      await User.updateMyUserData({
        points: (user.points || 0) + Math.min(totalInvitesSent * 2, 10) // Max 10 points
      });

      toast({
        title: `Invitations sent! +${Math.min(totalInvitesSent * 2, 10)} points`,
        description: `Your invitation was shared with ${totalInvitesSent} ${totalInvitesSent === 1 ? 'recipient' : 'recipients'}.`,
      });

      // Reset form
      setSelectedPods([]);
      setSelectedUsers([]);
      setMessage('');
      
      onOpenChange(false);
      if (onInviteSent) onInviteSent();

    } catch (error) {
      console.error('Error sending invites:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send invitations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPods = pods.filter(pod =>
    pod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pod.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Invite Others to {itemTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Preview */}
          {(activity || event) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  activity ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activity ? (
                    <Calendar className="w-5 h-5 text-blue-600" />
                  ) : (
                    <MapPin className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{itemTitle}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {activity?.description || event?.description}
                  </p>
                  {event && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {event.start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(event.start_time).toLocaleDateString()}
                        </div>
                      )}
                      {event.location_name && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search pods and contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Pods Selection */}
          {filteredPods.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">My Pods</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {filteredPods.map((pod) => (
                  <div key={pod.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                    <Checkbox
                      id={`pod-${pod.id}`}
                      checked={selectedPods.includes(pod.id)}
                      onCheckedChange={(checked) => handlePodSelect(pod.id, checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{pod.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {pod.member_count || 1} members
                        </Badge>
                      </div>
                      {pod.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {pod.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Selection */}
          {filteredUsers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Contacts</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleUserSelect(user.id, checked)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {(user.full_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {user.full_name || 'Anonymous'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message with your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Selected Recipients Summary */}
          {(selectedPods.length > 0 || selectedUsers.length > 0) && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-2">
                Sending to {selectedPods.length + selectedUsers.length} recipients:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPods.map(podId => {
                  const pod = pods.find(p => p.id === podId);
                  return (
                    <Badge key={podId} className="bg-blue-100 text-blue-800">
                      {pod?.name} pod
                      <button
                        type="button"
                        onClick={() => handlePodSelect(podId, false)}
                        className="ml-1 hover:bg-blue-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                {selectedUsers.map(userId => {
                  const user = availableUsers.find(u => u.id === userId);
                  return (
                    <Badge key={userId} className="bg-green-100 text-green-800">
                      {user?.full_name}
                      <button
                        type="button"
                        onClick={() => handleUserSelect(userId, false)}
                        className="ml-1 hover:bg-green-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvites}
              disabled={isLoading || (selectedPods.length === 0 && selectedUsers.length === 0)}
            >
              {isLoading ? 'Sending...' : `Send ${selectedPods.length + selectedUsers.length} Invites`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}