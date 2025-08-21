
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageSquare, Repeat, MoreHorizontal, Send, Flag, UserMinus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { User, Kudo, Comment } from '@/api/entities';
import LazyImage from '../shared/LazyImage';

// New imports from the outline
import ReportModal from '@/components/community/ReportModal';
import { motion } from 'framer-motion'; // For animations
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'; // For the enhanced dropdown
import PTAPolls from '@/components/pta/PTAPolls';

export default function PostCard({ 
  post, 
  comments = [], 
  likes = [], 
  hasLiked = false, 
  onLike, 
  currentUser, 
  onReply, 
  onUpdate 
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  // New state for the Report Modal
  const [showReportModal, setShowReportModal] = useState(false);

  // Use props 'likes' and 'comments' as the source of truth for display
  const postKudos = likes;
  const postComments = comments;

  const handleKudo = async () => {
    if (!currentUser) return;

    // Use the `hasLiked` prop to determine if the post is already liked by the current user.
    // If it's already liked, the original logic prevents re-liking.
    if (hasLiked) {
      return; 
    }

    await Kudo.create({
      post_id: post.id,
      giver_user_id: currentUser.id,
      receiver_user_id: post.user_id,
    });
    
    console.log("Skipping notification creation due to database connectivity issues");

    // Call onLike instead of onKudo as per the outline's prop change
    if (onLike) onLike();
  };

  const handleComment = async () => {
    if (!currentUser || !newComment.trim()) return;
    setIsCommenting(true);
    
    await Comment.create({
      post_id: post.id,
      user_id: currentUser.id,
      content: newComment,
    });
    
    console.log("Skipping notification creation due to database connectivity issues");

    setNewComment('');
    setIsCommenting(false);
    if (onReply) onReply();
  };

  return (
    // Replaced the Card component with a motion.div for animations and styling
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="bg-white/80 backdrop-blur-sm overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 w-full"
    >
      {/* This div acts as the main content wrapper, replacing CardHeader and CardContent's main padding */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-row items-center gap-4">
            <Avatar>
              <AvatarImage src={post.author_avatar_url} />
              <AvatarFallback>{post.author_name ? post.author_name[0] : 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{post.author_name}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {/* Enhanced dropdown menu with report option */}
          {currentUser?.id !== post.user_id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowReportModal(true)}>
                  <Flag className="mr-2 h-4 w-4 text-red-500" />
                  Report Post
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Post content area, equivalent to original CardContent */}
        <div className="p-0"> {/* Padding handled by the parent 'p-6' div */}
          {post.type === 'poll' && post.poll_id ? (
            <PTAPolls pollId={post.poll_id} currentUser={currentUser} />
          ) : (
            <>
              <p className="text-gray-800 whitespace-pre-wrap my-3">{post.content}</p>
              {post.image_url && (
                <div className="mt-3 rounded-lg overflow-hidden border">
                   <LazyImage
                      src={post.image_url}
                      alt="Post attachment"
                      className="w-full h-auto max-h-96"
                      skeletonClassName="w-full h-64"
                   />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CardFooter equivalent, with adjusted styling */}
      <div className="px-6 py-2 bg-gray-50/50 rounded-b-xl">
        <div className="flex gap-1">
          <Button variant="ghost" className="flex items-center gap-2" onClick={handleKudo}>
            {/* Use hasLiked prop for conditional styling */}
            <Heart className={`w-5 h-5 ${hasLiked ? 'text-red-500 fill-current' : ''}`} />
            <span className="text-sm">{postKudos.length}</span>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" onClick={() => setShowComments(!showComments)}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">{postComments.length}</span>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {showComments && (
        <div className="p-6 border-t"> {/* Adjusted padding for consistency */}
          <div className="space-y-4">
            {postComments.map(comment => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user?.avatar_url} />
                  <AvatarFallback>{comment.user?.full_name ? comment.user.full_name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-gray-100 rounded-lg p-2">
                  <p className="font-semibold text-sm">{comment.user?.full_name}</p>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Textarea 
                placeholder="Write a comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
                rows={1}
              />
              <Button onClick={handleComment} disabled={isCommenting} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal component */}
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
        reportedUserId={post.user_id}
      />
    </motion.div>
  );
}
