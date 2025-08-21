
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Flag, Loader2 } from 'lucide-react'; // Shield icon is no longer needed
import { submitReport } from '@/api/functions';
import { useToast } from '@/components/ui/use-toast';

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or Bullying', description: 'Targeting someone with hurtful content' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Content that attacks or demeans a group' },
  { value: 'spam', label: 'Spam', description: 'Repetitive, promotional, or off-topic content' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Content not suitable for our community' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'privacy_violation', label: 'Privacy Violation', description: 'Sharing personal information without consent' },
  { value: 'threats', label: 'Threats or Violence', description: 'Threatening harm to someone' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'other', label: 'Other', description: 'Something else that violates our guidelines' }
];

export default function ReportModal({ open, onOpenChange, contentType, contentId, reportedUserId }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); // New state for validation errors
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      setError('Please select a reason for your report.');
      return;
    }
    
    setError(''); // Clear any previous errors
    setIsSubmitting(true);

    try {
      await submitReport({
        content_type: contentType,
        content_id: contentId,
        reported_user_id: reportedUserId,
        report_reason: reason,
        description: description
      });

      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep the Teachmo™ community safe. Our team will review your report shortly."
      });
      
      // Close the modal and reset state immediately on success
      onOpenChange(false);
      setReason('');
      setDescription('');

    } catch (err) {
      console.error('Error submitting report:', err);
      toast({
        variant: "destructive",
        title: "Failed to submit report",
        description: err.message || "Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedReason = REPORT_REASONS.find(r => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report Content
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Reports are reviewed by our moderation team. False reports may result in account restrictions.
            </AlertDescription>
          </Alert>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you reporting this content? *
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="mt-1 text-sm text-gray-600">{selectedReason.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Additional details (optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context that might help our review..."
              rows={3}
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {description.length}/500
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !reason}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
