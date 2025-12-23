import { base44EntitiesMap } from '@/api/base44';
import { base44 } from '@/api/base44Client';
import { nhost } from '@/lib/nhostClient';
import { logger } from '@/observability/logger';
import type { BackendAdapter, BackendUser, MessageInput, FileUploadResult } from './types';

const nhostClient = nhost as unknown as {
  auth?: {
    getUser?: () => AuthUser | Promise<AuthUser>;
    signOut?: () => Promise<unknown>;
  };
  storage?: {
    upload?: (params: { file: File | Blob; name?: string }) => Promise<{
      error?: unknown;
      fileMetadata?: { id?: string; bucketId?: string; bucket_id?: string; url?: string; file?: { url?: string } };
      file?: { id?: string; bucketId?: string; bucket_id?: string; url?: string; file?: { url?: string } };
    }>;
  };
};

type AuthUser = {
  id?: string;
  email?: string;
  displayName?: string;
  metadata?: Record<string, unknown>;
  role?: string;
  preferred_active_role?: string;
  roles?: string[];
  defaultRole?: string;
  name?: string;
};

const toBackendUser = (user: AuthUser | null | undefined): BackendUser | null => {
  if (!user) return null;
  const metadata = (user.metadata ?? {}) as Record<string, unknown>;
  const roleFromMetadata =
    typeof metadata.role === 'string'
      ? (metadata.role as string)
      : typeof metadata['preferred_active_role'] === 'string'
        ? (metadata['preferred_active_role'] as string)
        : undefined;

  const preferredRole =
    user.preferred_active_role ||
    roleFromMetadata ||
    user.role ||
    (Array.isArray(user.roles) ? user.roles[0] : undefined) ||
    user.defaultRole;

  const fullName =
    user.displayName ||
    (typeof metadata.full_name === 'string' ? (metadata.full_name as string) : undefined) ||
    user.name;

  return {
    id: user.id as string,
    email: user.email,
    displayName: fullName,
    role: preferredRole,
    metadata
  };
};

const getNhostUser = async (): Promise<AuthUser | null> => {
  const maybeUser = nhostClient.auth?.getUser?.();
  if (maybeUser instanceof Promise) {
    return (await maybeUser) as AuthUser;
  }
  return (maybeUser as AuthUser) ?? null;
};

const nhostAdapter: BackendAdapter = {
  async getCurrentUser() {
    try {
      const user =
        typeof base44?.auth?.me === 'function'
          ? await base44.auth.me()
          : await getNhostUser();
      const normalized = toBackendUser(user);
      logger.info('Fetched current user', { userId: normalized?.id, scope: 'backend.getCurrentUser' });
      return normalized;
    } catch (error) {
      logger.error('Failed to fetch current user', { error, scope: 'backend.getCurrentUser' });
      return null;
    }
  },

  async listChildren() {
    try {
      const currentUser = await getNhostUser();
      const currentUserId = currentUser?.id;
      const results = await base44EntitiesMap.Child?.list?.('-created_date');
      const children = Array.isArray(results) ? results : [];
      logger.info('Loaded children', {
        userId: currentUserId,
        scope: 'backend.listChildren',
        extra: { count: children.length }
      });
      return children;
    } catch (error) {
      logger.error('Failed to load children', { error, scope: 'backend.listChildren' });
      return [];
    }
  },

  async listActivities(options = {}) {
    const { status, excludeStatus, limit = 25, search } = options;
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (excludeStatus) filters.status = { $ne: excludeStatus };
    if (search) filters.title = { $ilike: `%${search}%` };

    try {
      const activities = await base44EntitiesMap.Activity?.filter?.(filters, '-created_date', limit);
      const list = Array.isArray(activities) ? activities : [];
      const currentUser = await getNhostUser();
      logger.info('Loaded activities', {
        userId: currentUser?.id,
        scope: 'backend.listActivities',
        extra: { count: list.length }
      });
      return list;
    } catch (error) {
      logger.error('Failed to load activities', { error, scope: 'backend.listActivities' });
      return [];
    }
  },

  async createMessage(input: MessageInput) {
    try {
      const result = await base44EntitiesMap.Message?.create?.({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        content: input.content,
        attachments: input.attachments,
        metadata: input.metadata
      });
      logger.info('Created message', {
        userId: input.senderId,
        scope: 'backend.createMessage',
        extra: { conversationId: input.conversationId }
      });
      return result;
    } catch (error) {
      logger.error('Failed to create message', {
        error,
        userId: input.senderId,
        scope: 'backend.createMessage'
      });
      throw error;
    }
  },

  async uploadFile(file: File | Blob, filename?: string): Promise<FileUploadResult> {
    try {
      const currentUser = await getNhostUser();
      const upload = nhostClient.storage?.upload;
      if (!upload) throw new Error('Nhost storage client not configured.');
      const response = await upload({ file, name: filename });
      if (response?.error) throw response.error;

      const metadata = response?.fileMetadata || response?.file;
      const url = metadata?.url || metadata?.file?.url || '';
      const result = {
        url,
        id: metadata?.id,
        bucketId: metadata?.bucketId ?? metadata?.bucket_id
      };

      logger.info('Uploaded file', {
        userId: currentUser?.id,
        scope: 'backend.uploadFile',
        extra: { bucketId: result.bucketId, hasUrl: Boolean(url) }
      });
      return result;
    } catch (error) {
      logger.error('File upload failed', {
        error,
        userId: (await getNhostUser())?.id,
        scope: 'backend.uploadFile'
      });
      throw error;
    }
  }
};

export { nhostAdapter };
export default nhostAdapter;
