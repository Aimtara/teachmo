import React, { useState } from 'react';
import { useUserData } from '@nhost/react';
import { ThreadsAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';

export default function Messages() {
  const user = useUserData();
  const [status, setStatus] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleNewThread = async () => {
    if (!user?.id || isCreating) return;

    setIsCreating(true);
    setStatus('');

    try {
      const thread = await ThreadsAPI.createThread({
        title: 'New Conversation',
        creatorId: user.id,
        participantIds: [],
        initialMessage: 'Hi!',
      });

      if (thread) {
        setStatus(`Created thread: ${thread.title ?? thread.id}`);
      } else {
        setStatus('Thread created, but details are unavailable.');
      }
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
      <h1 className="text-xl font-semibold">Messages (placeholder)</h1>
      <div className="space-y-2">
        <Button onClick={handleNewThread} disabled={!user?.id || isCreating}>
          {isCreating ? 'Creating…' : 'Start New Thread'}
        </Button>
        {!user?.id && <p className="text-sm text-muted-foreground">Sign in to start a thread.</p>}
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </div>
    </div>
  );
}
