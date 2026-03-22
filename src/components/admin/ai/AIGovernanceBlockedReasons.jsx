import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIGovernanceBlockedReasons({ reasons = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked Reasons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {reasons.length === 0 ? (
          <div className="text-muted-foreground">No blocked decisions recorded for this window.</div>
        ) : (
          <ul className="space-y-2">
            {reasons.map((item) => (
              <li key={item.reason} className="flex items-center justify-between rounded-md border p-3">
                <span>{item.reason}</span>
                <span className="font-semibold">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


AIGovernanceBlockedReasons.propTypes = {
  reasons: PropTypes.arrayOf(
    PropTypes.shape({
      reason: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};
