import { useEffect, useState } from 'react';
import { useUserData } from '@nhost/react';
import { DataScopesAPI, InviteAdminAPI, ThreadsAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUserRole } from '@/hooks/useUserRole';
import { can } from '@/security/permissions';
import { SYSTEM_SCOPE_DEFAULTS } from '@/utils/scopes';

export default function Messages() {
  const user = useUserData();
  const role = useUserRole();
  const [title, setTitle] = useState('New Conversation');
  const [emailsInput, setEmailsInput] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [status, setStatus] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [manageThreadId, setManageThreadId] = useState('');
  const [managedInvites, setManagedInvites] = useState([]);
  const [manageStatus, setManageStatus] = useState('');
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [activeInviteAction, setActiveInviteAction] = useState('');
  const [scopes, setScopes] = useState(SYSTEM_SCOPE_DEFAULTS);
  const [scopesError, setScopesError] = useState('');
  const [scopesLoading, setScopesLoading] = useState(false);

  const canInvite = can(role, 'messages:invite');
  const canManageInvites = can(role, 'threads:invite_manage');
  const invitesAllowedByScope = scopes?.messaging?.sendInvites !== false;
  const emailAllowedByScope = scopes?.messaging?.useEmail !== false;
  const scopeBlockReason = !invitesAllowedByScope
    ? 'Invitations are disabled by your district consent settings.'
    : !emailAllowedByScope
      ? 'Email delivery is disabled by your district consent settings.'
      : '';

  useEffect(() => {
    const loadScopes = async () => {
      if (!user?.id) return;
      const districtId = String(user?.metadata?.district_id ?? user?.metadata?.districtId ?? '').trim();
      const schoolId = String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim();

      if (!districtId) {
        setScopes(SYSTEM_SCOPE_DEFAULTS);
        setScopesError('');
        return;
      }

      setScopesLoading(true);
      setScopesError('');
      try {
        const result = await DataScopesAPI.fetchDataScopes({ districtId, schoolId: schoolId || undefined });
        setScopes(result.effectiveScopes ?? SYSTEM_SCOPE_DEFAULTS);
      } catch (error) {
        console.error('load scopes failed', error);
        setScopes(SYSTEM_SCOPE_DEFAULTS);
        setScopesError('Unable to load consent settings; using safe defaults.');
      } finally {
        setScopesLoading(false);
      }
    };

    loadScopes();
  }, [user]);

  const handleNewThread = async (event) => {
    event.preventDefault();
    if (!user?.id || !canInvite || isCreating) return;
    if (!invitesAllowedByScope || !emailAllowedByScope) {
      setStatus(scopeBlockReason);
      return;
    }

    setIsCreating(true);
    setStatus('');
    setInviteResults([]);

    const emails = emailsInput
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    try {
      const { thread, invites } = await ThreadsAPI.createThreadByEmails({
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
      setInviteResults(invites ?? []);

      setTitle('');
      setEmailsInput('');
      setInitialMessage('');
    } catch (error) {
      console.error('Thread creation failed', error);
      setStatus('Unable to create thread or send invites.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const loadInvites = async (threadIdValue) => {
    if (!threadIdValue || !canManageInvites) return;
    setIsLoadingInvites(true);
    setManageStatus('');
    setManagedInvites([]);

    try {
      const invites = await InviteAdminAPI.listThreadInvites(threadIdValue);
      setManagedInvites(invites ?? []);
      if (!invites?.length) {
        setManageStatus('No invites found for this thread.');
      }
    } catch (error) {
      console.error('list-thread-invites failed', error);
      setManageStatus('Unable to load invites for this thread.');
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const handleLoadInvites = async (event) => {
    event.preventDefault();
    const trimmed = manageThreadId.trim();
    if (!trimmed) return;
    setManageThreadId(trimmed);
    await loadInvites(trimmed);
  };

  const handleResendInvite = async (inviteId) => {
    if (!inviteId || !canManageInvites) return;
    if (!invitesAllowedByScope || !emailAllowedByScope) {
      setManageStatus(scopeBlockReason);
      return;
    }
    setActiveInviteAction(`resend-${inviteId}`);
    setManageStatus('');
    try {
      await InviteAdminAPI.resendThreadInvite(inviteId);
      setManageStatus('Invite resent.');
      await loadInvites(manageThreadId.trim());
    } catch (error) {
      console.error('resend-thread-invite failed', error);
      setManageStatus('Unable to resend invite.');
    } finally {
      setActiveInviteAction('');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!inviteId || !canManageInvites) return;
    const reason =
      typeof window !== 'undefined'
        ? window.prompt('Why are you revoking this invite? (optional)') ?? undefined
        : undefined;
    setActiveInviteAction(`revoke-${inviteId}`);
    setManageStatus('');
    try {
      await InviteAdminAPI.revokeThreadInvite(inviteId, reason || undefined);
      setManageStatus('Invite revoked.');
      await loadInvites(manageThreadId.trim());
    } catch (error) {
      console.error('revoke-thread-invite failed', error);
      setManageStatus('Unable to revoke invite.');
    } finally {
      setActiveInviteAction('');
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

      {user?.id && canInvite && scopeBlockReason && (
        <p className="text-sm text-muted-foreground">
          {scopeBlockReason}
        </p>
      )}

      {scopesError && (
        <p className="text-sm text-muted-foreground">
          {scopesError}
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
              Enter comma-separated emails. We will add existing users immediately and email invites to
              new participants.
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
            <Button type="submit" disabled={!user?.id || isCreating || !invitesAllowedByScope || !emailAllowedByScope}>
              {isCreating ? 'Creating…' : 'Start New Thread'}
            </Button>
            {status && <p className="text-sm text-muted-foreground">{status}</p>}
            {inviteResults.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-semibold">Invite results</p>
                <ul className="list-disc pl-5 space-y-1">
                  {inviteResults.map((result) => (
                    <li key={`${result.email}-${result.status}`}>
                      <span className="font-medium">{result.email}</span> —{' '}
                      {result.status === 'added_existing_user'
                        ? 'added to the thread'
                        : result.status === 'invited_new_user'
                          ? 'invited with a secure link'
                          : "Can't invite: not found in your school directory."}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </form>
      )}

      {user?.id && canManageInvites && (
        <div className="space-y-3 border rounded-md p-4 max-w-4xl">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Manage invites</h2>
            <p className="text-sm text-muted-foreground">
              Review pending invites for threads you created. Emails are masked to avoid exposing full addresses.
            </p>
          </div>

          <form onSubmit={handleLoadInvites} className="space-y-2">
            <Label htmlFor="manage-thread-id">Thread ID</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="manage-thread-id"
                value={manageThreadId}
                onChange={(event) => setManageThreadId(event.target.value)}
                placeholder="Thread ID you own"
                className="sm:max-w-xs"
              />
              <Button type="submit" disabled={isLoadingInvites || !manageThreadId.trim()}>
                {isLoadingInvites ? 'Loading…' : 'Load invites'}
              </Button>
            </div>
            {manageStatus && <p className="text-sm text-muted-foreground">{manageStatus}</p>}
          </form>

          {managedInvites.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-md">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Expires</th>
                    <th className="p-2 font-medium">Last sent</th>
                    <th className="p-2 font-medium">Send count</th>
                    <th className="p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedInvites.map((invite) => {
                    const isAccepted = Boolean(invite.acceptedAt);
                    const isRevoked = Boolean(invite.revokedAt);
                    const isExpired = invite.expiresAt
                      ? new Date(invite.expiresAt).getTime() <= Date.now()
                      : false;
                    const statusLabel = isAccepted
                      ? 'Accepted'
                      : isRevoked
                        ? 'Revoked'
                        : isExpired
                          ? 'Expired'
                          : 'Pending';
                    const isResending = activeInviteAction === `resend-${invite.id}`;
                    const isRevoking = activeInviteAction === `revoke-${invite.id}`;
                    return (
                      <tr key={invite.id} className="border-t">
                        <td className="p-2">{invite.emailMasked}</td>
                        <td className="p-2">{statusLabel}</td>
                        <td className="p-2">{formatDate(invite.expiresAt)}</td>
                        <td className="p-2">{formatDate(invite.lastSentAt)}</td>
                        <td className="p-2">{invite.sendCount ?? 0}</td>
                        <td className="p-2 space-x-2 whitespace-nowrap">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isAccepted || isRevoked || isExpired || isResending}
                            onClick={() => handleResendInvite(invite.id)}
                          >
                            {isResending ? 'Resending…' : 'Resend'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isAccepted || isRevoked || isRevoking}
                            onClick={() => handleRevokeInvite(invite.id)}
                          >
                            {isRevoking ? 'Revoking…' : 'Revoke'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
