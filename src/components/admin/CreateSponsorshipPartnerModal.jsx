import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Building, Calendar, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateSponsorshipPartnerModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    benefit_type: 'discount_percentage',
    benefit_value: '',
    licenses_allocated: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (formData.benefit_type === 'discount_percentage') {
      if (!formData.benefit_value || formData.benefit_value < 1 || formData.benefit_value > 100) {
        newErrors.benefit_value = 'Discount must be between 1% and 100%';
      }
    }

    if (!formData.licenses_allocated || formData.licenses_allocated < 1) {
      newErrors.licenses_allocated = 'Must allocate at least 1 license';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const partnerData = {
        ...formData,
        benefit_value: formData.benefit_type === 'full_premium' ? null : parseInt(formData.benefit_value),
        licenses_allocated: parseInt(formData.licenses_allocated)
      };

      await onSave(partnerData);
    } catch (error) {
      console.error('Error creating partner:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <Card className="shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Create Sponsorship Partner</CardTitle>
                  <p className="text-sm text-gray-600">Add a new corporate partner with benefits</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Organization Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={errors.name ? 'border-red-500' : ''}
                        placeholder="Google, Microsoft, etc."
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="contact_name">Contact Person *</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => handleInputChange('contact_name', e.target.value)}
                        className={errors.contact_name ? 'border-red-500' : ''}
                        placeholder="John Smith"
                      />
                      {errors.contact_name && <p className="text-red-500 text-sm mt-1">{errors.contact_name}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      className={errors.contact_email ? 'border-red-500' : ''}
                      placeholder="partner@company.com"
                    />
                    {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>}
                  </div>
                </div>

                {/* Benefit Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Benefit Configuration</h3>
                  
                  <div>
                    <Label>Benefit Type *</Label>
                    <Select value={formData.benefit_type} onValueChange={(value) => handleInputChange('benefit_type', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select benefit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_premium">Full Premium Access</SelectItem>
                        <SelectItem value="discount_percentage">Percentage Discount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.benefit_type === 'discount_percentage' && (
                    <div>
                      <Label htmlFor="benefit_value">Discount Percentage *</Label>
                      <div className="relative mt-2">
                        <Input
                          id="benefit_value"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.benefit_value}
                          onChange={(e) => handleInputChange('benefit_value', e.target.value)}
                          className={errors.benefit_value ? 'border-red-500 pr-8' : 'pr-8'}
                          placeholder="50"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500">%</span>
                        </div>
                      </div>
                      {errors.benefit_value && <p className="text-red-500 text-sm mt-1">{errors.benefit_value}</p>}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="licenses_allocated">Licenses Allocated *</Label>
                    <Input
                      id="licenses_allocated"
                      type="number"
                      min="1"
                      value={formData.licenses_allocated}
                      onChange={(e) => handleInputChange('licenses_allocated', e.target.value)}
                      className={errors.licenses_allocated ? 'border-red-500' : ''}
                      placeholder="100"
                    />
                    {errors.licenses_allocated && <p className="text-red-500 text-sm mt-1">{errors.licenses_allocated}</p>}
                    <p className="text-xs text-gray-500 mt-1">Total number of users who can redeem codes from this partner</p>
                  </div>
                </div>

                {/* Partnership Period */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Partnership Period</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        className={errors.start_date ? 'border-red-500' : ''}
                      />
                      {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
                    </div>

                    <div>
                      <Label htmlFor="end_date">End Date *</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        className={errors.end_date ? 'border-red-500' : ''}
                      />
                      {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Partner'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}