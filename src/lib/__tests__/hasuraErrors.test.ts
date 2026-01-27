import { normalizeHasuraError } from '../hasuraErrors';

describe('normalizeHasuraError', () => {
  it('classifies permission errors', () => {
    const error = {
      response: {
        errors: [
          {
            message: 'permission denied',
            extensions: { code: 'permission-denied' },
            path: ['insert_audit_log_one'],
          },
        ],
      },
    };

    const normalized = normalizeHasuraError(error);
    expect(normalized.kind).toBe('permission');
    expect(normalized.code).toBe('permission-denied');
    expect(normalized.path).toEqual(['insert_audit_log_one']);
  });

  it('classifies constraint errors', () => {
    const error = {
      errors: [
        {
          message: 'Uniqueness violation',
          extensions: { code: 'constraint-violation' },
        },
      ],
    };

    const normalized = normalizeHasuraError(error);
    expect(normalized.kind).toBe('constraint');
  });

  it('falls back to unknown with a message', () => {
    const error = new Error('something broke');
    const normalized = normalizeHasuraError(error);
    expect(normalized.kind).toBe('unknown');
    expect(normalized.message).toContain('something broke');
  });
});
