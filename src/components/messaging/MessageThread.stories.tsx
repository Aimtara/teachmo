import React from 'react';
import MessageInput from './MessageInput';
import { MessageList } from './MessageList';

export default {
  title: 'Launch Critical/Messaging/Thread',
  parameters: {
    layout: 'padded',
    chromatic: { viewports: [390, 1024] },
  },
};

const messages = [
  {
    id: 'msg-1',
    senderId: 'teacher-1',
    senderName: 'Ms. Rivera',
    content: 'Hi! Sofia had a strong reading day and finished the chapter reflection.',
    timestamp: '2026-05-05T14:10:00Z',
    status: 'read',
  },
  {
    id: 'msg-2',
    senderId: 'parent-1',
    senderName: 'Jordan Lee',
    content: 'That is great to hear. Should we keep practicing the same vocabulary list tonight?',
    timestamp: '2026-05-05T14:12:00Z',
    status: 'delivered',
  },
  {
    id: 'msg-3',
    senderId: 'teacher-1',
    senderName: 'Ms. Rivera',
    content: 'Yes — especially the words highlighted in **Unit 4**. I attached the family practice sheet.',
    timestamp: '2026-05-05T14:14:00Z',
    status: 'sent',
    attachments: [
      {
        type: 'document',
        filename: 'unit-4-family-practice.pdf',
        url: '#',
        size: 184_320,
      },
    ],
  },
];

export function ParentTeacherThread() {
  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-sky-700">Oak Ridge Elementary</p>
          <h2 className="text-2xl font-semibold text-slate-950">Reading support thread</h2>
          <p className="text-sm text-slate-600">Family-safe messaging with read receipts and attachments.</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Active</span>
      </header>

      <MessageList initialMessages={messages} currentUserId="parent-1" threadPartnerId="teacher-1" />

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
        <MessageInput user={{ id: 'parent-1' }} threadPartnerId="teacher-1" placeholder="Reply to Ms. Rivera…" />
      </div>
    </section>
  );
}

export function EmptyThread() {
  return (
    <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-5">
        <h2 className="text-2xl font-semibold text-slate-950">Start a teacher conversation</h2>
        <p className="text-sm text-slate-600">The empty state should make the next action obvious.</p>
      </header>
      <MessageList emptyState="No messages yet. Send a note to start this family support thread." />
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <MessageInput user={{ id: 'parent-1' }} threadPartnerId="teacher-1" placeholder="Write the first message…" />
      </div>
    </section>
  );
}
