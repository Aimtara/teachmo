import React, { useState, useEffect } from 'react';
import { Post, Comment, Like, User } from '@/api/entities';
import PostCard from "./PostCard";
import CreatePostForm from "./CreatePostForm";
import { CommunitySkeleton } from '../shared/ImprovedSkeletons';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence } from 'framer-motion';

export default function CommunityFeed({ initialContent, initialType, onPostCreated }) {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeedData();
  }, []);

  const loadFeedData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [currentUser, postsData, commentsData, likesData] = await Promise.all([
        User.me(),
        Post.list('-created_date', 50, { with: { user: true } }),
        Comment.list(),
        Like.list(),
      ]);
      setUser(currentUser);
      setPosts(postsData);
      setComments(commentsData || []);
      setLikes(likesData || []);
    } catch (err) {
      console.error("Error loading feed data:", err);
      setError({ message: "Could not load the community feed." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async (postId) => {
    // ... (existing like logic)
  };

  const getPostLikes = (postId) => likes.filter(l => l.post_id === postId);
  const hasLikedPost = (postId) => likes.some(l => l.post_id === postId && l.user_id === user?.id);

  if (isLoading) {
    return <CommunitySkeleton />;
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto border-0 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Could Not Load Feed</h2>
          <p className="text-gray-700 mb-6 max-w-md mx-auto">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CreatePostForm
        user={user}
        onPostCreated={onPostCreated || loadFeedData}
        initialContent={initialContent}
        initialType={initialType}
      />
      <div className="space-y-4">
        <AnimatePresence>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              comments={comments.filter(c => c.post_id === post.id)}
              likes={getPostLikes(post.id)}
              hasLiked={hasLikedPost(post.id)}
              onLike={() => handleLikePost(post.id)}
              currentUser={user}
              onUpdate={loadFeedData}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
