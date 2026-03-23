import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function AIGovernanceOverviewCards({ summary }) {
  const totals = summary?.totals ?? {};
  const verifier = summary?.verifier ?? {};

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Governed Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Stat label="Total requests" value={totals.totalRequests ?? 0} />
          <Stat label="Governed requests" value={totals.governedRequests ?? 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Stat label="Allowed" value={totals.allowedRequests ?? 0} />
          <Stat label="Blocked" value={totals.blockedRequests ?? 0} />
          <Stat label="Rerouted" value={totals.reroutedRequests ?? 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Review-Driven Flows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Stat label="Queued" value={totals.queuedRequests ?? 0} />
          <Stat label="Escalated" value={totals.escalatedRequests ?? 0} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Verifier Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Stat label="Checked" value={verifier.checked ?? 0} />
          <Stat label="Flagged" value={verifier.flagged ?? 0} />
        </CardContent>
      </Card>
    </div>
  );
}


Stat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

AIGovernanceOverviewCards.propTypes = {
  summary: PropTypes.shape({
    totals: PropTypes.object,
    verifier: PropTypes.object,
  }),
};
