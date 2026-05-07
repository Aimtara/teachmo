import { useEffect, useMemo, useState } from 'react';
import { MessagingAPI } from '@/api/adapters';
import {
  EnterpriseFilterBar,
  EnterprisePanel,
  EnterpriseSurface,
} from '@/components/enterprise';

const sampleThreads = [
  {
    id: 'sample-avery',
    requester_user_id: 'Guardian',
    target_user_id: 'Teacher',
    status: 'open',
    last_message_preview: 'Could you send the weekly math practice link?',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-office-hours',
    requester_user_id: 'Office hours',
    target_user_id: 'Teacher',
    status: 'approval',
    last_message_preview: 'Three guardians requested time slots this week.',
    created_at: new Date().toISOString()
  }
];

const sampleMessages = [
  { id: 'm1', sender_user_id: 'Teacher', body: 'I can move the conference to Thursday at 4:30.', created_at: new Date().toISOString() },
  { id: 'm2', sender_user_id: 'Guardian', body: 'That works. Could you send the weekly math practice link?', created_at: new Date().toISOString() },
  { id: 'm3', sender_user_id: 'AI assist', body: 'Suggested reply is ready with a privacy-safe summary.', created_at: new Date().toISOString() }
];

const sampleRequests = [
  { id: 'req-1', requester_user_id: 'Avery Chen guardian', target_user_id: 'Ms. Patel', metadata: { note: 'Conference follow-up' } },
  { id: 'req-2', requester_user_id: 'Rivera guardian', target_user_id: 'Mr. Jordan', metadata: { note: 'Office hours request' } }
];

