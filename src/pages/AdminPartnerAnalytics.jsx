import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Card, Table, Select, Input, LoadingSpinner } from '@/components/ui';

/**
 * AdminPartnerAnalytics provides high‑level analytics for partners in the
 * marketplace. Administrators can select a partner and a date range to view
 * metrics such as impressions, clicks, conversions and revenue. This page
 * supports basic filtering and summarisation; deeper cohort analysis may be
 * delivered via scheduled reports.
 */
export default function AdminPartnerAnalytics() {
  const [partnerId, setPartnerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch list of partners for the drop‑down selector
  const { data: partners = [] } = useQuery(
    ['partners'],
    async () => {
      const res = await graphqlRequest({
        query: `query Partners {
          partners(order_by: {name: asc}) { id name }
        }`,
      });
      return res?.partners ?? [];
    },
  );

  // Fetch partner analytics given a partner ID and date range
  const { data: metrics = [], isLoading } = useQuery(
    ['partnerAnalytics', partnerId, startDate, endDate],
    async () => {
      if (!partnerId || !startDate || !endDate) return [];
      const res = await graphqlRequest({
        query: `query PartnerAnalytics($partnerId: uuid!, $start: date!, $end: date!) {
          partner_analytics(where: {partner_id: {_eq: $partnerId}, date: {_gte: $start, _lte: $end}}, order_by: {date: asc}) {
            date
            impressions
            clicks
            conversions
            revenue
          }
        }`,
        variables: { partnerId, start: startDate, end: endDate },
      });
      return res?.partner_analytics ?? [];
    },
  );

  const handlePartnerChange = (e) => setPartnerId(e.target.value);
  const handleStartChange = (e) => setStartDate(e.target.value);
  const handleEndChange = (e) => setEndDate(e.target.value);

  const totals = metrics.reduce(
    (acc, row) => {
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.conversions += row.conversions;
      acc.revenue += row.revenue;
      return acc;
    },
    { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Partner Analytics</h1>
      <p className="text-gray-600 max-w-2xl">
        View aggregated performance metrics for each partner. Select a partner and
        choose a date range to see impressions, clicks, conversions and revenue.
      </p>
      <Card className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col">
            <label htmlFor="partner">Partner</label>
            <Select id="partner" value={partnerId} onChange={handlePartnerChange}>
              <option value="">Select a partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="startDate">Start Date</label>
            <Input type="date" id="startDate" value={startDate} onChange={handleStartChange} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate">End Date</label>
            <Input type="date" id="endDate" value={endDate} onChange={handleEndChange} />
          </div>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          metrics.length > 0 && (
            <>
              <Table className="mt-4">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Impressions</th>
                    <th>Clicks</th>
                    <th>Conversions</th>
                    <th>Revenue (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((row) => (
                    <tr key={row.date}>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>{row.impressions}</td>
                      <td>{row.clicks}</td>
                      <td>{row.conversions}</td>
                      <td>{row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td>Total</td>
                    <td>{totals.impressions}</td>
                    <td>{totals.clicks}</td>
                    <td>{totals.conversions}</td>
                    <td>{totals.revenue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </Table>
            </>
          )
        )}
      </Card>
    </div>
  );
}

