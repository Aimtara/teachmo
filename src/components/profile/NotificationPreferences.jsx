
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Clock,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Loader2,
  Search,
  Tag // Added Tag icon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { priorityNotifications } from '@/api/functions';
import { eventSubscriptions } from '@/api/functions';
import { User as UserApi } from '@/api/entities';

const NOTIFICATION_CATEGORIES = [
  {
    key: 'urgent',
    label: 'Urgent Alerts',
    description: 'School closings, emergencies, and critical updates',
    icon: AlertCircle,
    color: 'text-red-600'
  },
  {
    key: 'assignments',
    label: 'Assignments',
    description: 'Homework updates and due date reminders',
    icon: Bell,
    color: 'text-blue-600'
  },
  {
    key: 'events',
    label: 'Events & Calendar',
    description: 'School events, meetings, and schedule changes',
    icon: Calendar,
    color: 'text-green-600'
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Direct messages from teachers and staff',
    icon: MessageSquare,
    color: 'text-purple-600'
  },
  {
    key: 'activities',
    label: 'Activities',
    description: 'Activity suggestions and completion reminders',
    icon: Sparkles,
    color: 'text-orange-600'
  },
  {
    key: 'offers',
    label: 'Deals & Offers',
    description: 'Special discounts and deals from local partners',
    icon: Tag, // Using the new Tag icon
    color: 'text-pink-600'
  }
];

