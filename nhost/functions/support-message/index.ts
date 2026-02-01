import { sendEmail } from '../_shared/email';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage } from '../_shared/hasuraTypes';

const logger = createLogger('support-message');

type GraphQLError = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
};

type HasuraResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

function makeHasuraClient() {
  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) {
    throw new Error('Missing Hasura configuration');
  }

  return async (query: string, variables?: Record<string, any>) => {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
      logger.error('Hasura error', json.errors);
      throw new Error(getHasuraErrorMessage(json.errors));
    }
    return json;
  };
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const userId = String(req.headers['x-hasura-user-id'] ?? '').trim();
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { message } = req.body ?? {};
  const normalizedMessage = String(message ?? '').trim();

  if (!normalizedMessage || normalizedMessage.length < 5) {
    return res.status(400).json({ ok: false, error: 'message_too_short' });
  }

  if (normalizedMessage.length > 5000) {
    return res.status(400).json({ ok: false, error: 'message_too_long' });
  }

  const hasura = makeHasuraClient();

  try {
    // Get user details
    const userResp = await hasura(
      `query GetUser($userId: uuid!) {
        user: auth_users_by_pk(id: $userId) {
          id
          email
          display_name
        }
        profile: user_profiles(where: { user_id: { _eq: $userId } }, limit: 1) {
          role
          school_id
          district_id
        }
      }`,
      { userId }
    );

    const user = userResp?.data?.user;
    const profiles = userResp?.data?.profile;
    const profile = Array.isArray(profiles) && profiles.length > 0 
      ? profiles[0] 
      : null;

    if (!user?.email) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }

    // Store support request in database
    const insertResp = await hasura(
      `mutation InsertSupportRequest($object: support_requests_insert_input!) {
        insert_support_requests_one(object: $object) {
          id
        }
      }`,
      {
        object: {
          user_id: userId,
          message: normalizedMessage,
          status: 'open',
          priority: 'normal',
          source: 'widget',
          school_id: profile?.school_id ?? null,
          district_id: profile?.district_id ?? null,
          metadata: {
            user_role: profile?.role ?? null,
            user_email: user.email,
            user_display_name: user.display_name ?? null,
          },
        },
      }
    );

    const requestId = insertResp?.data?.insert_support_requests_one?.id;
    if (!requestId) {
      throw new Error('Failed to create support request');
    }

    // Get support email address
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM;
    if (!supportEmail) {
      logger.error('SUPPORT_EMAIL not configured');
      return res.status(500).json({ ok: false, error: 'support_email_not_configured' });
    }

    // Send email to support team
    const emailSubject = `Support Request from ${user.display_name || user.email}`;
    const emailBody = `
Support Request ID: ${requestId}

From: ${user.display_name || 'Unknown'} (${user.email})
Role: ${profile?.role || 'Unknown'}
School ID: ${profile?.school_id || 'N/A'}
District ID: ${profile?.district_id || 'N/A'}

Message:
${normalizedMessage}

---
Submitted via Live Support Widget
`;

    try {
      await sendEmail({
        to: supportEmail,
        subject: emailSubject,
        text: emailBody,
        html: `
          <div style="font-family: sans-serif; max-width: 600px;">
            <h2>Support Request</h2>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <hr />
            <p><strong>From:</strong> ${user.display_name || 'Unknown'} (${user.email})</p>
            <p><strong>Role:</strong> ${profile?.role || 'Unknown'}</p>
            <p><strong>School ID:</strong> ${profile?.school_id || 'N/A'}</p>
            <p><strong>District ID:</strong> ${profile?.district_id || 'N/A'}</p>
            <hr />
            <h3>Message:</h3>
            <p style="white-space: pre-wrap;">${normalizedMessage}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">Submitted via Live Support Widget</p>
          </div>
        `,
      });
    } catch (emailError: any) {
      // Log email error but don't fail the request since it's stored in DB
      logger.error('Failed to send support email', emailError);
    }

    logger.info('Support request created', { requestId, userId });

    return res.status(200).json({ 
      ok: true, 
      requestId,
      message: 'Support request submitted successfully'
    });
  } catch (error: any) {
    logger.error('support-message failed', error);
    const message = error?.message ?? 'unexpected_error';
    return res.status(500).json({ ok: false, error: message });
  }
};
