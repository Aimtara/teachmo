import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Target, Zap, AlertCircle, CheckCircle2, Save, Loader2, ExternalLink, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const WEEKDAY_TIME_SLOTS = [
  { id: 'early_morning', label: 'Early Morning (6-8am)', description: 'Before the day gets busy' },
  { id: 'morning', label: 'Morning (8-11am)', description: 'After breakfast routines' },
  { id: 'afternoon', label: 'Afternoon (12-3pm)', description: 'Lunch and quiet time' },
  { id: 'after_school', label: 'After School (3-6pm)', description: 'Post-school activities' },
  { id: 'evening', label: 'Evening (6-8pm)', description: 'Family time before bedtime' },
  { id: 'bedtime', label: 'Bedtime Routine (8-9pm)', description: 'Calming activities' }
];

const WEEKEND_TIME_SLOTS = [
  { id: 'saturday_morning', label: 'Saturday Morning', description: 'Relaxed weekend start' },
  { id: 'saturday_afternoon', label: 'Saturday Afternoon', description: 'Weekend adventures' },
  { id: 'saturday_evening', label: 'Saturday Evening', description: 'Family bonding time' },
  { id: 'sunday_morning', label: 'Sunday Morning', description: 'Slow weekend mornings' },
  { id: 'sunday_afternoon', label: 'Sunday Afternoon', description: 'Weekend wrap-up' },
  { id: 'sunday_evening', label: 'Sunday Evening', description: 'Prep for the week' }
];

const INTENSITY_LEVELS = [
  {
    value: 'light',
    title: 'Light Suggestions',
    description: 'Gentle nudges 2-3 times per week',
    icon: '🌱'
  },
  {
    value: 'balanced',
    title: 'Balanced',
    description: 'Daily suggestions with flexibility',
    icon: '⚖️'
  },
  {
    value: 'proactive',
    title: 'Highly Proactive',
    description: 'Multiple daily opportunities',
    icon: '🚀'
  }
];

const AVAILABILITY_PRESETS = {
  busy_parent: {
    name: "Busy Parent",
    weekday_availability: ['evening'],
    weekend_availability: ['saturday_afternoon', 'sunday_morning'],
    preferred_length: '15',
    intensity: 'light',
    ad_hoc_suggestions: true
  },
  evenings_only: {
    name: "Evenings Only",
    weekday_availability: ['evening', 'bedtime'],
    weekend_availability: ['saturday_evening', 'sunday_evening'],
    preferred_length: '30',
    intensity: 'balanced',
    ad_hoc_suggestions: false
  },
  weekend_warrior: {
    name: "Weekend Warrior",
    weekday_availability: [],
    weekend_availability: ['saturday_morning', 'saturday_afternoon', 'sunday_morning', 'sunday_afternoon'],
    preferred_length: '60',
    intensity: 'proactive',
    ad_hoc_suggestions: true
  }
};

const DEFAULT_PREFERENCES = {
  weekday_availability: ['afternoon', 'evening'],
  weekend_availability: ['saturday_morning', 'sunday_afternoon'],
  preferred_length: '30',
  intensity: 'balanced',
  ad_hoc_suggestions: true,
  calendar_sync_enabled: false,
  calendar_provider: null,
  scan_family_events: false,
  activity_overlay: false,
  calendar_sync_completed: false
};

