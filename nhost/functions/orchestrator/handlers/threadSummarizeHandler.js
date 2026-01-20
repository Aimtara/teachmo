import { hasuraRequest } from '../hasura.js';

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function summarizeDeterministic(messages = []) {
  const last = [...messages]
    .filter((message) => !!clean(message.body))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-12);

  if (last.length === 0) {
    return {
      headline: 'No recent messages to summarize',
      bullets: ['This thread has no visible messages yet.'],
      openQuestions: []
    };
  }

  const bullets = last.slice(-6).map((message) => {
    const snippet = clean(message.body).slice(0, 140);
    const who = message.sender_id ? `Sender ${String(message.sender_id).slice(0, 6)}` : 'Someone';
    return `${who}: ${snippet}${clean(message.body).length > 140 ? '…' : ''}`;
  });

  const openQuestions = last
    .map((message) => clean(message.body))
    .filter((body) => body.includes('?'))
    .slice(-3);

  return {
    headline: `Summary of the last ${last.length} messages`,
    bullets,
    openQuestions
  };
}

export default {
  async execute(ctx) {
    const threadId = ctx.selected?.threadId;

    if (!threadId) {
      try {
        const data = await hasuraRequest({
          query: `query RecentThreads($userId: uuid!, $limit: Int!) {
            message_threads(
              where: { participants: { user_id: { _eq: $userId } } }
              order_by: { updated_at: desc }
              limit: $limit
            ) {
              id
              title
              last_message_preview
              updated_at
            }
          }`,
          variables: { limit: 10, userId: ctx.actor.userId }
        });

        const options = (data?.message_threads || []).map((thread) => ({
          label:
            clean(thread.title) || clean(thread.last_message_preview) || `Thread ${String(thread.id).slice(0, 6)}`,
          value: thread.id
        }));

        return {
          needs: {
            missing: ['threadId'],
            promptUser: {
              type: 'CHOICE',
              title: 'Which conversation should I summarize?',
              options
            }
          },
          ui: {
            type: 'CARD',
            title: 'Pick a conversation',
            body: 'Select a thread and I’ll give you a quick catch-up summary.',
            deepLink: '/hub',
            primaryAction: { label: 'Open Hub', action: 'OPEN_HUB' }
          }
        };
      } catch (error) {
        console.warn('thread summarize: unable to fetch recent threads', error);
        return {
          needs: {
            missing: ['threadId'],
            promptUser: {
              type: 'FOLLOWUP_QUESTION',
              title: 'Which conversation should I summarize?'
            }
          },
          ui: {
            type: 'CARD',
            title: 'Which conversation?',
            body: 'Open the Hub and pick a thread, then try again.',
            deepLink: '/hub'
          }
        };
      }
    }

    let data;
    try {
      data = await hasuraRequest({
        query: `query ThreadMessages($threadId: uuid!, $limit: Int!, $userId: uuid!) {
          messages(
            where: {
              thread_id: { _eq: $threadId }
              thread: { participants: { user_id: { _eq: $userId } } }
            }
            order_by: { created_at: asc }
            limit: $limit
          ) {
            id
            sender_id
            created_at
            body
          }
          message_threads_by_pk(id: $threadId) {
            id
            title
            last_message_preview
            updated_at
          }
        }`,
        variables: { threadId, limit: 50, userId: ctx.actor.userId }
      });
    } catch (error) {
      const deepLink = `/hub/thread/${encodeURIComponent(threadId)}`;
      return {
        ui: {
          type: 'CARD',
          title: 'Unable to fetch thread right now',
          body: 'Open the Hub to view the conversation. Summaries will be available once the messages service is connected.',
          deepLink,
          primaryAction: { label: 'Open thread', action: 'OPEN_THREAD' }
        },
        artifacts: [
          {
            type: 'SUMMARY',
            payload: { threadId, status: 'unavailable', error: String(error?.code || error?.message || error) },
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      };
    }

    const thread = data?.message_threads_by_pk;
    const messages = data?.messages || [];
    const summary = summarizeDeterministic(messages);
    const title = clean(thread?.title) || 'Conversation summary';
    const body = [summary.headline, '', ...summary.bullets].join('\n');
    const deepLink = `/hub/thread/${encodeURIComponent(threadId)}`;

    return {
      result: {
        threadId,
        title,
        headline: summary.headline,
        bullets: summary.bullets,
        openQuestions: summary.openQuestions,
        messageCount: messages.length
      },
      ui: {
        type: 'CARD',
        title,
        body,
        deepLink,
        primaryAction: { label: 'Open thread', action: 'OPEN_THREAD' }
      },
      artifacts: [
        {
          type: 'SUMMARY',
          payload: {
            threadId,
            title,
            headline: summary.headline,
            bullets: summary.bullets,
            openQuestions: summary.openQuestions,
            messageCount: messages.length
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }
};
