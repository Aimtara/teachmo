/* eslint-env node */

export async function preRequestHook(req, _res, next) {
  if (typeof req.governanceEnabled === 'undefined') {
    req.governanceEnabled = false;
  }
  if (typeof req.governanceDecision === 'undefined') {
    req.governanceDecision = null;
  }
  return next();
}
