/* eslint-env node */
// Simple job script to smoke-test the orchestrator locally.
//
// Run:
//   node backend/jobs/orchestrator-smoke.js
//
// This does NOT call the network; it directly imports the classifier + handlers.

import { classify } from '../../nhost/functions/orchestrator/classify.js';
import { getHandler } from '../../nhost/functions/orchestrator/registry.js';

const SAMPLES = [
  { text: 'Can you message her teacher that she’ll be absent tomorrow?', channel: 'CHAT' },
  { text: 'What did I miss this week?', channel: 'CHAT' },
  { text: 'Find chess classes near me', channel: 'CHAT' },
  { text: 'Summarize this thread for me', channel: 'CHAT' },
  { text: 'I need to book office hours with his math teacher', channel: 'CHAT' },
  { text: 'Homework help: solve 2x+5=17', channel: 'CHAT' }
];

async function run() {
  for (const sample of SAMPLES) {
    const c = classify(sample);
    const handler = getHandler(c.route);
    const out = await handler({
      requestId: '00000000-0000-0000-0000-000000000000',
      actor: { userId: 'local', role: 'parent' },
      channel: sample.channel,
      text: sample.text,
      selected: { childId: 'child_local', schoolId: 'school_local' },
      metadata: { locale: 'en-US', timezone: 'America/New_York' }
    });

    console.log(
      JSON.stringify(
        {
          input: sample.text,
          route: c.route,
          confidence: c.confidence,
          ui: out.ui,
          needs: out.needs,
          artifactType: out.artifact?.type
        },
        null,
        2
      )
    );
    console.log('---');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
