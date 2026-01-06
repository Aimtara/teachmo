import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ROLE_OPTIONS = [
  { value: 'parent', label: 'Parents' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'school_admin', label: 'School admins' },
  { value: 'district_admin', label: 'District admins' },
  { value: 'system_admin', label: 'System admins' },
];

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

function normalizeCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const [channel, setChannel] = useState('email');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState('');
  const [userIds, setUserIds] = useState('');
  const [schoolIds, setSchoolIds] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(new Set(['parent', 'teacher']));

  const headersQuery = useQuery({
    queryKey: ['notification_headers'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const announcementsQuery = useQuery({
    queryKey: ['admin_announcements'],
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/notifications/announcements`, { headers: headersQuery.data }),
  });

  const metricsQuery = useQuery({
    queryKey: ['admin_notification_metrics', channel],
    queryFn: async () =>
      fetchJson(`${API_BASE_URL}/admin/notifications/metrics?channel=${channel}`, { headers: headersQuery.data }),
  });

  const tenantSettingsQuery = useQuery({
    queryKey: ['admin_notification_settings'],
    queryFn: async () => fetchJson(`${API_BASE_URL}/tenants/settings`, { headers: headersQuery.data }),
  });

  const notificationSettings = useMemo(() => {
    const settings = tenantSettingsQuery.data?.settings?.settings || {};
    return settings.notifications || {};
  }, [tenantSettingsQuery.data]);

  const toggleRole = (value) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        channel,
        title,
        body,
        send_at: sendAt ? new Date(sendAt).toISOString() : null,
        segment: {
          roles: Array.from(selectedRoles),
          user_ids: normalizeCsv(userIds),
          school_ids: normalizeCsv(schoolIds),
        },
      };
      return fetchJson(`${API_BASE_URL}/admin/notifications/announcements`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Announcement queued',
        description: 'Your notification is now in the delivery queue.',
      });
      setTitle('');
      setBody('');
      setSendAt('');
      announcementsQuery.refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Unable to send',
        description: error instanceof Error ? error.message : 'Failed to create announcement.',
      });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (nextSettings) => {
      const current = tenantSettingsQuery.data?.settings || {};
      return fetchJson(`${API_BASE_URL}/tenants/settings`, {
        method: 'PUT',
        headers: headersQuery.data,
        body: JSON.stringify({
          branding: current.branding || {},
          settings: {
            ...(current.settings || {}),
            notifications: nextSettings,
          },
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Deliverability settings saved',
        description: 'Tenant validation settings are updated.',
      });
      tenantSettingsQuery.refetch();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to update settings.',
      });
    },
  });

  const metrics = metricsQuery.data?.metrics || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Queue tenant-wide or segmented announcements and monitor deliverability signals.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliverability Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="spf-toggle">SPF validated</Label>
                <Switch
                  id="spf-toggle"
                  checked={notificationSettings.email?.spf === 'pass'}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      ...notificationSettings,
                      email: { ...notificationSettings.email, spf: checked ? 'pass' : 'fail' },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dkim-toggle">DKIM validated</Label>
                <Switch
                  id="dkim-toggle"
                  checked={notificationSettings.email?.dkim === 'pass'}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      ...notificationSettings,
                      email: { ...notificationSettings.email, dkim: checked ? 'pass' : 'fail' },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dmarc-toggle">DMARC validated</Label>
                <Switch
                  id="dmarc-toggle"
                  checked={notificationSettings.email?.dmarc === 'pass'}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      ...notificationSettings,
                      email: { ...notificationSettings.email, dmarc: checked ? 'pass' : 'fail' },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-toggle">SMS opt-in enabled</Label>
                <Switch
                  id="sms-toggle"
                  checked={notificationSettings.sms?.opt_in === true}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      ...notificationSettings,
                      sms: { ...notificationSettings.sms, opt_in: checked },
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                SPF/DKIM/DMARC must pass to send email; SMS opt-in is required for SMS delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Announcement Composer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Quarterly update"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-body">Message</Label>
            <Textarea
              id="announcement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="Share an update with your community..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="announcement-sendat">Scheduled send time</Label>
              <Input
                id="announcement-sendat"
                type="datetime-local"
                value={sendAt}
                onChange={(event) => setSendAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-school">School IDs (optional)</Label>
              <Input
                id="announcement-school"
                value={schoolIds}
                onChange={(event) => setSchoolIds(event.target.value)}
                placeholder="uuid, uuid"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target roles</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLE_OPTIONS.map((role) => (
                <label key={role.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedRoles.has(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-users">Specific user IDs (optional)</Label>
            <Textarea
              id="announcement-users"
              value={userIds}
              onChange={(event) => setUserIds(event.target.value)}
              rows={2}
              placeholder="uuid, uuid"
            />
          </div>

          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            Queue announcement
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliverability Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-muted-foreground">Delivered</div>
            <div className="text-lg font-semibold">{metrics.delivered || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Bounced</div>
            <div className="text-lg font-semibold">{metrics.bounced || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Opened</div>
            <div className="text-lg font-semibold">{metrics.opened || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Clicked</div>
            <div className="text-lg font-semibold">{metrics.clicked || 0}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {(announcementsQuery.data?.announcements || []).map((announcement) => (
            <div key={announcement.id} className="border rounded-md p-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{announcement.title || 'Untitled announcement'}</div>
                <div className="text-xs uppercase text-muted-foreground">{announcement.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {announcement.channel} • scheduled {announcement.send_at ? new Date(announcement.send_at).toLocaleString() : 'now'}
              </div>
              <p>{announcement.body}</p>
              <div className="text-xs text-muted-foreground">
                Delivered {announcement.sent_count || 0} • Bounced {announcement.bounced_count || 0}
              </div>
            </div>
          ))}
          {announcementsQuery.data?.announcements?.length === 0 && (
            <p className="text-muted-foreground">No announcements yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
