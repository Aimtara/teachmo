/* eslint-env jest */

import { jest } from '@jest/globals';
import { requireGovernance } from '../middleware/requireGovernance.js';

function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('requireGovernance middleware', () => {
  test('allows request when governance is explicitly disabled', () => {
    const req = { governanceEnabled: false, governanceDecision: null };
    const res = createRes();
    const next = jest.fn();

    requireGovernance(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  test('blocks request when governance is enabled but decision missing', () => {
    const req = { governanceEnabled: true, governanceDecision: null };
    const res = createRes();
    const next = jest.fn();

    requireGovernance(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Governance not initialized' });
  });

  test('allows request when decision exists', () => {
    const req = { governanceEnabled: true, governanceDecision: { policyOutcome: 'allowed' } };
    const res = createRes();
    const next = jest.fn();

    requireGovernance(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });
});