export default function NotificationPreferences({ user }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({});
  const [eventTypes, setEventTypes] = useState([]);
  const [eventSubs, setEventSubs] = useState({});
  const [priorities, setPriorities] = useState({ senders: {}, channels: {} });
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (user) {
      setPrefs({
        channels: {
          urgent: { sms: false, email: true, push: true },
          assignments: { sms: false, email: true, push: true },
          events: { sms: false, email: true, push: true },
          messages: { sms: false, email: false, push: true },
          activities: { sms: false, email: false, push: true },
          offers: { sms: false, email: false, push: true }, // Added default for 'offers'
          ...(user.notification_preferences?.channels || {})
        },
        digest: {
          enabled: false,
          frequency: 'daily',
          time: '08:00',
          categories: ['assignments', 'events', 'activities', 'offers'], // Added 'offers' to default categories
          ...(user.notification_preferences?.digest || {})
        },
        quiet_hours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
          ...(user.notification_preferences?.quiet_hours || {})
        }
      });
      setEventSubs(user.event_subscriptions || {});
      setPriorities(user.notification_priorities || { senders: {}, channels: {} });
      fetchEventTypes();
    }
  }, [user]);

  const fetchEventTypes = async () => {
    try {
      const response = await eventSubscriptions({ action: 'get_types' });
      setEventTypes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch event types:', error);
      toast({ variant: 'destructive', title: 'Could not load event types' });
    }
  };

  const handleChannelChange = (category, channel, enabled) => {
    setPrefs(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [category]: {
          ...prev.channels[category],
          [channel]: enabled
        }
      }
    }));
  };

  const handleDigestChange = (field, value) => {
    setPrefs(prev => ({
      ...prev,
      digest: {
        ...prev.digest,
        [field]: value
      }
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setPrefs(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }));
  };

  const handleEventSubChange = (eventId, channel, checked) => {
    const currentSubs = eventSubs[eventId] || [];
    let newSubs;
    if (checked) {
      newSubs = [...new Set([...currentSubs, channel])];
    } else {
      newSubs = currentSubs.filter(c => c !== channel);
    }
    setEventSubs(prev => ({ ...prev, [eventId]: newSubs }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await UserApi.updateMyUserData({ 
          notification_preferences: prefs,
          event_subscriptions: eventSubs,
          notification_priorities: priorities,
      });

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
      });
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "There was a problem saving your settings. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addPrioritySender = async (senderId) => {
    setIsSaving(true);
    try {
      const { data } = await priorityNotifications({
        type: 'sender', 
        id: senderId, 
        priority: 'high' 
      });
      setPriorities(data.priorities);
      toast({ title: 'Priority Sender Added' });
    } catch (error) {
      console.error('Failed to add priority sender:', error);
      toast({ variant: 'destructive', title: 'Update Failed' });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!user || !prefs.channels) {
      return (
        <div className="flex justify-center items-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <p className="text-sm text-gray-600">
            Choose how you want to receive different types of notifications
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {NOTIFICATION_CATEGORIES.map(category => {
              const IconComponent = category.icon;
              return (
                <div key={category.key} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-start gap-3 mb-3">
                    <IconComponent className={`w-5 h-5 mt-1 ${category.color}`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{category.label}</h4>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 ml-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">SMS</span>
                      </div>
                      <Switch
                        checked={prefs.channels[category.key]?.sms || false}
                        onCheckedChange={(checked) => 
                          handleChannelChange(category.key, 'sms', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Email</span>
                      </div>
                      <Switch
                        checked={prefs.channels[category.key]?.email || false}
                        onCheckedChange={(checked) => 
                          handleChannelChange(category.key, 'email', checked)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">Push</span>
                      </div>
                      <Switch
                        checked={prefs.channels[category.key]?.push || false}
                        onCheckedChange={(checked) => 
                          handleChannelChange(category.key, 'push', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Digest</h3>
        <p className="text-sm text-gray-600">
            Group non-urgent notifications into a single email
        </p>
        <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Enable Digest</span>
              <Switch
                checked={prefs.digest.enabled}
                onCheckedChange={(checked) => handleDigestChange('enabled', checked)}
              />
            </div>
            
            {prefs.digest.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pl-4 border-l-2 border-gray-100"
              >
                <div>
                  <Label className="block text-sm font-medium mb-2">Frequency</Label>
                  <Select
                    value={prefs.digest.frequency}
                    onValueChange={(value) => handleDigestChange('frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twice_daily">Twice Daily</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium mb-2">Delivery Time</Label>
                  <Select
                    value={prefs.digest.time}
                    onValueChange={(value) => handleDigestChange('time', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                      <SelectItem value="19:00">7:00 PM</SelectItem>
                      <SelectItem value="20:00">8:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium mb-2">Include Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {['assignments', 'events', 'activities', 'offers'].map(category => (
                      <Badge
                        key={category}
                        variant={prefs.digest.categories.includes(category) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const newCategories = prefs.digest.categories.includes(category)
                            ? prefs.digest.categories.filter(c => c !== category)
                            : [...prefs.digest.categories, category];
                          handleDigestChange('categories', newCategories);
                        }}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Event Subscriptions</h3>
        <p className="text-sm text-gray-600">Opt-in to get instant alerts for specific school events. These bypass digest settings.</p>
        <div className="space-y-3 rounded-lg border p-4">
          {eventTypes.length > 0 ? (
            eventTypes.map(type => (
              <div key={type.id} className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                  <Label htmlFor={`event-${type.id}`} className="font-medium">{type.name}</Label>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 sm:mt-0">
                  {['sms', 'email', 'push'].map(channel => (
                    <div key={channel} className="flex items-center gap-2">
                      <Switch
                        id={`event-${type.id}-${channel}`}
                        checked={eventSubs[type.id]?.includes(channel) || false}
                        onCheckedChange={(checked) => handleEventSubChange(type.id, channel, checked)}
                      />
                      <Label htmlFor={`event-${type.id}-${channel}`} className="text-xs capitalize">{channel}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No event types available at this time.</p>
          )}
        </div>
      </div>

       <div className="space-y-4">
        <h3 className="text-lg font-medium">Priority Senders</h3>
        <p className="text-sm text-gray-600">Messages from these senders (e.g., your child's school) will always be sent instantly.</p>
        <div className="rounded-lg border p-4">
          <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => addPrioritySender('school_id_placeholder')}>
                  Set My School as Priority
              </Button>
               <Button variant="outline" size="sm" onClick={() => addPrioritySender('district_id_placeholder')}>
                  Set My District as Priority
              </Button>
          </div>
          {Object.keys(priorities.senders).length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Priority Senders:</p>
              <ul className="list-disc pl-5">
                {Object.entries(priorities.senders).map(([senderId, priority]) => (
                  <li key={senderId} className="text-sm">
                    {senderId} (Priority: {priority})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No priority senders added yet.</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <p className="text-sm text-gray-600">
            Pause non-urgent notifications during specified hours
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Enable Quiet Hours</span>
              <Switch
                checked={prefs.quiet_hours.enabled}
                onCheckedChange={(checked) => 
                  handleQuietHoursChange('enabled', checked)
                }
              />
            </div>
            
            {prefs.quiet_hours.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-gray-100"
              >
                <div>
                  <Label className="block text-sm font-medium mb-2">Start Time</Label>
                  <Select
                    value={prefs.quiet_hours.start}
                    onValueChange={(value) => handleQuietHoursChange('start', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="block text-sm font-medium mb-2">End Time</Label>
                  <Select
                    value={prefs.quiet_hours.end}
                    onValueChange={(value) => handleQuietHoursChange('end', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <Button 
          onClick={saveSettings}
          disabled={isSaving}
          size="lg"
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </motion.div>
    </div>
  );
}
