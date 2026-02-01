import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { School, Mail, Globe, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { SchoolService } from '@/services/schools/schoolService';

export default function RequestSchoolModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    school_name: '',
    school_domain: '',
    contact_email: '',
    additional_notes: ''
  });
  const [errors, setErrors] = useState({});

  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.school_name.trim()) {
      newErrors.school_name = 'School name is required';
    }
    
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }

    if (formData.school_domain && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.school_domain)) {
      newErrors.school_domain = 'Please enter a valid domain (e.g., schoolname.edu)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const request = await SchoolService.requestSchool({
        name: formData.school_name,
        domain: formData.school_domain,
        contact: formData.contact_email,
        notes: formData.additional_notes
      });
      setStep(3);
      toast({
        title: "Request Submitted! 🎉",
        description: "We'll review your school request and get back to you soon."
      });

      if (onSuccess) {
        onSuccess(request);
      }
    } catch (error) {
      console.error('Error submitting school request:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Could not submit your request. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      school_name: '',
      school_domain: '',
      contact_email: '',
      additional_notes: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5 text-blue-600" />
                  Request School Integration
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Don't see your school in our directory? Let us know and we'll work to add it!
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    We're actively expanding our school partnerships. Submit your request and we'll reach out to your school administration to explore integration options.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="school_name">School Name *</Label>
                    <Input
                      id="school_name"
                      value={formData.school_name}
                      onChange={(e) => handleInputChange('school_name', e.target.value)}
                      placeholder="Lincoln Elementary School"
                      className={errors.school_name ? 'border-red-500' : ''}
                    />
                    {errors.school_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.school_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="school_domain">School Website/Domain</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="school_domain"
                        value={formData.school_domain}
                        onChange={(e) => handleInputChange('school_domain', e.target.value)}
                        placeholder="lincoln-elementary.edu"
                        className={`pl-10 ${errors.school_domain ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.school_domain && (
                      <p className="text-sm text-red-600 mt-1">{errors.school_domain}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      This helps us identify and contact your school
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="contact_email">School Contact Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => handleInputChange('contact_email', e.target.value)}
                        placeholder="admin@lincoln-elementary.edu"
                        className={`pl-10 ${errors.contact_email ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.contact_email && (
                      <p className="text-sm text-red-600 mt-1">{errors.contact_email}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: A contact at the school who might help with integration
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep(2)}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Additional Information
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Any additional details that might help us connect with your school?
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="additional_notes">Additional Notes</Label>
                  <Textarea
                    id="additional_notes"
                    value={formData.additional_notes}
                    onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                    placeholder="e.g., 'I know the principal personally' or 'The school is already interested in parent engagement tools'"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Anything that might help facilitate the introduction
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>What happens next?</strong>
                    <br />
                    1. We'll review your request<br />
                    2. Our team will reach out to your school<br />
                    3. You'll be notified when integration is available
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Request Submitted Successfully!
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Thank you for your request to add <strong>{formData.school_name}</strong> to Teachmo. 
                  Our team will review it and reach out to the school administration to explore integration opportunities.
                </p>

                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>What's next?</strong><br />
                    • We'll review your request within 2-3 business days<br />
                    • Our team will contact the school directly<br />
                    • You'll receive an email update on our progress
                  </p>
                </div>

                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
