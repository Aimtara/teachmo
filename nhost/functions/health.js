export default (req, res) => {
  const uptimeSeconds = typeof process !== 'undefined' ? process.uptime?.() : null;
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: process.env?.GIT_COMMIT_SHA || process.env?.VERCEL_GIT_COMMIT_SHA || null,
  });
};
