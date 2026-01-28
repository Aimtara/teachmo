/* eslint-env node */
/**
 * Unit test for execution board validation schemas
 */
import {
  epicPatchSchema,
  gatePatchSchema,
  slicePatchSchema,
} from '../validation/executionBoard.js';

describe('Execution Board Validation Schemas', () => {
  describe('epicPatchSchema', () => {
    test('accepts a valid status "Done"', () => {
      const result = epicPatchSchema.safeParse({ status: 'Done' });
      expect(result.success).toBe(true);
    });

    test('rejects an invalid status', () => {
      const result = epicPatchSchema.safeParse({ status: 'InvalidStatus' });
      expect(result.success).toBe(false);
    });

    test('accepts all valid epic statuses', () => {
      const validStatuses = ['Backlog', 'Planned', 'In progress', 'Done'];
      for (const status of validStatuses) {
        const result = epicPatchSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    test('accepts multiple valid fields', () => {
      const result = epicPatchSchema.safeParse({
        status: 'In progress',
        notes: 'Updated notes',
        railPriority: 1,
      });
      expect(result.success).toBe(true);
    });

    test('accepts empty body (all fields optional)', () => {
      const result = epicPatchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('accepts arrays for upstream, downstream, and gates', () => {
      const result = epicPatchSchema.safeParse({
        upstream: ['epic-0'],
        downstream: ['epic-2'],
        gates: ['G1', 'G2'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('gatePatchSchema', () => {
    test('accepts all valid gate statuses including Done', () => {
      const validGateStatuses = ['Backlog', 'Planned', 'In progress', 'Done'];
      for (const status of validGateStatuses) {
        const result = gatePatchSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    test('rejects an invalid gate status', () => {
      const result = gatePatchSchema.safeParse({ status: 'Invalid' });
      expect(result.success).toBe(false);
    });

    test('accepts array for dependsOn', () => {
      const result = gatePatchSchema.safeParse({
        dependsOn: ['G1'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('slicePatchSchema', () => {
    test('exposes a success flag from safeParse', () => {
      const result = slicePatchSchema.safeParse({});
      expect(result).toHaveProperty('success');
    });

    test('accepts arrays for inputs, deliverables, and dependsOn', () => {
      const result = slicePatchSchema.safeParse({
        inputs: ['input-1'],
        deliverables: ['deliverable-1'],
        dependsOn: ['slice-0'],
      });
      expect(result.success).toBe(true);
    });

    test('accepts valid slice status', () => {
      const result = slicePatchSchema.safeParse({ status: 'Planned' });
      expect(result.success).toBe(true);
    });
  });
});
