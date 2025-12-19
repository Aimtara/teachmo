import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useUserData } from '@nhost/react';
import { MessagingAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils';

function ThreadList({ threads, selectedId, onSelect, loading }) {
  if (loading) return <p className="text-gray-600">Loading threads…</p>;
  if (!threads?.length) return <p className="text-gray-600">No threads yet.</p>;

  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const isActive = selectedId === thread.id;
        const statusLabel = thread.status || 'active';
        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.id)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              isActive ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-emerald-200'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">Thread</p>
                <p className="text-xs text-gray-600">Requester: {thread.requester_user_id}</p>
                <p className="text-xs text-gray-600">Target: {thread.target_user_id}</p>
              </div>
              <span className="text-xs font-medium text-emerald-700">{statusLabel}</span>
            </div>
            {thread.last_message_preview && (
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">{thread.last_message_preview}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MessageList({ messages, currentUserId }) {
  if (!messages?.length) return <p className="text-gray-600">No messages yet.</p>;

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isMine = message.sender_id === currentUserId || message.sender_user_id === currentUserId;
        let when = 'just now';
        try {
          when = message.created_at
            ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
            : 'just now';
        } catch (error) {
          console.error(error);
          when = message.created_at || 'unknown';
        }
        return (
          <div
            key={message.id}
            className={cn(
              'max-w-[80%] rounded-lg border p-3 shadow-sm',
              isMine ? 'ml-auto bg-emerald-50 border-emerald-100' : 'mr-auto bg-white border-gray-200'
            )}
          >
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.body}</p>
            <p className="mt-1 text-xs text-gray-500">{isMine ? 'You' : 'Other'} · {when}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Messages() {
  const user = useUserData();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState('');

  const [requestTargetId, setRequestTargetId] = useState('');
  const [requestSchoolId, setRequestSchoolId] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  useEffect(() => {
    const schoolId =
      String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim();
    if (schoolId) setRequestSchoolId(schoolId);
  }, [user]);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const list = await MessagingAPI.listThreads();
      setThreads(Array.isArray(list) ? list : []);
      if (!selectedThreadId && list?.[0]?.id) {
        setSelectedThreadId(list[0].id);
      }
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus(err?.message ?? 'Unable to load threads');
    } finally {
      setLoadingThreads(false);
    }
  }, [selectedThreadId]);

  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const list = await MessagingAPI.listMessages(threadId);
      setMessages(Array.isArray(list) ? list : []);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus(err?.message ?? 'Unable to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedThreadId) loadMessages(selectedThreadId);
  }, [selectedThreadId, loadMessages]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [threads, selectedThreadId]
  );
  const canSend = useMemo(() => {
    if (!selectedThread) return false;
    if (selectedThread.status && selectedThread.status !== 'active') return false;
    if (selectedThread.request && selectedThread.request.status && selectedThread.request.status !== 'approved') return false;
    return true;
  }, [selectedThread]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || !newMessage.trim()) return;
    setSending(true);
    try {
      await MessagingAPI.sendMessage({ threadId: selectedThreadId, body: newMessage.trim() });
      setNewMessage('');
      await loadMessages(selectedThreadId);
      await loadThreads();
    } catch (err) {
      console.error(err);
      setStatus(err?.message ?? 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!requestSchoolId || !requestTargetId) return;
    setRequestBusy(true);
    setRequestStatus('');
    try {
      const response = await MessagingAPI.requestMessagingAccess({
        schoolId: requestSchoolId,
        targetUserId: requestTargetId,
        note: requestNote || undefined,
      });
      if (response?.ok) {
        setRequestStatus('Request submitted. We will notify the teacher.');
        setRequestNote('');
      } else {
        setRequestStatus('Request could not be submitted.');
      }
    } catch (err) {
      console.error(err);
      setRequestStatus(err?.message ?? 'Unable to submit request');
    } finally {
      setRequestBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-600">Approved threads appear below. Requests are required before messaging.</p>
      </header>

      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-emerald-900">Request access to message a teacher</h2>
        <p className="text-sm text-emerald-800">Submit a request; the teacher will approve before messages are allowed.</p>
        <form onSubmit={submitRequest} className="mt-3 grid gap-3 md:grid-cols-3 md:items-end">
          <div className="space-y-1">
            <Label htmlFor="school-id">School ID</Label>
            <Input
              id="school-id"
              value={requestSchoolId}
              onChange={(event) => setRequestSchoolId(event.target.value)}
              placeholder="School ID"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target-id">Teacher or staff user ID</Label>
            <Input
              id="target-id"
              value={requestTargetId}
              onChange={(event) => setRequestTargetId(event.target.value)}
              placeholder="Target user ID"
              required
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label htmlFor="note">Optional note</Label>
            <Textarea
              id="note"
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Share context for your request"
              rows={2}
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={requestBusy}>
              {requestBusy ? 'Submitting…' : 'Request to message'}
            </Button>
            {requestStatus && <p className="text-sm text-gray-700">{requestStatus}</p>}
          </div>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Threads</h2>
            <Button variant="outline" size="sm" onClick={loadThreads} disabled={loadingThreads}>
              Refresh
            </Button>
          </div>
          <ThreadList
            threads={threads}
            selectedId={selectedThreadId}
            onSelect={setSelectedThreadId}
            loading={loadingThreads}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4 min-h-[320px]">
          {selectedThread ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Thread</p>
                  <p className="font-semibold text-gray-900">{selectedThread.id}</p>
                  <p className="text-xs text-gray-600">Status: {selectedThread.status}</p>
                  {selectedThread.request?.status && (
                    <p className="text-xs text-gray-600">Request: {selectedThread.request.status}</p>
                  )}
                </div>
              </div>

              <div className="border rounded-md p-3 bg-gray-50 max-h-[420px] overflow-y-auto">
                {loadingMessages ? (
                  <p className="text-gray-600">Loading messages…</p>
                ) : (
                  <MessageList messages={messages} currentUserId={user?.id} />
                )}
              </div>

              <form onSubmit={handleSend} className="space-y-2">
                <Label htmlFor="new-message">New message</Label>
                <Textarea
                  id="new-message"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Type your message"
                  rows={3}
                  disabled={!canSend}
                />
                {!canSend && (
                  <p className="text-sm text-gray-600">
                    Messaging is locked until this request is approved and the thread is active.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={sending || !newMessage.trim() || !canSend}
                  >
                    {sending ? 'Sending…' : 'Send message'}
                  </Button>
                  {status && <p className="text-sm text-gray-700">{status}</p>}
                </div>
              </form>
            </>
          ) : (
            <p className="text-gray-600">Select a thread to view messages.</p>
          )}
        </div>
      </div>
    </div>
  );
}
