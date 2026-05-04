import React, { useState, useEffect } from 'react';
import { Page, Card, Button, Switch, TextInput } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminNotificationSettings
 * Admin interface for configuring notification channels, domain validations, and viewing delivery metrics.
 */
export default function AdminNotificationSettings() {
  const { hasPermission } = usePermissions();
  const [settings, setSettings] = useState<any>({
    emailDomain: '',
    emailSpf: false,
    emailDkim: false,
    emailDmarc: false,
    smsOptInRequired: true,
  });
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await nhost.functions.call('admin-notification-get-settings', {});
      if (res?.settings) setSettings(res.settings);
      if (res?.metrics) setMetrics(res.metrics);
    } catch (err) {
      console.error('Failed to load notification settings', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_notifications')) {
      loadSettings();
    }
  }, [hasPermission]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await nhost.functions.call('admin-notification-update-settings', { settings });
      loadSettings();
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('manage_notifications')) {
    return (
      <Page title="Notification Settings">
        <p>You do not have permission to manage notification settings.</p>
      </Page>
    );
  }

  return (
    <Page title="Notification Settings">
      <p>Configure email and SMS notification settings for this tenant.</p>
      <Card className="p-4 space-y-4">
        <TextInput
          label="Email Domain"
          value={settings.emailDomain}
          onChange={(e: any) => setSettings({ ...settings, emailDomain: e.target.value })}
        />
        <div className="space-y-1">
          <label className="flex items-center space-x-2">
            <Switch
              checked={settings.emailSpf}
              onChange={(checked: boolean) => setSettings({ ...settings, emailSpf: checked })}
            />
            <span>SPF Record Validated</span>
          </label>
          <label className="flex items-center space-x-2">
            <Switch
              checked={settings.emailDkim}
              onChange={(checked: boolean) => setSettings({ ...settings, emailDkim: checked })}
            />
            <span>DKIM Record Validated</span>
          </label>
          <label className="flex items-center space-x-2">
            <Switch
              checked={settings.emailDmarc}
              onChange={(checked: boolean) => setSettings({ ...settings, emailDmarc: checked })}
            />
            <span>DMARC Policy Configured</span>
          </label>
        </div>
        <label className="flex items-center space-x-2">
          <Switch
            checked={settings.smsOptInRequired}
            onChange={(checked: boolean) => setSettings({ ...settings, smsOptInRequired: checked })}
          />
          <span>SMS Opt-In Required</span>
        </label>
        <Button onClick={saveSettings} disabled={loading}>
          Save Settings
        </Button>
      </Card>
      {metrics && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Delivery Metrics</h3>
          <p>Email Sent: {metrics.emailSent}</p>
          <p>Email Bounce Rate: {metrics.emailBounceRate}%</p>
          <p>SMS Sent: {metrics.smsSent}</p>
          <p>SMS Opt-In Rate: {metrics.smsOptInRate}%</p>
        </div>
      )}
    </Page>
  );
}
