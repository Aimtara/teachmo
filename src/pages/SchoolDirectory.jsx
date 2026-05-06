import { useEffect, useState } from 'react';
import { useUserData } from '@nhost/react';
import { MessagingAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EnterpriseFilterBar, EnterprisePanel, EnterpriseSurface, EnterpriseWorkflowList } from '@/components/enterprise';

export default function SchoolDirectory() {
  const user = useUserData();
  const [schoolId, setSchoolId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const derivedSchoolId = String(user?.metadata?.school_id ?? user?.metadata?.schoolId ?? '').trim();
    if (derivedSchoolId) setSchoolId(derivedSchoolId);
  }, [user]);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!schoolId || !targetUserId) return;
    setIsSubmitting(true);
    setStatus('');
    try {
      const response = await MessagingAPI.requestMessagingAccess({ schoolId, targetUserId, note: note || undefined });
      setStatus(response?.ok ? 'Request sent for approval.' : 'Unable to send request.');
      if (response?.ok) setNote('');
    } catch (error) {
      console.error(error);
      setStatus(error?.message ?? 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EnterpriseSurface
      eyebrow="Directory"
      title="School directory"
      description="Families and staff can search school contacts, understand privacy scope, and request messaging access through approval-safe workflows."
      badges={['Search', 'Privacy scope', 'Approval requests', 'Data export ready']}
      metrics={[
        { label: 'Visibility', value: 'Scoped', badge: 'Privacy', trend: 'flat', description: 'Directory access respects role, school, and consent boundaries.' },
        { label: 'Requests', value: status ? 'Sent' : 'Ready', badge: 'Approval', trend: 'up', description: 'Messaging access remains explicit and auditable.' },
        { label: 'Search modes', value: '4', badge: 'Filters', trend: 'flat', description: 'Role, school, grade, and program filters share one surface.' },
        { label: 'Compliance', value: 'Exportable', badge: 'DSAR', trend: 'up', description: 'Directory data supports privacy and export workflows.' }
      ]}
      aside={
        <EnterprisePanel title="Directory controls" description="Privacy-first search and approval patterns.">
          <EnterpriseWorkflowList
            items={[
              { label: 'Role filter', description: 'Find teachers, staff, counselors, and program partners.', status: 'Filter', tone: 'info' },
              { label: 'Guardian consent', description: 'Private contact details stay hidden until approved.', status: 'Required', tone: 'warning' },
              { label: 'Data export', description: 'Families can request directory-related data in settings.', status: 'Ready', tone: 'success' }
            ]}
          />
        </EnterprisePanel>
      }
    >
      <EnterpriseFilterBar searchLabel="Search school, teacher, staff, grade, or program" filters={['Teachers', 'Staff', 'Programs', 'My school', 'Privacy-safe']} />
      <EnterprisePanel title="Message access request" description="Request permission to message a teacher or staff member directly from the directory.">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitRequest} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="directory-school">School ID</Label>
              <Input
                id="directory-school"
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
                placeholder="School ID"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="directory-target">Teacher or staff user ID</Label>
              <Input
                id="directory-target"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                placeholder="Target user ID"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="directory-note">Optional note</Label>
            <Textarea
              id="directory-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Share context for your request"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Request to message'}
            </Button>
            {status && <p className="text-sm text-gray-700">{status}</p>}
          </div>
        </form>
      </div>
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
