
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  // Sync, // Sync icon is no longer used, replacing with RefreshCw for the title
  CheckCircle, 
  AlertCircle, 
  RefreshCw, // This is the new icon for the title
  Settings,
  Smartphone,
  Globe
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/api/entities';
import { calendarSync } from '@/api/functions';

export default function CalendarSyncSettings({ user }) {
  const [syncSettings, setSyncSettings] = useState({
    google_enabled: false,
    ical_enabled: false,
    auto_sync: true,
    sync_frequency: 5, // minutes
    two_way_sync: true
  });
  const [syncStatus, setSyncStatus] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.calendar_sync_settings) {
      setSyncSettings(user.calendar_sync_settings);
    }
    if (user?.calendar_credentials) {
      setSyncStatus(user.calendar_credentials);
    }
    if (user?.last_calendar_sync) {
      setLastSync(new Date(user.last_calendar_sync));
    }
  }, [user]);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      // Generate Google OAuth URL
      const clientId = 'your-google-client-id'; // This would come from env
      const redirectUri = `${window.location.origin}/calendar-callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      
      const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google connect error:', error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Unable to connect to Google Calendar. Please try again."
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSync = async () => {
    try {
      toast({
        title: "Syncing Calendars",
        description: "Updating your calendar events..."
      });

      const { data } = await calendarSync({
        provider: 'google'
      });

      setSyncStatus(prev => ({
        ...prev,
        last_sync: new Date().toISOString()
      }));

      setLastSync(new Date()); // Update last sync display immediately

      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced} events successfully.`
      });
    } catch (error) {
      console.error('Manual sync error:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Unable to sync calendars. Please check your connection."
      });
    }
  };

  const handleSettingChange = async (setting, value) => {
    const newSettings = { ...syncSettings, [setting]: value };
    setSyncSettings(newSettings);

    try {
      await User.updateMyUserData({
        calendar_sync_settings: newSettings
      });

      toast({
        title: "Settings Updated",
        description: "Calendar sync preferences saved."
      });
    } catch (error) {
      console.error('Settings update error:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Unable to save settings. Please try again."
      });
    }
  };

  const getConnectionStatus = (provider) => {
    const status = syncStatus[provider];
    if (!status) return { connected: false, status: 'Not Connected' };
    
    const isExpired = status.expires_at && new Date(status.expires_at) < new Date();
    if (isExpired) return { connected: false, status: 'Token Expired' };
    
    return { connected: true, status: 'Connected' };
  };

  const googleStatus = getConnectionStatus('google');
  const icalStatus = getConnectionStatus('ical');

  return (
    <div className="space-y-6">
      {/* Sync Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Calendar Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-semibold">Google Calendar</h4>
                  <p className="text-sm text-gray-600">
                    Sync with your Google Calendar events
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={googleStatus.connected ? 'default' : 'secondary'}>
                  {googleStatus.connected ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {googleStatus.status}
                </Badge>
                {googleStatus.connected ? (
                  <Button size="sm" variant="outline" onClick={handleManualSync}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sync Now
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleGoogleConnect}
                    disabled={isConnecting}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {/* iCal/Outlook */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-orange-600" />
                <div>
                  <h4 className="font-semibold">iCal / Outlook</h4>
                  <p className="text-sm text-gray-600">
                    Sync with iCal or Outlook calendars
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={icalStatus.connected ? 'default' : 'secondary'}>
                  {icalStatus.connected ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {icalStatus.status}
                </Badge>
                <Button size="sm" variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>

            {/* Last Sync Info */}
            {lastSync && (
              <div className="text-sm text-gray-600 pt-2 border-t">
                Last synced: {lastSync.toLocaleDateString()} at {lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sync Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-sync" className="font-medium">
                Automatic Sync
              </Label>
              <p className="text-sm text-gray-600">
                Automatically sync calendar changes in both directions
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={syncSettings.auto_sync}
              onCheckedChange={(checked) => handleSettingChange('auto_sync', checked)}
            />
          </div>

          {/* Two-Way Sync */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="two-way-sync" className="font-medium">
                Two-Way Sync
              </Label>
              <p className="text-sm text-gray-600">
                Changes in external calendars update Teachmo and vice versa
              </p>
            </div>
            <Switch
              id="two-way-sync"
              checked={syncSettings.two_way_sync}
              onCheckedChange={(checked) => handleSettingChange('two_way_sync', checked)}
            />
          </div>

          {/* Sync Frequency */}
          <div className="space-y-2">
            <Label htmlFor="sync-frequency" className="font-medium">
              Sync Frequency
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="sync-frequency"
                type="number"
                min="1"
                max="60"
                value={syncSettings.sync_frequency}
                onChange={(e) => handleSettingChange('sync_frequency', parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600">minutes</span>
            </div>
            <p className="text-xs text-gray-500">
              How often to check for calendar updates (1-60 minutes)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <strong>Events not appearing?</strong> Try disconnecting and reconnecting your calendar, then run a manual sync.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <strong>Duplicate events?</strong> Check that you haven't connected the same calendar multiple times.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <strong>Missing recent changes?</strong> Calendar sync can take up to 5 minutes for external changes.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
