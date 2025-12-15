import React, { useState } from 'react';
import { Partner } from '@/api/entities';
import { uploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Upload, Loader2, Crown, CreditCard } from 'lucide-react';

export default function PartnerProfile({ partner, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    organization_name: partner.organization_name,
    contact_name: partner.contact_name,
    contact_email: partner.contact_email,
    contact_phone: partner.contact_phone || '',
    website: partner.website || '',
    description: partner.description || '',
    logo_url: partner.logo_url || ''
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      toast({
        title: 'Logo Uploaded',
        description: 'Logo has been uploaded successfully.'
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to upload logo. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Partner.update(partner.id, formData);
      toast({
        title: 'Profile Updated',
        description: 'Your organization profile has been updated.'
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgrade = () => {
    // In a real app, this would redirect to a payment page
    toast({
      title: 'Upgrade to Pro',
      description: 'Contact our sales team to upgrade your partnership plan.'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organization Profile</h2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {isEditing && (
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload Logo
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="organization_name">Organization Name</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={!isEditing}
                rows={4}
                placeholder="Tell us about your organization and mission..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partnership Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <div className="mt-1">
                  <Badge className={
                    partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                    partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {partner.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Partnership Level</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={
                    partner.subscription_tier === 'pro' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }>
                    {partner.subscription_tier === 'pro' && <Crown className="w-3 h-3 mr-1" />}
                    {partner.subscription_tier === 'pro' ? 'Pro Partner' : 'Free Partner'}
                  </Badge>
                </div>
              </div>

              {partner.subscription_tier === 'free' && (
                <div className="pt-4 border-t">
                  <Button onClick={handleUpgrade} className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {partner.subscription_tier === 'free' ? (
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {partner.listings_used_this_month}/{partner.monthly_listing_limit}
                  </div>
                  <p className="text-sm text-gray-600">Events this month</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">∞</div>
                  <p className="text-sm text-gray-600">Unlimited events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}