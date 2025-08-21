import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Child } from '@/api/entities';
import { User } from '@/api/entities';
import { Plus, Baby, Calendar, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SchoolAutoComplete from '@/components/onboarding/SchoolAutoComplete';

export default function QuickChildSetup({ onChildAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    grade_level: ''
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.birth_date) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide your child's name and birth date."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Calculate age from birth date
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

      const childData = {
        name: formData.name,
        birth_date: formData.birth_date,
        age: age,
        grade_level: formData.grade_level || null,
        school_name: selectedSchool?.school_name || null,
        school_domain: selectedSchool?.school_domain || null,
        school_id: selectedSchool?.school_id || null,
        avatar: '👶',
        color: '#6B9DC8',
        interests: [],
        challenges: [],
        data_collection_consent: true
      };

      const newChild = await Child.create(childData);
      
      // Update user onboarding status if this is their first child
      try {
        await User.updateMyUserData({
          onboarding_completed: true,
          onboarding_step: 3
        });
      } catch (userUpdateError) {
        console.warn('Could not update user onboarding status:', userUpdateError);
      }

      toast({
        title: "Child Profile Created! 🎉",
        description: `${formData.name}'s profile has been set up. You'll start seeing personalized activities soon!`
      });

      // Reset form
      setFormData({ name: '', birth_date: '', grade_level: '' });
      setSelectedSchool(null);
      setIsOpen(false);
      
      // Trigger parent refresh
      if (onChildAdded) {
        onChildAdded();
      }
      
    } catch (error) {
      console.error('Error creating child profile:', error);
      toast({
        variant: "destructive",
        title: "Profile Creation Failed",
        description: "Could not create your child's profile. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50" onClick={() => setIsOpen(true)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Your First Child</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Get started with personalized activities and AI guidance tailored to your child's development.
              </p>
            </div>
            <Button size="lg" className="mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Create Child Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Baby className="w-6 h-6 text-blue-600" />
            Quick Child Setup
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add your child's basic information to get started with personalized recommendations.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Child's Name *</Label>
              <Input
                id="name"
                placeholder="Enter your child's first name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="birth_date">Birth Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="birth_date"
                  type="date"
                  className="pl-10"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="grade_level">Grade Level (Optional)</Label>
              <Select value={formData.grade_level} onValueChange={(value) => handleInputChange('grade_level', value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PreK">Pre-K</SelectItem>
                  <SelectItem value="K">Kindergarten</SelectItem>
                  <SelectItem value="1">1st Grade</SelectItem>
                  <SelectItem value="2">2nd Grade</SelectItem>
                  <SelectItem value="3">3rd Grade</SelectItem>
                  <SelectItem value="4">4th Grade</SelectItem>
                  <SelectItem value="5">5th Grade</SelectItem>
                  <SelectItem value="6">6th Grade</SelectItem>
                  <SelectItem value="7">7th Grade</SelectItem>
                  <SelectItem value="8">8th Grade</SelectItem>
                  <SelectItem value="9">9th Grade</SelectItem>
                  <SelectItem value="10">10th Grade</SelectItem>
                  <SelectItem value="11">11th Grade</SelectItem>
                  <SelectItem value="12">12th Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>School (Optional)</Label>
              <SchoolAutoComplete
                onSelect={setSelectedSchool}
                selectedSchool={selectedSchool}
                placeholder="Type your child's school name..."
              />
              {selectedSchool && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Selected: {selectedSchool.school_name}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Profile
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}