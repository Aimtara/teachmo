// aiUsageLogger
//
// This serverless function logs AI invocations and their inputs/outputs. It can
// be used in conjunction with other AI functions to create an auditable
// record of all AI usage. In a production environment, replace the
// console log with writes to an AIUsageLog database table or an external
// logging service.

export default async function aiUsageLogger(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, prompt, response, feature } = req.body || {};
  console.log('[AI Usage Log]', {
    timestamp: new Date().toISOString(),
    userId,
    feature,
    prompt,
    response,
  });
  return res.status(200).json({ status: 'logged' });
}
