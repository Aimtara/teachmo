import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { School } from '@/api/entities';
import { Loader2 } from 'lucide-react';

export default function CreateSchoolModal({ open, onOpenChange, onComplete, districtId, districtName }) {
  const [school, setSchool] = useState({
    name: '',
    address: '',
    school_type: 'public',
    district_id: districtId,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSchool(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setSchool(prev => ({ ...prev, school_type: value }));
  };

  const handleSubmit = async () => {
    if (!school.name || !school.school_type) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a school name and type.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await School.create(school);
      toast({
        title: 'School Created',
        description: `${school.name} has been added successfully.`,
      });
      onComplete();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Create School',
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
          <DialogTitle>Add New School{districtName && ` to ${districtName}`}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">School Name</Label>
            <Input id="name" name="name" value={school.name} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" value={school.address} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school_type">School Type</Label>
            <Select onValueChange={handleSelectChange} defaultValue="public">
              <SelectTrigger id="school_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="charter">Charter</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
              'Create School'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}