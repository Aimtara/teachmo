export type BackendUser = {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

export type ChildProfile = {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
};

export type ActivitySummary = {
  id: string;
  title?: string;
  status?: string;
  completion_date?: string;
};

export type AttachmentInput = {
  url: string;
  type?: string;
  filename?: string;
  size?: number;
};

export type MessageInput = {
  conversationId: string;
  content: string;
  senderId?: string;
  attachments?: AttachmentInput[];
  metadata?: Record<string, unknown>;
};

export type FileUploadResult = {
  url: string;
  id?: string;
  bucketId?: string;
};

export interface BackendAdapter {
  getCurrentUser(): Promise<BackendUser | null>;
  listChildren(): Promise<ChildProfile[]>;
  listActivities(options?: { status?: string; excludeStatus?: string; limit?: number; search?: string }): Promise<
    ActivitySummary[]
  >;
  createMessage(input: MessageInput): Promise<unknown>;
  uploadFile(file: File | Blob, filename?: string): Promise<FileUploadResult>;
}
