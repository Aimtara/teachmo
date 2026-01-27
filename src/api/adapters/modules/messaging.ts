import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';

const REQUEST_FIELDS = `
  id
  school_id
  district_id
  requester_user_id
  target_user_id
  status
  reason
  created_at
  decided_at
  decided_by
  expires_at
  metadata
`;

const THREAD_FIELDS = `
  id
  school_id
  district_id
  requester_user_id
  target_user_id
  request_id
  status
  created_at
  last_message_preview
  request { id status }
`;

const MESSAGE_FIELDS = `
  id
  thread_id
  sender_id
  sender_user_id
  body
  created_at
  flagged
  flag_reason
`;

type FunctionEnvelope<T> = { data?: T } | T;

type SendMessageResponse = FunctionEnvelope<{ ok: boolean; messageId?: string | null }>;
type RequestAccessResponse = FunctionEnvelope<{ ok: boolean; requestId?: string | null }>;
type ApproveRequestResponse = FunctionEnvelope<{ ok: boolean; threadId?: string | null }>;

export async function requestMessagingAccess(input: { schoolId: string; targetUserId: string; note?: string }) {
  const { res, error } = await nhost.functions.call('request-messaging-access', input);
  if (error) throw error;
  const payload = (res as RequestAccessResponse)?.data ?? (res as RequestAccessResponse);
  return payload;
}

export async function approveMessagingRequest(input: { requestId: string; approve: boolean; reason?: string }) {
  const { res, error } = await nhost.functions.call('approve-messaging-request', input);
  if (error) throw error;
  const payload = (res as ApproveRequestResponse)?.data ?? (res as ApproveRequestResponse);
  return payload;
}

export async function sendMessage(input: { threadId: string; body: string }) {
  const { res, error } = await nhost.functions.call('send-message', input);
  if (error) throw error;
  const payload = (res as SendMessageResponse)?.data ?? (res as SendMessageResponse);
  return payload;
}

type RequestFilter = {
  status?: { _eq: string };
};

export async function listRequests(params: { status?: string } = {}) {
  const where: RequestFilter = {};
  if (params.status) where.status = { _eq: params.status };

  const data = await graphql(
    `query MessagingRequests($where: messaging_requests_bool_exp) {
      messaging_requests(where: $where, order_by: { created_at: desc }, limit: 50) { ${REQUEST_FIELDS} }
    }`,
    { where }
  );

  return data?.messaging_requests ?? [];
}

export async function listThreads() {
  const data = await graphql(
    `query MessageThreads {
      message_threads(order_by: { created_at: desc }) { ${THREAD_FIELDS} }
    }`
  );

  return data?.message_threads ?? [];
}

export async function listMessages(threadId: string, limit = 100) {
  const data = await graphql(
    `query Messages($threadId: uuid!, $limit: Int!) {
      messages(where: { thread_id: { _eq: $threadId } }, order_by: { created_at: asc }, limit: $limit) {
        ${MESSAGE_FIELDS}
      }
    }`,
    { threadId, limit }
  );

  return data?.messages ?? [];
}
