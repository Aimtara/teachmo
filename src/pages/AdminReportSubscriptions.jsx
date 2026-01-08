import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminReportSubscriptions');

export default function AdminReportSubscriptions() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [reportId, setReportId] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const { data, refetch } = useQuery(
    ['scheduledReports'],
    async () => {
      const query = `query ScheduledReports {
        scheduled_reports(order_by: {created_at: desc}) {
          id name interval format metrics recipients { email }
        }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  const handleSubscribe = async () => {
    if (!email || !reportId) {
      toast({ title: 'Please select a report and enter an email', status: 'warning' });
      return;
    }
    setSubscribing(true);
    try {
      const mutation = `mutation Subscribe($reportId: uuid!, $email: String!) {
        insert_scheduled_report_recipients_one(object: {report_id: $reportId, email: $email}, on_conflict: {constraint: scheduled_report_recipients_pkey, update_columns: []}) {
          email
        }
      }`;
      await graphqlRequest(mutation, { reportId, email });
      toast({ title: 'User subscribed', status: 'success' });
      setEmail('');
      await refetch();
    } catch (err) {
      logger.error('Failed to subscribe user', err);
      toast({ title: 'Subscription failed', status: 'error' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (rId, userEmail) => {
    try {
      const mutation = `mutation Unsubscribe($reportId: uuid!, $email: String!) {
        delete_scheduled_report_recipients_by_pk(report_id: $reportId, email: $email) { email }
      }`;
      await graphqlRequest(mutation, { reportId: rId, email: userEmail });
      toast({ title: 'User unsubscribed', status: 'success' });
      await refetch();
    } catch (err) {
      logger.error('Failed to unsubscribe', err);
      toast({ title: 'Unsubscribe failed', status: 'error' });
    }
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <Heading mb={4}>Report Subscriptions</Heading>
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">Subscribe User to Report</Heading>
        </CardHeader>
        <CardBody>
          <HStack spacing={4} align="flex-end">
            <FormControl id="reportId" isRequired>
              <FormLabel>Report</FormLabel>
              <Select value={reportId} onChange={(e) => setReportId(e.target.value)} placeholder="Select a report">
                {data?.scheduled_reports?.map((report) => (
                  <option key={report.id} value={report.id}>{report.name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl id="email" isRequired>
              <FormLabel>User Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </FormControl>
            <Button colorScheme="teal" onClick={handleSubscribe} isLoading={subscribing}>
              Subscribe
            </Button>
          </HStack>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <Heading size="md">Active Reports</Heading>
        </CardHeader>
        <CardBody>
          {data?.scheduled_reports?.length ? (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Interval</Th>
                  <Th>Format</Th>
                  <Th>Metrics</Th>
                  <Th>Recipients</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.scheduled_reports.map((report) => (
                  <Tr key={report.id}>
                    <Td>{report.name}</Td>
                    <Td>{report.interval}</Td>
                    <Td>{report.format}</Td>
                    <Td>{report.metrics.join(', ')}</Td>
                    <Td>
                      {report.recipients.length === 0 && <Text color="gray.500">No recipients</Text>}
                      {report.recipients.map((r) => (
                        <HStack key={r.email} spacing={2} mb={1}>
                          <Text>{r.email}</Text>
                          <Button size="xs" colorScheme="red" onClick={() => handleUnsubscribe(report.id, r.email)}>Remove</Button>
                        </HStack>
                      ))}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text>No scheduled reports yet.</Text>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
