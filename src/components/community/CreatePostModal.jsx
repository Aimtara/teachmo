import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Upload, Image, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Post } from '@/api/entities';
import { moderateContent } from '@/api/functions';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const POST_TYPES = [
  { id: 'general', label: 'General', description: 'Share something with the community' },
  { id: 'question', label: 'Question', description: 'Ask for advice or help' },
  { id: 'achievement', label: 'Achievement', description: 'Celebrate a milestone' },
  { id: 'advice_request', label: 'Advice', description: 'Request specific parenting advice' }
];

export default function CreatePostModal({ user, onClose, onPostCreated }) {
  const [postType, setPostType] = useState('general');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationWarnings, setModerationWarnings] = useState([]);
  const [isCheckingContent, setIsCheckingContent] = useState(false);

  const { toast } = useToast();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please choose an image smaller than 5MB."
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const checkContentModeration = async (text) => {
    if (!text.trim()) {
      setModerationWarnings([]);
      return true;
    }

    setIsCheckingContent(true);
    try {
      const { data: moderationResult } = await moderateContent({
        text,
        contentType: 'post'
      });

      setModerationWarnings(moderationResult.warnings || []);
      return moderationResult.isClean;
    } catch (error) {
      console.error('Content moderation error:', error);
      // Fail open - allow post if moderation service is down
      return true;
    } finally {
      setIsCheckingContent(false);
    }
  };

  const handleContentChange = async (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Debounce content moderation check
    setTimeout(() => {
      if (newContent === content) {
        checkContentModeration(newContent);
      }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        variant: "destructive",
        title: "Content Required",
        description: "Please write something to share with the community."
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Final moderation check
      const isContentClean = await checkContentModeration(content);
      
      let imageUrl = null;
      if (imageFile) {
        // Upload image (would integrate with actual file upload service)
        // For now, using a placeholder
        const formData = new FormData();
        formData.append('file', imageFile);
        
        // This would call your upload service
        // const { data: uploadResult } = await uploadFile(formData);
        // imageUrl = uploadResult.file_url;
      }

      const postData = {
        content: content.trim(),
        type: postType,
        user_id: user.id,
        author_name: user.full_name,
        author_avatar_url: user.avatar_url,
        image_url: imageUrl,
        status: isContentClean ? 'published' : 'flagged'
      };

      await Post.create(postData);

      toast({
        title: isContentClean ? "Post Created!" : "Post Under Review",
        description: isContentClean 
          ? "Your post has been shared with the community."
          : "Your post has been submitted for review and will be published shortly."
      });

      onPostCreated();
    } catch (error) {
      console.error('Failed to create post:', error);
      toast({
        variant: "destructive",
        title: "Post Failed",
        description: "Failed to create your post. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share with Teachmo™ Village</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to share?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map(type => (
                <Card
                  key={type.id}
                  className={`p-3 cursor-pointer transition-all ${
                    postType === type.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setPostType(type.id)}
                >
                  <h4 className="font-medium text-sm">{type.label}</h4>
                  <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <Textarea
              value={content}
              onChange={handleContentChange}
              placeholder="What's on your mind? Share your thoughts, questions, or experiences with the community..."
              rows={4}
              className="w-full"
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {content.length}/2000 characters
              </span>
              {isCheckingContent && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking content...
                </div>
              )}
            </div>
          </div>

          {/* Moderation Warnings */}
          <AnimatePresence>
            {moderationWarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-3 border-yellow-300 bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Content Advisory</h4>
                      <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                        {moderationWarnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-yellow-600 mt-2">
                        Your post may be reviewed before appearing in the community.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add an Image (Optional)
            </label>
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload an image</span>
                  <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Share Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}