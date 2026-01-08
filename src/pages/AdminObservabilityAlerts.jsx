import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminObservabilityAlerts');

export default function AdminObservabilityAlerts() {
  const toast = useToast();
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
      toast({ title: 'Alert settings saved', status: 'success' });
      await refetch();
    } catch (err) {
      logger.error('Failed to save alert settings', err);
      toast({ title: 'Failed to save', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      await graphqlRequest('mutation { send_test_alert { message } }');
      toast({ title: 'Test alert sent', status: 'success' });
    } catch (err) {
      logger.error('Test alert failed', err);
      toast({ title: 'Test alert failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} maxW="4xl" mx="auto">
      <Heading mb={4}>Observability Alert Settings</Heading>
      <Card>
        <CardHeader><Heading size="md">On‑Call Channels</Heading></CardHeader>
        <CardBody>
          <Stack spacing={4} maxW="md">
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alerts@example.com" />
            </FormControl>
            <FormControl>
              <FormLabel>Slack Webhook URL</FormLabel>
              <Input value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
            </FormControl>
            <FormControl>
              <FormLabel>PagerDuty Integration Key</FormLabel>
              <Input value={pagerDutyKey} onChange={(e) => setPagerDutyKey(e.target.value)} placeholder="PD12345" />
            </FormControl>
            <Button onClick={handleSave} isLoading={loading} colorScheme="blue">Save Channels</Button>
            <Button onClick={handleTest} isLoading={loading} colorScheme="teal">Send Test Alert</Button>
            <Text fontSize="sm" color="gray.500">Configure one or more alert channels. Alerts will trigger on high API latency, error rates, AI cost thresholds and notification bounces.</Text>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
}
