import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { submitReport } from '@/api/functions'; // Assuming this function exists
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ReportConcernModal({ open, onOpenChange, contentType, contentId, reportedUserId }) {
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description Required',
        description: 'Please describe the concern.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReport({
        contentType,
        contentId,
        reportedUserId,
        reportReason: 'safety_concern',
        description,
        isAnonymous,
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. Our team will review your report shortly.',
      });
      onOpenChange(false);
      setDescription('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your report. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            Report a Safety Concern
          </DialogTitle>
          <DialogDescription>
            Your report is confidential and helps us maintain a safe environment. If this is an emergency, please contact
            local authorities immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concern-description">Please describe the issue in detail</Label>
            <Textarea
              id="concern-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible, such as what happened, when, and where."
              rows={5}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous-report"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
            <Label htmlFor="anonymous-report" className="text-sm font-normal">
              Submit anonymously
            </Label>
          </div>
           <p className="text-xs text-gray-500">
              If you submit anonymously, we will not be able to follow up with you directly. Your report will still be reviewed.
            </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}