import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const logger = createLogger('AdminObservabilityAlerts');

export default function AdminObservabilityAlerts() {
  const [email, setEmail] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [pagerDutyKey, setPagerDutyKey] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useQuery(
    ['alertSettings'],
    async () => {
      const query = `query AlertSettings {
        observability_alert_settings(limit: 1) { email slack_webhook pagerduty_key }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (data?.observability_alert_settings?.length) {
      const s = data.observability_alert_settings[0];
      setEmail(s.email || '');
      setSlackWebhook(s.slack_webhook || '');
      setPagerDutyKey(s.pagerduty_key || '');
    }
  }, [data]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const mutation = `mutation UpsertAlertSettings($email: String, $slack: String, $pd: String) {
        insert_observability_alert_settings_one(object: { email: $email, slack_webhook: $slack, pagerduty_key: $pd }, on_conflict: {constraint: observability_alert_settings_pkey, update_columns: [email, slack_webhook, pagerduty_key]}) { email }
      }`;
      await graphqlRequest(mutation, { email: email || null, slack: slackWebhook || null, pd: pagerDutyKey || null });
      toast.success('Alert settings saved');
      await refetch();
    } catch (err) {
      logger.error('Failed to save alert settings', err);
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      await graphqlRequest('mutation { send_test_alert { message } }');
      toast.success('Test alert sent');
    } catch (err) {
      logger.error('Test alert failed', err);
      toast.error('Test alert failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Observability Alert Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>On‑Call Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alerts@example.com"
            />
          </div>
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">Slack Webhook URL</label>
            <Input
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <div className="max-w-md space-y-2">
            <label className="text-sm font-medium">PagerDuty Integration Key</label>
            <Input
              value={pagerDutyKey}
              onChange={(e) => setPagerDutyKey(e.target.value)}
              placeholder="PD12345"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={loading}>
              Save Channels
            </Button>
            <Button onClick={handleTest} disabled={loading} variant="secondary">
              Send Test Alert
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure one or more alert channels. Alerts will trigger on high API latency, error
            rates, AI cost thresholds and notification bounces.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
