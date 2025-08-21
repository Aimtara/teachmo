import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TermsModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4 text-sm">
          <p className="mb-2 font-semibold">1. Introduction</p>
          <p className="mb-4">Welcome to Teachmo! These terms and conditions outline the rules and regulations for the use of Teachmo's Website, located at teachmo.app. By accessing this website we assume you accept these terms and conditions. Do not continue to use Teachmo if you do not agree to take all of the terms and conditions stated on this page.</p>
          
          <p className="mb-2 font-semibold">2. Intellectual Property Rights</p>
          <p className="mb-4">Other than the content you own, under these Terms, Teachmo and/or its licensors own all the intellectual property rights and materials contained in this Website. You are granted limited license only for purposes of viewing the material contained on this Website.</p>

          <p className="mb-2 font-semibold">3. Restrictions</p>
          <p className="mb-4">You are specifically restricted from all of the following: publishing any Website material in any other media; selling, sublicensing and/or otherwise commercializing any Website material; publicly performing and/or showing any Website material; using this Website in any way that is or may be damaging to this Website; using this Website in any way that impacts user access to this Website...</p>

        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}