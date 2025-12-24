import MetricCards from './MetricCards';

export default {
  title: 'Admin Analytics/MetricCards',
  component: MetricCards,
  tags: ['autodocs']
};

export const Default = {
  args: {
    metrics: {
      active_users: 142,
      messages_sent: 930,
      ai_calls: 128,
      workflow_runs: 44
    },
    ai: {
      avg_risk_score: 0.32,
      high_risk: 4
    },
    onSelect: () => {}
  }
};
