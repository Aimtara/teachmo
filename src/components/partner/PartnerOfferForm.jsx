import React, { useState } from 'react';
import { PartnerOffer } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Tag, Edit, Trash2, Loader2, Eye, Heart, MousePointer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function PartnerOfferForm({ partner, offers = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_type: '',
    discount_value: '',
    original_price: '',
    discounted_price: '',
    promo_code: '',
    redemption_url: '',
    terms_conditions: '',
    start_date: '',
    end_date: '',
    max_redemptions: '',
    category: '',
    min_age: '',
    max_age: '',
    image_url: '',
    tags: []
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_type: '',
      discount_value: '',
      original_price: '',
      discounted_price: '',
      promo_code: '',
      redemption_url: '',
      terms_conditions: '',
      start_date: '',
      end_date: '',
      max_redemptions: '',
      category: '',
      min_age: '',
      max_age: '',
      image_url: '',
      tags: []
    });
    setEditingOffer(null);
  };

  const handleEdit = (offer) => {
    setFormData({
      ...offer,
      start_date: offer.start_date ? new Date(offer.start_date).toISOString().slice(0, 16) : '',
      end_date: offer.end_date ? new Date(offer.end_date).toISOString().slice(0, 16) : '',
      min_age: offer.age_range?.min_age || '',
      max_age: offer.age_range?.max_age || '',
      max_redemptions: offer.max_redemptions || '',
      tags: offer.tags || []
    });
    setEditingOffer(offer);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const offerData = {
        partner_id: partner.id,
        ...formData,
        age_range: formData.min_age && formData.max_age ? {
          min_age: parseInt(formData.min_age),
          max_age: parseInt(formData.max_age)
        } : null,
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : null,
        status: 'pending_review'
      };

      if (editingOffer) {
        await PartnerOffer.update(editingOffer.id, offerData);
        toast({
          title: 'Offer Updated',
          description: 'Your offer has been updated and is pending review.'
        });
      } else {
        await PartnerOffer.create(offerData);
        toast({
          title: 'Offer Submitted',
          description: 'Your offer has been submitted for review.'
        });
      }

      setShowForm(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save offer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save offer. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (offerId) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      try {
        await PartnerOffer.delete(offerId);
        toast({
          title: 'Offer Deleted',
          description: 'Offer has been removed.'
        });
        onUpdate();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete offer.'
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Deals & Offers</h2>
          <p className="text-sm text-gray-600">Create special deals and discounts for families</p>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              disabled={partner.status !== 'approved'}
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Offer Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., 20% off Summer Camp Registration"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe what makes this offer special..."
                    required
                  />
                </div>

                <div>
                  <Label>Offer Type *</Label>
                  <Select 
                    value={formData.offer_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, offer_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select offer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                      <SelectItem value="bogo">Buy One Get One</SelectItem>
                      <SelectItem value="free_trial">Free Trial</SelectItem>
                      <SelectItem value="bundle_deal">Bundle Deal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discount_value">Discount Value *</Label>
                  <Input
                    id="discount_value"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                    placeholder="e.g., 20%, $10 off, BOGO"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="original_price">Original Price</Label>
                  <Input
                    id="original_price"
                    value={formData.original_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                    placeholder="e.g., $50"
                  />
                </div>

                <div>
                  <Label htmlFor="discounted_price">Discounted Price</Label>
                  <Input
                    id="discounted_price"
                    value={formData.discounted_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, discounted_price: e.target.value }))}
                    placeholder="e.g., $40"
                  />
                </div>

                <div>
                  <Label htmlFor="promo_code">Promo Code</Label>
                  <Input
                    id="promo_code"
                    value={formData.promo_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value }))}
                    placeholder="e.g., SAVE20"
                  />
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="recreational">Recreational</SelectItem>
                      <SelectItem value="health">Health & Wellness</SelectItem>
                      <SelectItem value="arts">Arts & Crafts</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="min_age">Min Age</Label>
                  <Input
                    id="min_age"
                    type="number"
                    min="0"
                    max="18"
                    value={formData.min_age}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_age: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="max_age">Max Age</Label>
                  <Input
                    id="max_age"
                    type="number"
                    min="0"
                    max="18"
                    value={formData.max_age}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_age: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="max_redemptions">Max Redemptions</Label>
                  <Input
                    id="max_redemptions"
                    type="number"
                    min="1"
                    value={formData.max_redemptions}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_redemptions: e.target.value }))}
                    placeholder="Leave blank for unlimited"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="redemption_url">Redemption URL</Label>
                  <Input
                    id="redemption_url"
                    type="url"
                    value={formData.redemption_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, redemption_url: e.target.value }))}
                    placeholder="https://yoursite.com/offer"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="image_url">Promotional Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="terms_conditions">Terms & Conditions</Label>
                  <Textarea
                    id="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                    rows={3}
                    placeholder="Enter any terms, restrictions, or conditions..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingOffer ? 'Update Offer' : 'Submit Offer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {offers.map(offer => (
          <Card key={offer.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{offer.title}</h3>
                    <Badge className={
                      offer.status === 'published' ? 'bg-green-100 text-green-800' :
                      offer.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      offer.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                      offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {offer.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      <Tag className="w-3 h-3 mr-1" />
                      {offer.discount_value}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{offer.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Category: {offer.category}</div>
                    <div>Expires: {new Date(offer.end_date).toLocaleDateString()}</div>
                    {offer.impressions > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          {offer.impressions} views
                        </div>
                        <div className="flex items-center gap-2">
                          <MousePointer className="w-4 h-4" />
                          {offer.clicks} clicks • {offer.saves} saves
                        </div>
                      </>
                    )}
                  </div>

                  {offer.status === 'rejected' && offer.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {offer.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(offer)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDelete(offer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {offers.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No offers yet. Create your first deal to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}