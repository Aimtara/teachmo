import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Hash, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GenerateReferralCodeModal({ partner, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    code_string: '',
    redemption_limit: '',
    expiration_date: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate a random code
  const generateRandomCode = () => {
    const prefix = partner.name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}${randomSuffix}`;
    setFormData(prev => ({ ...prev, code_string: code }));
  };

  React.useEffect(() => {
    if (!formData.code_string) {
      generateRandomCode();
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.code_string.trim()) {
      newErrors.code_string = 'Code string is required';
    } else if (formData.code_string.length < 4) {
      newErrors.code_string = 'Code must be at least 4 characters';
    } else if (!/^[A-Z0-9]+$/.test(formData.code_string)) {
      newErrors.code_string = 'Code must contain only uppercase letters and numbers';
    }

    if (formData.redemption_limit && formData.redemption_limit < 1) {
      newErrors.redemption_limit = 'Redemption limit must be at least 1';
    }

    if (formData.expiration_date && new Date(formData.expiration_date) <= new Date()) {
      newErrors.expiration_date = 'Expiration date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const codeData = {
        ...formData,
        partner_id: partner.id,
        redemption_limit: formData.redemption_limit ? parseInt(formData.redemption_limit) : null
      };

      await onSave(codeData);
    } catch (error) {
      console.error('Error generating code:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingLicenses = (partner.licenses_allocated || 0) - (partner.licenses_redeemed || 0);

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
          className="max-w-md w-full"
        >
          <Card className="shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Generate Referral Code</CardTitle>
                  <p className="text-sm text-gray-600">Create a new code for {partner.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent>
              {/* Partner Info */}
              <div className="p-4 bg-gray-50 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{partner.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Benefit:</strong> {partner.benefit_type === 'full_premium' ? 'Full Premium Access' : `${partner.benefit_value}% Discount`}</p>
                  <p><strong>Remaining Licenses:</strong> {remainingLicenses} / {partner.licenses_allocated}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code_string">Referral Code *</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="code_string"
                      value={formData.code_string}
                      onChange={(e) => handleInputChange('code_string', e.target.value.toUpperCase())}
                      className={errors.code_string ? 'border-red-500' : ''}
                      placeholder="COMPANY2024"
                    />
                    <Button type="button" variant="outline" onClick={generateRandomCode}>
                      Generate
                    </Button>
                  </div>
                  {errors.code_string && <p className="text-red-500 text-sm mt-1">{errors.code_string}</p>}
                </div>

                <div>
                  <Label htmlFor="redemption_limit">Redemption Limit (Optional)</Label>
                  <Input
                    id="redemption_limit"
                    type="number"
                    min="1"
                    max={remainingLicenses}
                    value={formData.redemption_limit}
                    onChange={(e) => handleInputChange('redemption_limit', e.target.value)}
                    className={errors.redemption_limit ? 'border-red-500' : ''}
                    placeholder="Leave empty for unlimited"
                  />
                  {errors.redemption_limit && <p className="text-red-500 text-sm mt-1">{errors.redemption_limit}</p>}
                  <p className="text-xs text-gray-500 mt-1">Maximum number of times this code can be redeemed</p>
                </div>

                <div>
                  <Label htmlFor="expiration_date">Expiration Date (Optional)</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                    className={errors.expiration_date ? 'border-red-500' : ''}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.expiration_date && <p className="text-red-500 text-sm mt-1">{errors.expiration_date}</p>}
                </div>

                {/* Preview */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Code Preview</h4>
                  <code className="text-lg font-mono bg-white px-3 py-2 rounded border block text-center">
                    {formData.code_string || 'PREVIEW'}
                  </code>
                  <div className="text-sm text-blue-800 mt-2 space-y-1">
                    <p>• {partner.benefit_type === 'full_premium' ? 'Grants full premium access' : `${partner.benefit_value}% discount on subscription`}</p>
                    {formData.redemption_limit && <p>• Can be used {formData.redemption_limit} times</p>}
                    {formData.expiration_date && <p>• Expires on {new Date(formData.expiration_date).toLocaleDateString()}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Generating...' : 'Generate Code'}
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