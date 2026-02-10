import React from 'react';
import { getGovernanceEvents } from '@/governance/events';
import { MomentContract } from '@/governance/momentContract';
import {
  evaluateLaunchGates,
  LaunchGateDescriptions,
} from '@/governance/launchGates';
import { FeatureRegistry } from '@/governance/featureRegistry';
import { getPilotReadinessSnapshot } from '@/governance/pilotSnapshot';
import { getGovernanceSummary } from '@/governance/driftSummary';

/**
 * A minimal dashboard for founders to inspect governance state.
 * This page is intentionally simple and unstyled to discourage frequent use.
 */
export default function FounderDashboard() {
  const events = getGovernanceEvents();
  // Compute derived diagnostics once per render. In a real app these
  // computations could be memoised or moved server‑side.
  const gates = evaluateLaunchGates();
  const snapshot = getPilotReadinessSnapshot();
  const driftSummary = getGovernanceSummary();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Founder Control Panel</h1>
      <section aria-labelledby="moment-contract-heading" className="mb-6">
        <h2 id="moment-contract-heading" className="text-lg font-medium mb-2">Moment Contract</h2>
      {/* Launch Gates Section */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Launch Gates</h2>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b p-1 text-left">Gate</th>
              <th className="border-b p-1 text-left">Description</th>
              <th className="border-b p-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(gates).map(([gate, status]) => (
              <tr key={gate}>
                <td className="border-b p-1 font-mono">{gate}</td>
                <td className="border-b p-1">
                  {LaunchGateDescriptions[gate]}
                </td>
                <td className="border-b p-1">
                  {status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Feature Registry Section */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Feature Registry</h2>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b p-1 text-left">Name</th>
              <th className="border-b p-1 text-left">Type</th>
              <th className="border-b p-1 text-left">Moments</th>
              <th className="border-b p-1 text-left">Last Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {FeatureRegistry.map((feat) => (
              <tr key={feat.name}>
                <td className="border-b p-1">{feat.name}</td>
                <td className="border-b p-1">{feat.type}</td>
                <td className="border-b p-1">
                  {feat.moments.join(', ')}
                </td>
                <td className="border-b p-1">{feat.lastReviewed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* Pilot Readiness Snapshot */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Pilot Readiness Snapshot</h2>
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b p-1 text-left">Dimension</th>
              <th className="border-b p-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b p-1">Parent Experience</td>
              <td className="border-b p-1">{snapshot.parentExperience}</td>
            </tr>
            <tr>
              <td className="border-b p-1">School Communication</td>
              <td className="border-b p-1">{snapshot.schoolCommunication}</td>
            </tr>
            <tr>
              <td className="border-b p-1">Compliance</td>
              <td className="border-b p-1">{snapshot.compliance}</td>
            </tr>
            <tr>
              <td className="border-b p-1">Operational Load</td>
              <td className="border-b p-1">{snapshot.operationalLoad}</td>
            </tr>
          </tbody>
        </table>
      </section>
      {/* Moment Contract */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Moment Contract</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded">
          {JSON.stringify(MomentContract, null, 2)}
        </pre>
      </section>
      <section aria-labelledby="governance-events-heading">
        <h2 id="governance-events-heading" className="text-lg font-medium mb-2">Recent Governance Events</h2>
      {/* Governance Drift Summary */}
      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Governance Drift Summary</h2>
        <p className="text-sm mb-2">
          Total Events: {driftSummary.total}
        </p>
        <ul className="text-xs list-disc pl-5 space-y-1">
          {Object.entries(driftSummary.byType).map(([type, count]) => (
            <li key={type}>
              {type}: {count}
            </li>
          ))}
        </ul>
      </section>
      {/* Recent Governance Events */}
      <section>
        <h2 className="text-lg font-medium mb-2">Recent Governance Events</h2>
        {events.length === 0 ? (
          <p className="text-sm">No events logged.</p>
        ) : (
          <ul className="text-xs list-disc pl-5 space-y-1">
            {events.map((event, index) => {
              // All governance events now include timestamps; include index to ensure unique React keys
              const key = `${event.type}-${event.timestamp}-${index}`;
              return <li key={key}>{JSON.stringify(event)}</li>;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
