import React from 'react';
import { getGovernanceEvents } from '@/governance/events';
import { MomentContract } from '@/governance/momentContract';

/**
 * A minimal dashboard for founders to inspect governance state.
 * This page is intentionally simple and unstyled to discourage frequent use.
 */
export default function FounderDashboard() {
  const events = getGovernanceEvents();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Founder Control Panel</h1>
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Moment Contract</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(MomentContract, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Recent Governance Events</h2>
        {events.length === 0 ? (
          <p className="text-sm">No events logged.</p>
        ) : (
          <ul className="text-xs list-disc pl-5 space-y-1">
            {events.map((event, idx) => (
              <li key={idx}>{JSON.stringify(event)}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
