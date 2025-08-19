import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Building, ArrowRight, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AssignSchoolModal({ school, districts, onAssign, onCancel }) {
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDistrict) return;

    setIsSubmitting(true);
    try {
      await onAssign(selectedDistrict);
    } catch (error) {
      console.error('Error assigning school:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDistrictData = districts.find(d => d.id === selectedDistrict);

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
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Assign School to District</CardTitle>
                  <p className="text-sm text-gray-600">Move school from pilot to district</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Current School */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <School className="w-5 h-5 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{school.name}</h3>
                      <p className="text-sm text-gray-600">
                        Current status: {school.status?.replace('_', ' ') || 'Pilot'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>

                {/* District Selection */}
                <div>
                  <Label htmlFor="district">Select District</Label>
                  <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a district..." />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(district => (
                        <SelectItem key={district.id} value={district.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{district.name}</span>
                            <span className="text-xs text-gray-500">
                              {district.school_count || 0} schools • {district.state}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview */}
                {selectedDistrictData && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedDistrictData.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {school.name} will become a district member
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!selectedDistrict || isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign School'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
