import React, { useState } from 'react';
import { useUserData } from '@nhost/react';
import { ThreadsAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUserRole } from '@/hooks/useUserRole';
import { can } from '@/security/permissions';

export default function Messages() {
  const user = useUserData();
  const role = useUserRole();
  const [title, setTitle] = useState('New Conversation');
  const [emailsInput, setEmailsInput] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [status, setStatus] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const canInvite = can(role, 'messages:invite');

  const handleNewThread = async (event) => {
    event.preventDefault();
    if (!user?.id || !canInvite || isCreating) return;

    setIsCreating(true);
    setStatus('');

    const emails = emailsInput
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    try {
      const thread = await ThreadsAPI.createThreadByEmails({
        title: title || 'New Conversation',
        creatorId: user.id,
        participantEmails: emails,
        initialMessage: initialMessage || undefined,
      });

      if (thread) {
        setStatus(`Created thread: ${thread.title ?? thread.id}`);
      } else {
        setStatus('Thread created, but details are unavailable.');
      }

      setTitle('');
      setEmailsInput('');
      setInitialMessage('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Thread creation failed', error);
      setStatus('Unable to create thread.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Start a conversation by inviting parents via email.
        </p>
      </div>

      {!user?.id && <p className="text-sm text-muted-foreground">Sign in to start a thread.</p>}

      {user?.id && !canInvite && (
        <p className="text-sm text-muted-foreground">
          You do not have permission to invite participants by email.
        </p>
      )}

      {user?.id && canInvite && (
        <form onSubmit={handleNewThread} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="thread-title">Thread title</Label>
            <Input
              id="thread-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Parent check-in"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="participant-emails">Invite emails</Label>
            <Input
              id="participant-emails"
              value={emailsInput}
              onChange={(event) => setEmailsInput(event.target.value)}
              placeholder="parent1@example.com, parent2@example.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter comma-separated emails. We will only add accounts that already exist.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial-message">Initial message (optional)</Label>
            <Textarea
              id="initial-message"
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              placeholder="Welcome to our class thread!"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Button type="submit" disabled={!user?.id || isCreating}>
              {isCreating ? 'Creating…' : 'Start New Thread'}
            </Button>
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