export default function AvailabilitySettings({ user }) {
  const [preferences, setPreferences] = useState(user.scheduling_preferences || DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);

  useEffect(() => {
    const userPrefs = user.scheduling_preferences || {};
    const initialPrefs = {
      ...DEFAULT_PREFERENCES,
      ...userPrefs,
      weekday_availability: userPrefs.weekday_availability || DEFAULT_PREFERENCES.weekday_availability,
      weekend_availability: userPrefs.weekend_availability || DEFAULT_PREFERENCES.weekend_availability
    };
    setPreferences(initialPrefs);
  }, [user]);

  const handlePresetApply = (presetKey) => {
    const preset = AVAILABILITY_PRESETS[presetKey];
    setPreferences(prev => ({
      ...prev,
      ...preset
    }));
    setSelectedPreset(presetKey);
  };

  const handleWeekdayChange = (slotId, checked) => {
    setPreferences(prev => ({
      ...prev,
      weekday_availability: checked 
        ? [...prev.weekday_availability, slotId]
        : prev.weekday_availability.filter(id => id !== slotId)
    }));
    setSelectedPreset(null);
  };

  const handleWeekendChange = (slotId, checked) => {
    setPreferences(prev => ({
      ...prev,
      weekend_availability: checked 
        ? [...prev.weekend_availability, slotId]
        : prev.weekend_availability.filter(id => id !== slotId)
    }));
    setSelectedPreset(null);
  };

  const handleCalendarConnect = async (provider) => {
    try {
      // In a real implementation, this would redirect to OAuth flow
      const authUrl = {
        google: 'https://accounts.google.com/oauth/v2/auth',
        apple: 'https://appleid.apple.com/auth/authorize',
        outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
      }[provider];

      // Simulate OAuth flow success
      setPreferences(prev => ({
        ...prev,
        calendar_sync_enabled: true,
        calendar_provider: provider,
        calendar_sync_completed: true
      }));

      // In real implementation, would open popup/redirect
      alert(`Calendar sync with ${provider} would be initiated here. For this demo, it's marked as connected.`);
      
    } catch (error) {
      console.error('Calendar connection error:', error);
      alert('Failed to connect calendar. Please try again.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await User.updateMyUserData({ scheduling_preferences: preferences });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving availability preferences", e);
    }
    setIsSaving(false);
  };

  const getActivityLengthLabel = (minutes) => {
    if (minutes < 15) return 'Quick Activities (<15 min)';
    if (minutes <= 30) return 'Short Activities (15-30 min)';
    if (minutes <= 60) return 'Medium Activities (30-60 min)';
    return 'Flexible Length';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Help us find the best moments to support your parenting goals
          </CardTitle>
          <CardDescription>
            Tell us when you're available so we can suggest activities that fit your real schedule.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="availability" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="availability">Time Availability</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-6">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Setup</CardTitle>
              <CardDescription>Choose a preset that matches your lifestyle, then customize below.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(AVAILABILITY_PRESETS).map(([key, preset]) => (
                  <Card 
                    key={key} 
                    className={`cursor-pointer transition-all ${selectedPreset === key ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
                    onClick={() => handlePresetApply(key)}
                  >
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold mb-2">{preset.name}</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Weekdays: {preset.weekday_availability.length || 'None'}</p>
                        <p>Weekends: {preset.weekend_availability.length}</p>
                        <p>{preset.preferred_length} min activities</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekday Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Weekday Availability
              </CardTitle>
              <CardDescription>When during weekdays work best for activities?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {WEEKDAY_TIME_SLOTS.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={slot.id}
                      checked={preferences.weekday_availability.includes(slot.id)}
                      onCheckedChange={(checked) => handleWeekdayChange(slot.id, checked)}
                    />
                    <div>
                      <Label htmlFor={slot.id} className="font-medium">{slot.label}</Label>
                      <p className="text-sm text-gray-500">{slot.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weekend Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Weekend Availability</CardTitle>
              <CardDescription>What weekend times work for your family?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {WEEKEND_TIME_SLOTS.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={slot.id}
                      checked={preferences.weekend_availability.includes(slot.id)}
                      onCheckedChange={(checked) => handleWeekendChange(slot.id, checked)}
                    />
                    <div>
                      <Label htmlFor={slot.id} className="font-medium">{slot.label}</Label>
                      <p className="text-sm text-gray-500">{slot.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity Preferences */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferred Activity Length</CardTitle>
                <CardDescription>How much time do you typically have?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>5 min</span>
                    <span className="font-medium">{getActivityLengthLabel(preferences.preferred_length)}</span>
                    <span>60+ min</span>
                  </div>
                  <Slider
                    value={[parseInt(preferences.preferred_length)]}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_length: value[0].toString() }))}
                    max={90}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suggestion Intensity</CardTitle>
                <CardDescription>How often should Teachmo suggest activities?</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={preferences.intensity} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, intensity: value }))}
                  className="space-y-3"
                >
                  {INTENSITY_LEVELS.map(level => (
                    <div key={level.value} className="flex items-center space-x-3 p-2 rounded border">
                      <RadioGroupItem value={level.value} id={level.value} />
                      <div className="flex-1">
                        <Label htmlFor={level.value} className="font-medium flex items-center gap-2">
                          <span>{level.icon}</span>
                          {level.title}
                        </Label>
                        <p className="text-sm text-gray-500">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Ad-hoc Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Surprise Suggestions</CardTitle>
              <CardDescription>Allow spontaneous activity suggestions when you have unexpected free time?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable "Surprise Me" suggestions</Label>
                  <p className="text-sm text-gray-500">Get activity ideas for those "what should we do now?" moments</p>
                </div>
                <Switch
                  checked={preferences.ad_hoc_suggestions}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, ad_hoc_suggestions: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Privacy First</AlertTitle>
            <AlertDescription>
              Teachmo only reads your calendar to suggest better timing. We never edit, delete, or share your events.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Connect Your Calendar</CardTitle>
              <CardDescription>
                Sync your calendar for smarter activity suggestions that work with your actual schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preferences.calendar_sync_enabled ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleCalendarConnect('google')}
                    className="h-16 flex flex-col gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Google Calendar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCalendarConnect('apple')}
                    className="h-16 flex flex-col gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Apple Calendar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCalendarConnect('outlook')}
                    className="h-16 flex flex-col gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Outlook
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Connected to {preferences.calendar_provider?.charAt(0).toUpperCase() + preferences.calendar_provider?.slice(1)} Calendar
                    </span>
                  </div>
                  <p className="text-sm text-green-700">
                    Teachmo can now suggest activities based on your real schedule.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {preferences.calendar_sync_enabled && (
            <Card>
              <CardHeader>
                <CardTitle>Calendar Integration Options</CardTitle>
                <CardDescription>Customize how Teachmo works with your calendar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded border">
                  <div>
                    <Label className="font-medium">Scan for family events</Label>
                    <p className="text-sm text-gray-500">Help align suggestions with existing activities</p>
                  </div>
                  <Switch
                    checked={preferences.scan_family_events}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, scan_family_events: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded border">
                  <div>
                    <Label className="font-medium">Show activity ideas on calendar</Label>
                    <p className="text-sm text-gray-500">Display Teachmo suggestions directly in your calendar view</p>
                  </div>
                  <Switch
                    checked={preferences.activity_overlay}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, activity_overlay: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
        {saveSuccess && (
          <p className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Availability preferences saved!
          </p>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
