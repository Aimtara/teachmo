import { z } from 'zod';
import { nhostGraphqlRequest } from './_shared/nhostGraphql';

const QuerySchema = z.object({
  windowMinutes: z.coerce.number().int().positive().max(10080).optional(),
});

const QUERY = `
  query SystemHealth($since: timestamptz!) {
    audit_log_aggregate(where: { created_at: { _gte: $since } }) {
      aggregate { count }
    }
    messages_aggregate(where: { created_at: { _gte: $since } }) {
      aggregate { count }
    }
    message_threads_aggregate(where: { created_at: { _gte: $since } }) {
      aggregate { count }
    }
  }
`;

function isoSince(windowMinutes: number) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  return since.toISOString();
}

export default async (req, res) => {
  try {
    const query = QuerySchema.parse(req.query ?? {});
    const windowMinutes = query.windowMinutes ?? 1440;
    const since = isoSince(windowMinutes);

    const data = await nhostGraphqlRequest({
      query: QUERY,
      variables: { since },
      headers: {
        ...(req.headers?.authorization ? { Authorization: req.headers.authorization } : {}),
      },
    });

    const audits = data?.audit_log_aggregate?.aggregate?.count ?? 0;
    const messages = data?.messages_aggregate?.aggregate?.count ?? 0;
    const threads = data?.message_threads_aggregate?.aggregate?.count ?? 0;

    const days = windowMinutes / 1440;
    const rate = (n: number) => (days > 0 ? n / days : n);

    res.status(200).json({
      status: 'ok',
      now: new Date().toISOString(),
      windowMinutes,
      since,
      counts: {
        auditLogs: audits,
        messages,
        threads,
      },
      ratesPerDay: {
        auditLogs: rate(audits),
        messages: rate(messages),
        threads: rate(threads),
      },
    });
  } catch (error) {
    const status = error?.name === 'ZodError' ? 400 : 500;
    res.status(status).json({ status: 'error', error: error?.message ?? 'unknown error' });
  }
};
