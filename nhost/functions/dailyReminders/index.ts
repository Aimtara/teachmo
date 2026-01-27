import { notifyUserEvent } from '../_shared/notifier';
import { HasuraClient } from '../_shared/directoryImportCore';

function createHasuraClient(): HasuraClient {
  const hasuraUrl = process.env.HASURA_GRAPHQL_ENDPOINT;
  const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!hasuraUrl || !adminSecret) {
    throw new Error('Missing HASURA_GRAPHQL_ENDPOINT or HASURA_GRAPHQL_ADMIN_SECRET');
  }

  return async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(hasuraUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  };
}

function validateCronToken(req: any) {
  const cronToken = String(process.env.NHOST_CRON_TOKEN ?? '');
  if (!cronToken) return true;

  const headerToken = String(req.headers['nhost-cron-token'] ?? req.headers['x-nhost-cron-token'] ?? '');
  const authHeader = String(req.headers['authorization'] ?? '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  return headerToken === cronToken || bearerToken === cronToken;
}

export default async function dailyReminders(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateCronToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const hasura = createHasuraClient();

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const query = `query DailyReminders($start: timestamptz!, $end: timestamptz!) {
      parents: users(where: { user_type: { _eq: "parent" } }) {
        id
        children {
          id
          first_name
          event_participants(where: { event: { starts_at: { _gte: $start, _lt: $end } } }) {
            event {
              id
              title
              starts_at
              location
            }
          }
        }
      }
    }`;

    const response = await hasura(query, { start: now.toISOString(), end: windowEnd.toISOString() });
    const parents = response?.data?.parents || [];

    let notificationsSent = 0;

    for (const parent of parents) {
      const messages: string[] = [];
      (parent.children || []).forEach((child: any) => {
        (child.event_participants || []).forEach(({ event }: any) => {
          if (!event?.starts_at) return;
          const dt = new Date(event.starts_at);
          const timeString = dt.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          const childPrefix = child.first_name ? `${child.first_name}: ` : '';
          messages.push(
            `${childPrefix}Reminder: ${event.title} starts at ${timeString}${event.location ? ` at ${event.location}` : ''}.`
          );
        });
      });

      if (messages.length > 0) {
        await notifyUserEvent({
          hasura,
          userId: parent.id,
          type: 'daily_reminder',
          title: "Today's schedule",
          body: messages.join('\n'),
        });
        notificationsSent += 1;
      }
    }

    return res.status(200).json({ processed: parents.length, notificationsSent });
  } catch (err) {
    console.error('Error sending daily reminders', err);
    return res.status(500).json({ error: 'Failed to send reminders' });
  }
}
