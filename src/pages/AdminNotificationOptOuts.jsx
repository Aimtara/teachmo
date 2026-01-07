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
  Input,
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

const logger = createLogger('AdminNotificationOptOuts');

export default function AdminNotificationOptOuts() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery(
    ['notificationOptOuts'],
    async () => {
      const query = `query OptOuts {
        notification_opt_outs(order_by: {created_at: desc}) { email phone created_at }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  const handleRemove = async (email, phone) => {
    try {
      const mutation = `mutation RemoveOptOut($email: String, $phone: String) {
        delete_notification_opt_outs(where: { _or: [{email: {_eq: $email}}, {phone: {_eq: $phone}}] }) { affected_rows }
      }`;
      await graphqlRequest(mutation, { email, phone });
      toast({ title: 'User re-subscribed', status: 'success' });
      await refetch();
    } catch (err) {
      logger.error('Failed to remove opt-out', err);
      toast({ title: 'Failed to remove', status: 'error' });
    }
  };

  const filtered = data?.notification_opt_outs?.filter((o) => {
    const q = search.toLowerCase();
    return o.email?.toLowerCase().includes(q) || o.phone?.toLowerCase().includes(q);
  });

  return (
    <Box p={6} maxW="5xl" mx="auto">
      <Heading mb={4}>Notification Opt-Outs</Heading>
      <Card mb={4}>
        <CardHeader>
          <Heading size="md">Search & Manage</Heading>
        </CardHeader>
        <CardBody>
          <FormControl>
            <FormLabel>Search by email or phone</FormLabel>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="user@example.com or +15555555555" />
          </FormControl>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <Heading size="md">Unsubscribed Users</Heading>
        </CardHeader>
        <CardBody>
          {filtered && filtered.length > 0 ? (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Opt-Out Date</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((opt) => (
                  <Tr key={`${opt.email}-${opt.phone}`}>
                    <Td>{opt.email || '-'}</Td>
                    <Td>{opt.phone || '-'}</Td>
                    <Td>{new Date(opt.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <Button size="xs" colorScheme="teal" onClick={() => handleRemove(opt.email, opt.phone)}>
                        Resubscribe
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text>No opt-outs found.</Text>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
