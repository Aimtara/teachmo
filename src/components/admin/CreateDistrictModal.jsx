import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { District } from '@/api/entities';
import { Loader2 } from 'lucide-react';

export default function CreateDistrictModal({ open, onOpenChange, onComplete }) {
  const [district, setDistrict] = useState({
    name: '',
    state: '',
    country: 'US',
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDistrict(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!district.name || !district.state) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a district name and state.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await District.create(district);
      toast({
        title: 'District Created',
        description: `${district.name} has been created successfully.`,
      });
      onComplete();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Create District',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New District</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">District Name</Label>
            <Input id="name" name="name" value={district.name} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" value={district.state} onChange={handleInputChange} placeholder="e.g., CA, NY, TX" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" value={district.country} onChange={handleInputChange} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Create District'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}