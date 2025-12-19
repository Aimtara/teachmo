import { useEffect, useState } from 'react';
import { useUserData } from '@nhost/react';
import { MessagingAPI } from '@/api/adapters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">School Directory</h1>
      <p className="text-sm text-gray-600">Request permission to message a teacher or staff member directly from the directory.</p>

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
    </div>
  );
}
