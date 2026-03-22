/* eslint-env node */

export function requireGovernance(req, res, next) {
  if (req.governanceEnabled === false) {
    return next();
  }
  if (!req.governanceDecision) {
    return res.status(500).json({ error: 'Governance not initialized' });
  }
  return next();
}
