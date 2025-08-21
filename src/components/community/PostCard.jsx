import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2, MoreHorizontal, Flag, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Kudo } from '@/api/entities';
import { User } from '@/api/entities';

export default function PostCard({ post, onKudo, onComment, onReport }) {
  const [kudosCount, setKudosCount] = useState(post.kudos_count || 0);
  const [hasKudoed, setHasKudoed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleKudo = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const user = await User.me();
      
      if (hasKudoed) {
        // Remove kudo
        const kudos = await Kudo.filter({ post_id: post.id, giver_user_id: user.id });
        if (kudos.length > 0) {
          await Kudo.delete(kudos[0].id);
          setKudosCount(prev => prev - 1);
          setHasKudoed(false);
        }
      } else {
        // Add kudo
        await Kudo.create({
          post_id: post.id,
          giver_user_id: user.id,
          receiver_user_id: post.user_id
        });
        setKudosCount(prev => prev + 1);
        setHasKudoed(true);
        
        // Award points for giving kudos
        await User.updateMyUserData({
          points: (user.points || 0) + 2
        });
        
        toast({
          title: "Kudo given! +2 points",
          description: "Thank you for supporting the community",
        });
      }
      
      if (onKudo) onKudo(post.id, !hasKudoed);
    } catch (error) {
      console.error('Error handling kudo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update kudo. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport(post);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'achievement': return 'bg-green-100 text-green-800';
      case 'advice_request': return 'bg-orange-100 text-orange-800';
      case 'announcement': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {post.author_avatar_url ? (
                <img 
                  src={post.author_avatar_url} 
                  alt={post.author_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {(post.author_name || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{post.author_name || 'Anonymous'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{formatTimeAgo(post.created_date)}</span>
                  {post.type !== 'general' && (
                    <Badge className={getTypeColor(post.type)}>
                      {post.type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save post
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReport}>
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
            {post.image_url && (
              <div className="mt-3">
                <img 
                  src={post.image_url} 
                  alt="Post attachment"
                  className="rounded-lg max-w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleKudo}
                disabled={isLoading}
                className={`flex items-center gap-2 hover:bg-red-50 ${
                  hasKudoed ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasKudoed ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{kudosCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onComment && onComment(post)}
                className="flex items-center gap-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{post.reply_count || 0}</span>
              </Button>
            </div>
            
            {post.is_pinned && (
              <Badge variant="outline" className="text-xs">
                Pinned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}