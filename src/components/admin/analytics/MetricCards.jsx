import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DEFAULT_METRICS = [
  { key: 'active_users', label: 'Active users' },
  { key: 'messages_sent', label: 'Messages sent' },
  { key: 'ai_calls', label: 'AI calls' },
  { key: 'workflow_runs', label: 'Workflow runs' }
];

const AI_METRICS = [
  { key: 'avg_risk_score', label: 'Avg. risk score', format: (val) => val.toFixed(2) },
  { key: 'high_risk', label: 'High-risk responses' }
];

export default function MetricCards({ metrics, ai, onSelect }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {DEFAULT_METRICS.map((metric) => (
        <Card
          key={metric.key}
          className={cn('cursor-pointer transition hover:shadow', onSelect && 'hover:border-primary')}
          onClick={() => onSelect?.(metric.key)}
          role={onSelect ? 'button' : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{metrics?.[metric.key] ?? 0}</div>
          </CardContent>
        </Card>
      ))}

      {AI_METRICS.map((metric) => (
        <Card
          key={metric.key}
          className={cn('cursor-pointer transition hover:shadow', onSelect && 'hover:border-primary')}
          onClick={() => onSelect?.(metric.key)}
          role={onSelect ? 'button' : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {metric.format ? metric.format(Number(ai?.[metric.key] || 0)) : (ai?.[metric.key] ?? 0)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