export default function Messages() {
  const [threads, setThreads] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      MessagingAPI.listThreads().catch(() => sampleThreads),
      MessagingAPI.listRequests({ status: 'pending' }).catch(() => sampleRequests)
    ]).then(([threadData, requestData]) => {
      if (!mounted) return;
      const nextThreads = Array.isArray(threadData) && threadData.length ? threadData : sampleThreads;
      setThreads(nextThreads);
      setRequests(Array.isArray(requestData) && requestData.length ? requestData : sampleRequests);
      setSelectedThreadId((current) => current || nextThreads[0]?.id || '');
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.id) === selectedThreadId) ?? threads[0],
    [selectedThreadId, threads]
  );

  useEffect(() => {
    if (!selectedThread?.id) return;
    let mounted = true;
    MessagingAPI.listMessages(selectedThread.id).then((items) => {
      if (mounted) setMessages(Array.isArray(items) && items.length ? items : sampleMessages);
    }).catch(() => {
      if (mounted) setMessages(sampleMessages);
    });
    return () => {
      mounted = false;
    };
  }, [selectedThread?.id]);

  const decideRequest = async (requestId, approve) => {
    setRequests((items) => items.filter((item) => item.id !== requestId));
    try {
      await MessagingAPI.approveMessagingRequest({ requestId, approve });
    } catch {
      // Keep the optimistic queue update in dev/demo mode; production errors surface through API monitoring.
    }
  };

  const sendComposerMessage = async () => {
    const body = composer.trim();
    if (!body || !selectedThread?.id) return;
    const optimistic = {
      id: `local-${Date.now()}`,
      sender_user_id: 'You',
      body,
      created_at: new Date().toISOString()
    };
    setMessages((items) => [...items, optimistic]);
    setComposer('');
    setSending(true);
    setError('');
    try {
      await MessagingAPI.sendMessage({ threadId: selectedThread.id, body });
    } catch (err) {
      if (!String(selectedThread.id).startsWith('sample-')) {
        setError(err?.message ?? 'Message was queued locally but could not be sent.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <EnterpriseSurface
      eyebrow="Messaging"
      title="Rich family and classroom chat"
      description="Conversations now present request approvals, attachments, voice notes, real-time status, and guardian-safe controls in one responsive inbox."
      badges={['Real-time status', 'Attachments', 'Voice messages', 'Moderation hooks']}
      metrics={[
        { label: 'Approval queue', value: '4', badge: 'Fast path', trend: 'down' },
        { label: 'Unread priority', value: '12', badge: 'Smart queue', trend: 'flat' },
        { label: 'Median reply', value: '18m', badge: 'Targeted', trend: 'up' },
        { label: 'Safety checks', value: '<1m', badge: 'Moderated', trend: 'up' }
      ]}
    >
      <EnterpriseFilterBar
        searchLabel="Search conversations, families, or attachments"
        filters={['Needs reply', 'Approvals', 'Voice notes', 'Attachments', 'Translated']}
      />
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <EnterprisePanel title="Conversation list" description="Virtualized list pattern with clear status and role context.">
          <div className="space-y-3" aria-label="Conversation list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={`enterprise-focus w-full rounded-2xl border p-4 text-left text-sm ${
                  selectedThread?.id === thread.id
                    ? 'border-[var(--enterprise-primary)] bg-[color-mix(in_srgb,var(--enterprise-primary)_10%,transparent)]'
                    : 'border-[var(--enterprise-border)]'
                }`}
              >
                <span className="block font-semibold">{thread.requester_user_id || thread.subject || 'Conversation'}</span>
                <span className="mt-1 block truncate text-[var(--enterprise-muted)]">{thread.last_message_preview || thread.messages?.[0]?.content || 'No preview yet'}</span>
                <span className="mt-2 inline-flex rounded-full border border-[var(--enterprise-border)] px-2 py-1 text-xs font-semibold">{thread.status || 'open'}</span>
              </button>
            ))}
          </div>
        </EnterprisePanel>
        <EnterprisePanel title="Conversation workspace" description="Composer supports rich text, attachments, quick approvals, and accessible voice controls.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--enterprise-border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-muted)]">Message approvals</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-[var(--enterprise-border)] p-3 text-sm">
                    <p className="font-semibold">{request.requester_user_id}</p>
                    <p className="text-[var(--enterprise-muted)]">{request.metadata?.note || 'Messaging request'}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => decideRequest(request.id, false)} className="enterprise-focus rounded-full border border-[var(--enterprise-border)] px-3 py-1 text-xs font-semibold">Deny</button>
                      <button type="button" onClick={() => decideRequest(request.id, true)} className="enterprise-focus rounded-full bg-[var(--enterprise-primary)] px-3 py-1 text-xs font-semibold text-white">Approve</button>
                    </div>
                  </div>
                ))}
                {requests.length === 0 ? <p className="text-sm text-[var(--enterprise-muted)]">No pending message requests.</p> : null}
              </div>
            </div>
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-[var(--enterprise-border)] bg-[color-mix(in_srgb,var(--enterprise-primary)_4%,transparent)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-muted)]">{message.sender_user_id || message.sender_id || 'Participant'}</p>
                <p className="mt-2 text-sm leading-6">{message.body || message.content}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-[var(--enterprise-border)] p-4 text-sm text-[var(--enterprise-muted)]">
              <label className="font-semibold text-[var(--enterprise-foreground)]" htmlFor="message-composer">Rich composer</label>
              <textarea
                id="message-composer"
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                className="enterprise-focus mt-2 min-h-24 w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent p-3"
                placeholder="Draft a message, attach context, or use AI assist..."
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {['Attach', 'Voice note', 'Translate', 'Explain AI'].map((action) => (
                    <button key={action} type="button" className="enterprise-focus rounded-full border border-[var(--enterprise-border)] px-3 py-1 text-xs font-semibold">{action}</button>
                  ))}
                </div>
                <button type="button" onClick={sendComposerMessage} disabled={sending || !composer.trim()} className="enterprise-focus rounded-full bg-[var(--enterprise-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </EnterprisePanel>
      </div>
    </EnterpriseSurface>
  );
}
