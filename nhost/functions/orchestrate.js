import { orchestrateRequest } from './orchestrator/orchestrateRequest.js';

export default async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.requestId || !payload.actor || !payload.channel) {
      return res.status(400).json({
        route: 'UNKNOWN_CLARIFY',
        confidence: 0,
        safety: { level: 'NONE', reasons: [] },
        needs: {
          missing: ['requestId', 'actor', 'channel'].filter((key) => !payload[key]),
          promptUser: {
            type: 'FOLLOWUP_QUESTION',
            title: 'Missing required request details',
            placeholder: 'Provide requestId, actor, and channel.'
          }
        },
        ui: {
          type: 'ERROR',
          title: 'Malformed request',
          body: 'The orchestrator needs requestId, actor, and channel.'
        }
      });
    }

    const response = await orchestrateRequest(payload);
    return res.status(200).json(response);
  } catch (error) {
    console.error('orchestrate error', error);
    return res.status(500).json({
      route: 'UNKNOWN_CLARIFY',
      confidence: 0,
      safety: { level: 'NONE', reasons: [] },
      ui: {
        type: 'ERROR',
        title: 'Orchestrator error',
        body: 'Unable to process the request right now.'
      }
    });
  }
};
