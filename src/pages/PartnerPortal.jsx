import { useState } from 'react';
import { Card, Button, Input, Select, Textarea } from '@/components/ui';
import { createPartnerSubmission } from '@/domains/submissions';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function PartnerPortal() {
  const [submission, setSubmission] = useState({ title: '', type: 'activity', content: '' });
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    try {
      await createPartnerSubmission({
        title: submission.title,
        type: submission.type,
        description: submission.content,
      });
      setStatus('success');
      setSubmission({ title: '', type: 'activity', content: '' });
    } catch (error) {
      console.error('Failed to create partner submission', error);
      setStatus('error');
    }
  };

  return (
    <EnterpriseSurface
      eyebrow="Partner CMS"
      title="Partner workspace"
      description="Partners get a SaaS-style CMS for program submissions, assets, approval status, analytics, incentives, and compliance documents."
      badges={['Program CMS', 'Asset uploads', 'Analytics', 'Compliance tracking']}
      metrics={[
        { label: 'Active submissions', value: '12', badge: 'In review', trend: 'flat' },
        { label: 'Approved content', value: '8', badge: 'Published', trend: 'up' },
        { label: 'Reach', value: '2.4k', badge: 'Families', trend: 'up' },
        { label: 'Compliance', value: '92%', badge: 'Tracked', trend: 'up' }
      ]}
      aside={
        <>
          <EnterprisePanel title="CMS workflow" description="Submissions map to admin approvals and public Explore inventory.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Draft program', status: 'Draft', tone: 'neutral' },
                { label: 'Upload assets', status: 'Assets', tone: 'info' },
                { label: 'Admin review', status: 'Queued', tone: 'warning' },
                { label: 'Publish to Explore', status: 'Live', tone: 'success' }
              ]}
            />
          </EnterprisePanel>
          <EnterpriseComplianceStrip
            items={[
              { label: 'Public registration separated' },
              { label: 'Contracts visible' },
              { label: 'Audit-friendly approvals' }
            ]}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <EnterprisePanel title="Analytics and compliance" description="Operational widgets stay dense for B2B partner users.">
          <EnterpriseWorkflowList
            items={[
              { label: 'Engagement rate', status: '38%', tone: 'success' },
              { label: 'Incentives earned', status: '$1.2k', tone: 'info' },
              { label: 'Contract renewal', status: 'Action', tone: 'warning' }
            ]}
          />
        </EnterprisePanel>

        <EnterprisePanel title="New content submission" description="Existing submission API remains wired into the redesigned CMS workspace.">
          <Card className="p-6 border-[var(--enterprise-border)]">
            <h2 className="text-xl font-semibold mb-4">New Content Submission</h2>
            {status === 'success' && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
                Submission received! We will review it shortly.
              </div>
            )}
            {status === 'error' && (
              <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
                Submission failed. Please try again.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <Input
                  value={submission.title}
                  onChange={(event) => setSubmission({ ...submission, title: event.target.value })}
                  placeholder="e.g., Summer Reading Challenge"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <Select
                  value={submission.type}
                  onChange={(event) => setSubmission({ ...submission, type: event.target.value })}
                >
                  <option value="activity">Activity</option>
                  <option value="resource">Resource</option>
                  <option value="event">Event</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description / URL</label>
                <Textarea
                  value={submission.content}
                  onChange={(event) => setSubmission({ ...submission, content: event.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            </form>
          </Card>
        </EnterprisePanel>
      </div>
    </EnterpriseSurface>
  );
}
