import React, { useState } from 'react';
import { PartnerEvent } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, MapPin, Clock, Users, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function PartnerEventForm({ partner, events, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    start_time: '',
    end_time: '',
    location_name: '',
    address: '',
    is_virtual: false,
    virtual_link: '',
    is_free: true,
    price: '',
    registration_url: '',
    image_url: '',
    min_age: '',
    max_age: '',
    max_participants: '',
    tags: []
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      start_time: '',
      end_time: '',
      location_name: '',
      address: '',
      is_virtual: false,
      virtual_link: '',
      is_free: true,
      price: '',
      registration_url: '',
      image_url: '',
      min_age: '',
      max_age: '',
      max_participants: '',
      tags: []
    });
    setEditingEvent(null);
  };

  const handleEdit = (event) => {
    setFormData({
      ...event,
      start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
      end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
      min_age: event.age_range?.min_age || '',
      max_age: event.age_range?.max_age || '',
      tags: event.tags || []
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const eventData = {
        partner_id: partner.id,
        ...formData,
        age_range: formData.min_age && formData.max_age ? {
          min_age: parseInt(formData.min_age),
          max_age: parseInt(formData.max_age)
        } : null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        status: 'pending_review'
      };

      if (editingEvent) {
        await PartnerEvent.update(editingEvent.id, eventData);
        toast({
          title: 'Event Updated',
          description: 'Your event has been updated and is pending review.'
        });
      } else {
        await PartnerEvent.create(eventData);
        toast({
          title: 'Event Submitted',
          description: 'Your event has been submitted for review.'
        });
      }

      setShowForm(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save event. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await PartnerEvent.delete(eventId);
        toast({
          title: 'Event Deleted',
          description: 'Event has been removed.'
        });
        onUpdate();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete event.'
        });
      }
    }
  };

  const canCreateEvent = partner.status === 'approved' && 
    (partner.subscription_tier === 'pro' || partner.listings_used_this_month < partner.monthly_listing_limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Events</h2>
          {partner.subscription_tier === 'free' && (
            <p className="text-sm text-gray-600">
              {partner.listings_used_this_month}/{partner.monthly_listing_limit} events used this month
            </p>
          )}
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              disabled={!canCreateEvent}
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="camp">Camp</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="start_time">Start Date & Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">End Date & Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      checked={formData.is_virtual}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_virtual: checked }))}
                    />
                    <Label>Virtual Event</Label>
                  </div>
                </div>

                {formData.is_virtual ? (
                  <div className="col-span-2">
                    <Label htmlFor="virtual_link">Virtual Event Link</Label>
                    <Input
                      id="virtual_link"
                      type="url"
                      value={formData.virtual_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, virtual_link: e.target.value }))}
                      placeholder="https://zoom.us/..."
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="location_name">Venue Name *</Label>
                      <Input
                        id="location_name"
                        value={formData.location_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                        required={!formData.is_virtual}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      checked={formData.is_free}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_free: checked }))}
                    />
                    <Label>Free Event</Label>
                  </div>
                  {!formData.is_free && (
                    <Input
                      placeholder="Event price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    />
                  )}
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

                <div className="col-span-2">
                  <Label htmlFor="registration_url">Registration Link</Label>
                  <Input
                    id="registration_url"
                    type="url"
                    value={formData.registration_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, registration_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingEvent ? 'Update Event' : 'Submit Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.map(event => (
          <Card key={event.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <Badge className={
                      event.status === 'approved' ? 'bg-green-100 text-green-800' :
                      event.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                      event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {event.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.start_time).toLocaleDateString()} at{' '}
                      {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.is_virtual ? 'Virtual Event' : event.location_name}
                    </div>
                    {event.impressions > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {event.impressions} views
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {event.clicks} clicks, {event.rsvps} RSVPs
                        </div>
                      </>
                    )}
                  </div>

                  {event.status === 'rejected' && event.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {event.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(event)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {events.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No events yet. Create your first event to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}