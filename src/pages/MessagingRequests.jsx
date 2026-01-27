import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useUserData } from '@nhost/react';
import { MessagingAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MessagingRequests');

function RequestRow({ request, onApprove, onDeny, onReasonChange, isProcessing, reasonValue }) {
  const created = useMemo(() => {
    if (!request?.created_at) return 'just now';
    try {
      return formatDistanceToNow(new Date(request.created_at), { addSuffix: true });
    } catch (error) {
      logger.error('Invalid date in messaging request', error);
      return request.created_at;
    }
  }, [request?.created_at]);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-gray-500">Requester</p>
          <p className="font-semibold text-gray-900">{request.requester_user_id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Target</p>
          <p className="font-semibold text-gray-900">{request.target_user_id}</p>
        </div>
      </div>

      {request.metadata?.note && (
        <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900">
          <p className="font-semibold">Note from requester</p>
          <p className="whitespace-pre-wrap">{request.metadata.note}</p>
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          placeholder="Optional reason (shared when denying)"
          value={reasonValue}
          onChange={(event) => onReasonChange(request.id, event.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => onDeny(request.id)}
          >
            {isProcessing ? 'Saving…' : 'Deny'}
          </Button>
          <Button
            size="sm"
            disabled={isProcessing}
            onClick={() => onApprove(request.id)}
          >
            {isProcessing ? 'Saving…' : 'Approve'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">Requested {created}</p>
      </div>
    </div>
  );
}

export default function MessagingRequests() {
  const user = useUserData();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState({});
  const [reasons, setReasons] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await MessagingAPI.listRequests({ status: 'pending' });
      setRequests(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      logger.error('Failed to load messaging requests', err);
      setError(err?.message ?? 'Unable to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReasonChange = (id, value) => {
    setReasons((prev) => ({ ...prev, [id]: value }));
  };

  const decide = async (id, approve) => {
    if (!id) return;
    setProcessing((prev) => ({ ...prev, [id]: true }));
    try {
      await MessagingAPI.approveMessagingRequest({
        requestId: id,
        approve,
        reason: reasons[id],
      });
      await load();
    } catch (err) {
      logger.error('Error saving messaging decision', err);
      setError(err?.message ?? 'Unable to save decision');
    } finally {
      setProcessing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const greeting = user?.displayName || user?.email || 'there';

  return (
    <div className="p-6 space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-gray-500">Hi {greeting},</p>
        <h1 className="text-2xl font-semibold text-gray-900">Messaging requests</h1>
        <p className="text-sm text-gray-600">Approve or deny requests addressed to you.</p>
      </header>

      {error && (
        <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Loading requests…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-gray-900">No pending requests</p>
          <p className="text-sm text-gray-600">You&apos;ll see new requests here when parents ask to message you.</p>
        </div>
      ) : (
        <div className={cn('grid gap-4', requests.length > 1 ? 'md:grid-cols-2' : '')}>
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              onApprove={() => decide(request.id, true)}
              onDeny={() => decide(request.id, false)}
              onReasonChange={handleReasonChange}
              isProcessing={processing[request.id]}
              reasonValue={reasons[request.id] ?? ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
