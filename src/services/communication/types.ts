export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: string;
  readStatus: 'read' | 'unread';
}

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'teachers' | 'parents';
  postedAt: string;
}
