import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIGovernanceOutcomeList({ outcomes = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Governance Outcomes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {outcomes.length === 0 ? (
          <div className="text-muted-foreground">No governed outcomes recorded for this window.</div>
        ) : (
          <ul className="space-y-2">
            {outcomes.map((item) => (
              <li key={item.outcome} className="flex items-center justify-between rounded-md border p-3">
                <span className="capitalize">{item.outcome}</span>
                <span className="font-semibold">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


AIGovernanceOutcomeList.propTypes = {
  outcomes: PropTypes.arrayOf(
    PropTypes.shape({
      outcome: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};
