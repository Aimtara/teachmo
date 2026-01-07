import React, { useEffect, useState } from 'react';
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
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
  Text,
} from '@chakra-ui/react';
import { useQuery } from 'react-query';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AdminAICostControls');

export default function AdminAICostControls() {
  const toast = useToast();
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('0.9');
  const [fallbackModel, setFallbackModel] = useState('gpt-3.5-turbo');
  const [roleLimits, setRoleLimits] = useState({});
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useQuery(
    ['aiCostControls'],
    async () => {
      const query = `query CostControls {
        ai_tenant_budgets(limit: 1) { monthly_limit_usd alert_threshold fallback_model }
        ai_role_budgets(order_by: {role: asc}) { role monthly_limit_usd }
        ai_usage_summary { month spend_usd forecast_usd }
      }`;
      return await graphqlRequest(query);
    },
    { refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (data?.ai_tenant_budgets?.length) {
      const budget = data.ai_tenant_budgets[0];
      setMonthlyLimit(budget.monthly_limit_usd?.toString() || '');
      setAlertThreshold(budget.alert_threshold?.toString() || '0.9');
      setFallbackModel(budget.fallback_model || 'gpt-3.5-turbo');
    }
    if (data?.ai_role_budgets?.length) {
      const map = {};
      data.ai_role_budgets.forEach((b) => { map[b.role] = b.monthly_limit_usd; });
      setRoleLimits(map);
    }
  }, [data]);

  const handleSaveTenant = async () => {
    setLoading(true);
    try {
      const mutation = `mutation UpsertTenantBudget($limit: numeric!, $threshold: numeric!, $fallback: String!) {
        insert_ai_tenant_budgets_one(object: { monthly_limit_usd: $limit, alert_threshold: $threshold, fallback_model: $fallback }, on_conflict: {constraint: ai_tenant_budgets_pkey, update_columns: [monthly_limit_usd, alert_threshold, fallback_model]}) { monthly_limit_usd }
      }`;
      await graphqlRequest(mutation, { limit: parseFloat(monthlyLimit), threshold: parseFloat(alertThreshold), fallback: fallbackModel });
      toast({ title: 'Tenant budget updated', status: 'success' });
      await refetch();
    } catch (err) {
      logger.error('Failed to save tenant budget', err);
      toast({ title: 'Failed to save tenant budget', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleLimitChange = (role, value) => {
    setRoleLimits((prev) => ({ ...prev, [role]: value }));
  };

  const handleSaveRoles = async () => {
    setLoading(true);
    try {
      const mutation = `mutation UpsertRoleBudgets($objects: [ai_role_budgets_insert_input!]!) {
        insert_ai_role_budgets(objects: $objects, on_conflict: {constraint: ai_role_budgets_pkey, update_columns: [monthly_limit_usd]}) {
          affected_rows
        }
      }`;
      const objects = Object.entries(roleLimits).map(([role, limit]) => ({ role, monthly_limit_usd: parseFloat(limit || '0') }));
      await graphqlRequest(mutation, { objects });
      toast({ title: 'Role budgets updated', status: 'success' });
      await refetch();
    } catch (err) {
      logger.error('Failed to save role budgets', err);
      toast({ title: 'Failed to save role budgets', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <Heading mb={4}>AI Cost Controls</Heading>
      <Card mb={6}>
        <CardHeader><Heading size="md">Tenant Budget Settings</Heading></CardHeader>
        <CardBody>
          <Stack spacing={4} maxW="md">
            <FormControl isRequired>
              <FormLabel>Monthly Limit (USD)</FormLabel>
              <Input type="number" value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Alert Threshold</FormLabel>
              <Select value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)}>
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="0.9">90%</option>
                <option value="1.0">100%</option>
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Fallback Model</FormLabel>
              <Select value={fallbackModel} onChange={(e) => setFallbackModel(e.target.value)}>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </Select>
            </FormControl>
            <Button onClick={handleSaveTenant} isLoading={loading} colorScheme="blue">Save Tenant Budget</Button>
          </Stack>
        </CardBody>
      </Card>
      <Card mb={6}>
        <CardHeader><Heading size="md">Role Budgets</Heading></CardHeader>
        <CardBody>
          {Object.keys(roleLimits).length ? (
            <Table size="sm" mb={4}>
              <Thead>
                <Tr>
                  <Th>Role</Th>
                  <Th>Monthly Limit (USD)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(roleLimits).map(([role, limit]) => (
                  <Tr key={role}>
                    <Td>{role}</Td>
                    <Td>
                      <Input type="number" value={limit} onChange={(e) => handleRoleLimitChange(role, e.target.value)} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : <Text color="gray.500">No roles configured</Text>}
          <Button onClick={handleSaveRoles} isLoading={loading} colorScheme="teal">Save Role Budgets</Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><Heading size="md">Forecast & Usage</Heading></CardHeader>
        <CardBody>
          {data?.ai_usage_summary ? (
            <Box>
              <Text><strong>Current Spend:</strong> ${data.ai_usage_summary.spend_usd.toFixed(2)}</Text>
              <Text><strong>Forecast Spend:</strong> ${data.ai_usage_summary.forecast_usd.toFixed(2)}</Text>
              <Text><strong>Month:</strong> {data.ai_usage_summary.month}</Text>
            </Box>
          ) : <Text>No usage data available.</Text>}
        </CardBody>
      </Card>
    </Box>
  );
}
