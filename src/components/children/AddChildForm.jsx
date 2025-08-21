import React, { useState, useEffect } from 'react';
import { Child } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AddChildForm({ onChildAdded, onCancel, childToEdit = null }) {
  const [childData, setChildData] = useState({
    name: childToEdit?.name || '',
    birth_date: childToEdit?.birth_date || '',
    school_name: childToEdit?.school_name || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const setSmartDefaults = async () => {
        // Only set defaults for a new child, not when editing
        if (!childToEdit) { 
            try {
                const existingChildren = await Child.list('-created_date', 1);
                if (existingChildren.length > 0) {
                    const lastChild = existingChildren[0];
                    // Smart default for school name
                    if (lastChild.school_name) {
                        setChildData(prev => ({ ...prev, school_name: lastChild.school_name }));
                        toast({
                            title: "Smart Default Applied",
                            description: "We've pre-filled the school name based on your other children.",
                            duration: 3000,
                        });
                    }
                }
            } catch (error) {
                console.error("Could not fetch existing children for smart defaults:", error);
            }
        }
    };
    setSmartDefaults();
  }, [childToEdit, toast]);


  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setChildData({ ...childData, [id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!childData.name || !childData.birth_date) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide your child's name and birth date.",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (childToEdit) {
        await Child.update(childToEdit.id, childData);
      } else {
        const birthDate = new Date(childData.birth_date);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        await Child.create({
            ...childData,
            age: age,
            interests: [],
            challenges: [],
            avatar: '👶',
            color: '#7C9885'
        });
      }
      toast({
        title: childToEdit ? "Child Updated!" : "Child Added!",
        description: `${childData.name}'s profile has been saved.`,
      });
      if (onChildAdded) onChildAdded();
    } catch (error) {
      console.error('Error saving child:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "There was a problem saving the child's profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <Label htmlFor="name">Child's Name</Label>
        <Input id="name" value={childData.name} onChange={handleInputChange} placeholder="e.g., Alex" />
      </div>
      <div>
        <Label htmlFor="birth_date">Birth Date</Label>
        <Input id="birth_date" type="date" value={childData.birth_date} onChange={handleInputChange} />
      </div>
      <div>
        <Label htmlFor="school_name">School Name (Optional)</Label>
        <Input id="school_name" value={childData.school_name} onChange={handleInputChange} placeholder="e.g., Lincoln Elementary" />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {childToEdit ? 'Save Changes' : 'Add Child'}
        </Button>
      </div>
    </motion.form>
  );
}
