import { useEffect, useMemo, useState } from 'react';
import { Page, Card, Button, TextInput, Select, Textarea, Table } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

const roleOptions = [
  { value: 'parent', label: 'Parents' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
  { value: 'all', label: 'All Users' },
];

const gradeOptions = [
  { value: '', label: 'All Grades' },
  { value: 'k', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
  { value: '9', label: '9th Grade' },
  { value: '10', label: '10th Grade' },
  { value: '11', label: '11th Grade' },
  { value: '12', label: '12th Grade' },
];

function buildSegmentLabel(role, grade) {
  const roleLabel = role === 'all' ? 'All Users' : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`;
  if (!grade) return roleLabel;
  const gradeLabel = gradeOptions.find((option) => option.value === grade)?.label || `Grade ${grade}`;
  return `${gradeLabel} ${roleLabel}`;
}

/**
 * AdminNotificationCampaigns
 * Admin interface to create, schedule and view tenant-wide or segmented notification campaigns.
 */
export default function AdminNotificationCampaigns() {
  const { hasPermission } = usePermissions();
  const [campaigns, setCampaigns] = useState([]);
  const [campaign, setCampaign] = useState({
    name: '',
    message: '',
    role: 'parent',
    grade: '',
    schedule: 'now',
    sendAt: '',
  });
  const [loading, setLoading] = useState(false);

  const loadCampaigns = async () => {
    try {
      const res = await nhost.graphql.request(
        `
          query ListCampaigns {
            notification_campaigns(order_by: { created_at: desc }) {
              id
              name
              message
              segment
              schedule
              send_at
              status
            }
          }
        `,
        {}
      );
      setCampaigns(res?.notification_campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_notifications')) {
      loadCampaigns();
    }
  }, [hasPermission]);

  const segmentPreview = useMemo(
    () => buildSegmentLabel(campaign.role, campaign.grade),
    [campaign.role, campaign.grade],
  );

  const createCampaign = async () => {
    setLoading(true);
    try {
      const segment = {
        roles: campaign.role === 'all' ? ['parent', 'teacher', 'student'] : [campaign.role],
        ...(campaign.grade ? { grades: [campaign.grade] } : {}),
      };

      await nhost.graphql.request(
        `
          mutation InsertCampaign($object: notification_campaigns_insert_input!) {
            insert_notification_campaigns_one(object: $object) { id }
          }
        `,
        {
          object: {
            name: campaign.name,
            message: campaign.message,
            segment,
            schedule: campaign.schedule,
            send_at: campaign.schedule === 'later' && campaign.sendAt
              ? new Date(campaign.sendAt).toISOString()
              : null,
          },
        }
      );
      setCampaign({ name: '', message: '', role: 'parent', grade: '', schedule: 'now', sendAt: '' });
      loadCampaigns();
    } catch (err) {
      console.error('Failed to create campaign', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Notification Campaigns">
      {!hasPermission('manage_notifications') ? (
        <p>You do not have permission to manage notification campaigns.</p>
      ) : (
        <>
          <p>Create and schedule tenant-wide announcements or targeted campaigns.</p>
          <Card className="p-4 space-y-3 mb-4">
            <h3 className="text-lg font-semibold">Create Campaign</h3>
            <TextInput
              label="Campaign Name"
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            />
            <Textarea
              label="Message"
              value={campaign.message}
              onChange={(e) => setCampaign({ ...campaign, message: e.target.value })}
            />
            <Select
              label="Audience Role"
              value={campaign.role}
              onChange={(e) => setCampaign({ ...campaign, role: e.target.value })}
              options={roleOptions}
            />
            <Select
              label="Grade Filter"
              value={campaign.grade}
              onChange={(e) => setCampaign({ ...campaign, grade: e.target.value })}
              options={gradeOptions}
            />
            <div className="text-sm text-muted-foreground">
              Segment preview: <span className="font-medium text-foreground">{segmentPreview}</span>
            </div>
            <Select
              label="Schedule"
              value={campaign.schedule}
              onChange={(e) => setCampaign({ ...campaign, schedule: e.target.value })}
              options={[
                { value: 'now', label: 'Send Now' },
                { value: 'later', label: 'Schedule for Later' },
              ]}
            />
            {campaign.schedule === 'later' && (
              <TextInput
                label="Send At"
                type="datetime-local"
                value={campaign.sendAt}
                onChange={(e) => setCampaign({ ...campaign, sendAt: e.target.value })}
              />
            )}
            <Button onClick={createCampaign} disabled={loading}>
              Create Campaign
            </Button>
          </Card>
          <h3 className="text-lg font-semibold mb-2">Existing Campaigns</h3>
          <Table
            data={campaigns}
            columns={[
              { Header: 'Name', accessor: 'name' },
              {
                Header: 'Segment',
                accessor: 'segment',
                Cell: ({ row }) => {
                  const segment = row?.original?.segment || {};
                  const role = Array.isArray(segment.roles) && segment.roles.length === 1
                    ? segment.roles[0]
                    : 'all';
                  const grade = Array.isArray(segment.grades) && segment.grades.length
                    ? segment.grades[0]
                    : '';
                  return buildSegmentLabel(role, grade);
                },
              },
              { Header: 'Schedule', accessor: 'schedule' },
              { Header: 'Send At', accessor: 'send_at' },
              { Header: 'Status', accessor: 'status' },
            ]}
          />
        </>
      )}
    </Page>
  );
}
