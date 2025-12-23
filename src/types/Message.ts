export type MessageAttachment = {
  url: string;
  type?: 'image' | 'file';
  filename?: string;
  size?: number;
};

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  unread?: boolean;
  senderName?: string;
  attachments?: MessageAttachment[];
};
