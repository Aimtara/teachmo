import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserFeedback } from '@/api/entities';
import { User } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState('general_comment');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const userRef = useRef(null);

    const toggleOpen = async () => {
        if (!isOpen && !userRef.current) {
            try {
                userRef.current = await User.me();
            } catch (error) {
                toast({ variant: 'destructive', title: 'Please log in to submit feedback.' });
                return;
            }
        }
        setIsOpen(!isOpen);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (comment.trim().length < 10) {
            toast({ variant: 'destructive', title: 'Please provide more detail in your feedback.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await UserFeedback.create({
                user_id: userRef.current.id,
                user_email: userRef.current.email,
                page_url: window.location.href,
                feedback_type: feedbackType,
                comment: comment,
            });
            toast({ title: 'Feedback Sent!', description: "Thank you for helping us improve Teachmo." });
            setIsOpen(false);
            setComment('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not send feedback. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-80 bg-card border rounded-lg shadow-xl p-4 mb-2 origin-bottom-right"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold">Share Your Feedback</h4>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Select value={feedbackType} onValueChange={setFeedbackType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select feedback type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general_comment">General Comment</SelectItem>
                                    <SelectItem value="bug_report">Report a Bug</SelectItem>
                                    <SelectItem value="feature_suggestion">Suggest a Feature</SelectItem>
                                    <SelectItem value="ui_ux_issue">UI/UX Issue</SelectItem>
                                </SelectContent>
                            </Select>
                            <Textarea
                                placeholder="Tell us what you think..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={5}
                                required
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Feedback
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
            <Button size="icon" className="rounded-full w-14 h-14 shadow-lg" onClick={toggleOpen}>
                <MessageSquarePlus />
            </Button>
        </div>
    );
}