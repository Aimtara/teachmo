import React, { useState, useEffect } from 'react';
import { CommunityVisibility, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

export default function CommunityPrivacySettings({ userId }) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const visibilityData = await CommunityVisibility.filter({ user_id: userId });
        if (visibilityData.length > 0) {
          setSettings(visibilityData[0]);
        } else {
          // Create default settings if none exist
          const defaultSettings = {
            user_id: userId,
            is_discoverable: true,
            show_real_name: true,
            anonymous_handle: '',
            visibility_scope: 'global',
            allow_direct_messages: true,
            allow_pod_invites: true,
            show_location: false,
            show_children_info: false,
          };
          const newSettings = await CommunityVisibility.create(defaultSettings);
          setSettings(newSettings);
        }
      } catch (error) {
        console.error("Error loading privacy settings:", error);
        toast({ variant: "destructive", title: "Failed to load settings" });
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadSettings();
    }
  }, [userId, toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings.id) {
        await CommunityVisibility.update(settings.id, settings);
      } else {
        await CommunityVisibility.create(settings);
      }
      toast({
        title: "Settings Saved",
        description: "Your community privacy settings have been updated.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: "destructive", title: "Save failed", description: "Could not save your settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Privacy</CardTitle>
          <CardDescription>Loading your privacy preferences...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Loader2 className="animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Privacy</CardTitle>
        <CardDescription>Control how you appear and interact within the Teachmo community.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label htmlFor="is_discoverable" className="font-semibold">Be Discoverable</Label>
          <Switch
            id="is_discoverable"
            checked={settings.is_discoverable}
            onCheckedChange={(val) => handleSettingChange('is_discoverable', val)}
          />
        </div>
        <p className="text-sm text-gray-600 -mt-4 px-1">Allow other parents to find your profile in searches.</p>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label htmlFor="show_real_name" className="font-semibold">Post with Real Name</Label>
          <Switch
            id="show_real_name"
            checked={settings.show_real_name}
            onCheckedChange={(val) => handleSettingChange('show_real_name', val)}
          />
        </div>
        {!settings.show_real_name && (
          <div className="space-y-2 pl-4 -mt-4">
            <Label htmlFor="anonymous_handle">Anonymous Handle</Label>
            <Input
              id="anonymous_handle"
              placeholder="e.g., HappyParent123"
              value={settings.anonymous_handle}
              onChange={(e) => handleSettingChange('anonymous_handle', e.target.value)}
            />
             <p className="text-sm text-gray-600">This name will be shown on your posts and profile.</p>
          </div>
        )}

        <div className="space-y-2">
            <Label htmlFor="visibility_scope">Profile Visibility</Label>
            <Select value={settings.visibility_scope} onValueChange={(val) => handleSettingChange('visibility_scope', val)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="global">Everyone in Teachmo</SelectItem>
                    <SelectItem value="district">Only people in my school district</SelectItem>
                    <SelectItem value="school">Only people in my school</SelectItem>
                    <SelectItem value="private">Only me (private)</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">Choose who can see your profile details.</p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <Label htmlFor="allow_direct_messages" className="font-semibold">Allow Direct Messages</Label>
          <Switch
            id="allow_direct_messages"
            checked={settings.allow_direct_messages}
            onCheckedChange={(val) => handleSettingChange('allow_direct_messages', val)}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Privacy Settings
        </Button>
      </CardContent>
    </Card>
  );
}