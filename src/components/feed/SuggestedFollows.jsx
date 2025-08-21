import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { User, Follow } from '@/api/entities';

export default function SuggestedFollows({ currentUser, onFollow }) {
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState(new Set());

  useEffect(() => {
    if (currentUser) {
      loadSuggestions();
    }
  }, [currentUser]);

  const loadSuggestions = async () => {
    try {
      // Get users the current user is already following
      const myFollows = await Follow.filter({ follower_id: currentUser.id });
      const followingIds = new Set(myFollows.map(f => f.following_id));
      setFollowing(followingIds);

      // Get all users and filter out self and already following
      const allUsers = await User.list();
      const suggested = allUsers
        .filter(user => user.id !== currentUser.id && !followingIds.has(user.id))
        .slice(0, 5); // Show top 5 suggestions

      setSuggestions(suggested);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await Follow.create({
        follower_id: currentUser.id,
        following_id: userId
      });
      
      setFollowing(prev => new Set([...prev, userId]));
      if (onFollow) onFollow();
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-blue-500" />
          Suggested Follows
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                  <span className="text-white font-semibold text-sm">
                    {user.full_name[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                <p className="text-xs text-gray-500">Parent in community</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFollow(user.id)}
              disabled={following.has(user.id)}
              className="text-xs"
            >
              {following.has(user.id) ? (
                'Following'
              ) : (
                <>
                  <UserPlus className="w-3 h-3 mr-1" />
                  Follow
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}