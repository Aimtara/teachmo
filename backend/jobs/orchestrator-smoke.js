/* eslint-env node */
import { orchestrateRequest } from '../../nhost/functions/orchestrator/orchestrateRequest.js';

const sampleRequests = [
  {
    requestId: 'demo-1',
    actor: { userId: '00000000-0000-0000-0000-000000000001', role: 'PARENT' },
    channel: 'CHAT',
    text: "Can you message her teacher that she'll be absent tomorrow?",
    selected: { childId: 'c1', schoolId: 's1' },
    metadata: { locale: 'en-US', timezone: 'America/New_York' }
  },
  {
    requestId: 'demo-2',
    actor: { userId: '00000000-0000-0000-0000-000000000002', role: 'PARENT' },
    channel: 'CHAT',
    text: 'Show me tutoring options for math',
    selected: { schoolId: 's1' }
  }
];

async function run() {
  for (const request of sampleRequests) {
    const response = await orchestrateRequest(request);
    console.log('\n--- Orchestrator Response ---');
    console.log(JSON.stringify(response, null, 2));
  }
}

run().catch((error) => {
  console.error('orchestrator smoke test failed', error);
  process.exit(1);
});
