import { notifyUserEvent } from '../_shared/notifier';
import { HasuraClient } from '../_shared/directoryImportCore';
import { invokeAdvancedAI } from '../_shared/invokeAdvancedAI.js';

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

export default async function weeklyNewsletterSummary(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateCronToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const hasura = createHasuraClient();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const query = `query WeeklyNewsletters($since: timestamptz!) {
      communications(where: { type: { _eq: "newsletter" }, created_at: { _gte: $since } }) {
        id
        title
        body
        recipients {
          user_id
        }
      }
    }`;

    const response = await hasura(query, { since });
    const communications = response?.data?.communications || [];

    const recipientMap: Record<string, Array<{ title: string; body: string }>> = {};
    communications.forEach((comm: any) => {
      (comm.recipients || []).forEach((rec: any) => {
        if (!recipientMap[rec.user_id]) recipientMap[rec.user_id] = [];
        recipientMap[rec.user_id].push({ title: comm.title, body: comm.body });
      });
    });

    let digestsSent = 0;
    for (const userId of Object.keys(recipientMap)) {
      const newsletters = recipientMap[userId];
      const digestSections: string[] = [];

      for (const nl of newsletters) {
        const prompt = `You are Teachmo, a warm and supportive AI assistant.\n\n` +
          `Your task is to summarise school newsletters for busy parents.\n\n` +
          `Newsletter subject: ${nl.title}\n\n` +
          `Newsletter content:\n${nl.body}\n\n` +
          `Please provide a concise summary in one paragraph (max 100 words) and three bullet points for key actions or dates.\n` +
          `Avoid judgemental language and advertisements. Use inclusive language.`;

        const aiRes = await invokeAdvancedAI(prompt, {
          maxTokens: 512,
          temperature: 0.5,
        });

        const summary = aiRes?.content ? aiRes.content.trim() : '';
        if (summary) {
          digestSections.push(`Newsletter: ${nl.title}\n${summary}`);
        }
      }

      if (digestSections.length > 0) {
        await notifyUserEvent({
          hasura,
          userId,
          type: 'weekly_newsletter',
          title: 'Weekly Newsletter Digest',
          body: digestSections.join('\n\n'),
        });
        digestsSent += 1;
      }
    }

    return res.status(200).json({ processedUsers: Object.keys(recipientMap).length, digestsSent });
  } catch (err) {
    console.error('Error sending newsletter summaries', err);
    return res.status(500).json({ error: 'Failed to send newsletter summaries' });
  }
}
