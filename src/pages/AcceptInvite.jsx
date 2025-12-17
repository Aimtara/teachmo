import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { InvitesAPI } from '@/api/adapters';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('accepting');

  useEffect(() => {
    (async () => {
      try {
        const response = await InvitesAPI.acceptThreadInvite(token);
        if (response?.threadId) {
          setStatus('accepted');
          nav(`/messages?threadId=${encodeURIComponent(response.threadId)}`, { replace: true });
        } else {
          setStatus('invalid');
        }
      } catch (error) {
        console.error('accept-thread-invite failed', error);
        setStatus('error');
      }
    })();
  }, [token, nav]);

  return (
    <div style={{ padding: 24 }}>
      {status === 'accepting' && <div>Accepting invite…</div>}
      {status === 'accepted' && <div>Invite accepted. Redirecting…</div>}
      {status === 'invalid' && <div>Invite invalid or expired.</div>}
      {status === 'error' && <div>Could not accept invite. Please sign in and try again.</div>}
    </div>
  );
}
