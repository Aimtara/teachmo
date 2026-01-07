import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminRealtimeSIS');

/**
 * AdminRealtimeSIS lets administrators configure realtime or scheduled roster sync
 * with external SIS/LMS providers.  It fetches current sync settings and recent
 * job statuses, allows selecting a provider and sync mode (manual, hourly, daily,
 * realtime webhook), and triggers immediate sync runs.  Role assignment is
 * handled automatically via SIS role mapping.
 */
export default function AdminRealtimeSIS() {
  const toast = useToast();
  const [provider, setProvider] = useState('');
  const [mode, setMode] = useState('hourly');
  const [loading, setLoading] = useState(false);

  const { data: configData, refetch } = useQuery(
    ['sisSyncConfig'],
    async () => {
      const query = `query GetSISSyncConfig { sis_sync_config { provider mode } sis_sync_jobs(order_by: {created_at: desc}, limit: 10) { id provider mode status created_at } }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (configData?.sis_sync_config?.length) {
      const cfg = configData.sis_sync_config[0];
      setProvider(cfg.provider || '');
      setMode(cfg.mode || 'hourly');
    }
  }, [configData]);

  const updateSync = async () => {
    setLoading(true);
    try {
      const mutation = `mutation UpsertSISSyncConfig($provider: String!, $mode: String!) { insert_sis_sync_config_one(object: {provider: $provider, mode: $mode}, on_conflict: {constraint: sis_sync_config_pkey, update_columns: [mode]}) { provider mode } }`;
      await graphqlRequest(mutation, { provider, mode });
      toast({ title: 'Sync settings saved', status: 'success', duration: 3000, isClosable: true });
      await refetch();
    } catch (err) {
      logger.error('Failed to update sync config', err);
      toast({ title: 'Failed to save settings', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    setLoading(true);
    try {
      const mutation = `mutation RunSISSync($provider: String!) { run_sis_sync(provider: $provider) { message } }`;
      await graphqlRequest(mutation, { provider });
      toast({ title: 'Sync job started', status: 'success', duration: 3000, isClosable: true });
      await refetch();
    } catch (err) {
      logger.error('Failed to run sync job', err);
      toast({ title: 'Failed to start sync job', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} maxW="5xl" mx="auto">
      <Heading mb={4}>Realtime SIS/LMS Sync</Heading>
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">Sync Configuration</Heading>
        </CardHeader>
        <CardBody>
          <Stack spacing={4} maxW="md">
            <FormControl id="provider" isRequired>
              <FormLabel>Provider</FormLabel>
              <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="">Select provider</option>
                <option value="oneroster">OneRoster CSV</option>
                <option value="classlink">ClassLink</option>
                <option value="clever">Clever</option>
                <option value="google">Google Classroom</option>
                <option value="canvas">Canvas LMS</option>
                <option value="schoology">Schoology</option>
              </Select>
            </FormControl>
            <FormControl id="mode" isRequired>
              <FormLabel>Sync Mode</FormLabel>
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="manual">Manual only</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="realtime">Realtime (Webhook)</option>
              </Select>
            </FormControl>
            <HStack>
              <Button onClick={updateSync} isLoading={loading} colorScheme="blue">Save Settings</Button>
              <Button onClick={runSync} isLoading={loading} colorScheme="teal">Run Sync Now</Button>
            </HStack>
            <Box fontSize="sm" color="gray.500">
              Role mapping is automatically applied based on SIS roles configured in the SIS Role Mapping page. Realtime webhook mode will listen for roster change events from your LMS provider.
            </Box>
          </Stack>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <Heading size="md">Recent Sync Jobs</Heading>
        </CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Provider</Th>
                <Th>Mode</Th>
                <Th>Status</Th>
                <Th>Started At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {configData?.sis_sync_jobs?.map((job) => (
                <Tr key={job.id}>
                  <Td>{job.id}</Td>
                  <Td>{job.provider}</Td>
                  <Td>{job.mode}</Td>
                  <Td>{job.status}</Td>
                  <Td>{new Date(job.created_at).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
}
