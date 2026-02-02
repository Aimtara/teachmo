import { apiClient } from '../core/client';
import { Announcement, Message } from './types';

export const CommunicationService = {
  // Direct Messaging
  getThreads: () => apiClient.get('/api/comm/threads'),

  getMessages: (threadId: string) =>
    apiClient.get<Message[]>(`/api/comm/threads/${threadId}/messages`),

  sendMessage: (threadId: string, content: string) =>
    apiClient.post<Message>(`/api/comm/threads/${threadId}/messages`, { content }),

  // School Inbox (Distinct from DM)
  getAnnouncements: (schoolId: string) =>
    apiClient.get<Announcement[]>(`/api/comm/school-inbox/${schoolId}`),

  postAnnouncement: (schoolId: string, data: Omit<Announcement, 'id' | 'postedAt'>) =>
    apiClient.post<Announcement>(`/api/comm/school-inbox/${schoolId}`, data)
};
