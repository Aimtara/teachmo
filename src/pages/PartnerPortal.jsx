import { useState } from 'react';
import { Card, Button, Input, Select, Textarea } from '@/components/ui';
import { createPartnerSubmission } from '@/domains/submissions';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

const partnerTabSummaries = {
  submit: {
    title: 'Submission pipeline',
    description: 'Draft, submit, review, and publish program inventory.',
    items: [
      { label: 'Draft programs', status: '4', tone: 'neutral' },
      { label: 'In review', status: '12', tone: 'warning' },
      { label: 'Published', status: '8', tone: 'success' }
    ]
  },
  assets: {
    title: 'Asset readiness',
    description: 'Track media, PDFs, transcripts, and accessibility status.',
    items: [
      { label: 'Ready assets', status: '18', tone: 'success' },
      { label: 'Needs replacement', status: '2', tone: 'warning' },
      { label: 'Accessibility files', status: '6', tone: 'info' }
    ]
  },
  analytics: {
    title: 'Performance snapshot',
    description: 'Reach, engagement, and incentive metrics update by workspace tab.',
    items: [
      { label: 'Engagement rate', status: '38%', tone: 'success' },
      { label: 'Incentives earned', status: '$1.2k', tone: 'info' },
      { label: 'Renewal risk', status: 'Low', tone: 'success' }
    ]
  },
  compliance: {
    title: 'Compliance queue',
    description: 'Contracts, attestations, and renewal documents stay visible.',
    items: [
      { label: 'Insurance certificate', status: 'Action', tone: 'warning' },
      { label: 'Background check', status: 'Approved', tone: 'success' },
      { label: 'Data agreement', status: 'Upload', tone: 'danger' }
    ]
  }
};

export default function PartnerPortal() {
  const [submission, setSubmission] = useState({ title: '', type: 'activity', content: '' });
  const [status, setStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('submit');

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
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Partner workspace sections">
        {[
          ['submit', 'Program submission'],
          ['assets', 'Asset library'],
          ['analytics', 'Analytics'],
          ['compliance', 'Compliance']
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`enterprise-focus enterprise-motion rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === value
                ? 'bg-[var(--enterprise-primary)] text-white shadow-[var(--enterprise-shadow)]'
                : 'border border-[var(--enterprise-border)] text-[var(--enterprise-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <EnterprisePanel title={partnerTabSummaries[activeTab].title} description={partnerTabSummaries[activeTab].description}>
          <EnterpriseWorkflowList
            items={partnerTabSummaries[activeTab].items}
          />
        </EnterprisePanel>

        {activeTab === 'submit' ? (
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
        ) : null}

        {activeTab === 'assets' ? (
          <EnterprisePanel title="Asset library" description="Partners can stage approved media and PDFs before submitting programs.">
            <div className="grid gap-3">
              {[
                ['Program hero image', 'Ready for review', 'Image'],
                ['Family waiver PDF', 'Needs replacement', 'PDF'],
                ['Accessibility transcript', 'Approved', 'Transcript']
              ].map(([name, state, type]) => (
                <div key={name} className="rounded-2xl border border-[var(--enterprise-border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-[var(--enterprise-muted)]">{type}</p>
                    </div>
                    <span className="rounded-full border border-[var(--enterprise-border)] px-3 py-1 text-xs font-semibold">{state}</span>
                  </div>
                </div>
              ))}
              <label className="enterprise-focus rounded-2xl border border-dashed border-[var(--enterprise-border)] p-4 text-sm font-semibold text-[var(--enterprise-muted)]">
                Upload asset
                <input type="file" className="sr-only" aria-label="Upload partner asset" />
              </label>
            </div>
          </EnterprisePanel>
        ) : null}

        {activeTab === 'analytics' ? (
          <EnterprisePanel title="Partner analytics" description="Reach, engagement, and incentives are visible without admin assistance.">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Reach', '2.4k families'],
                ['Engagement', '38% saved'],
                ['Incentives', '$1.2k earned']
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--enterprise-border)] p-4">
                  <p className="text-sm text-[var(--enterprise-muted)]">{label}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </EnterprisePanel>
        ) : null}

        {activeTab === 'compliance' ? (
          <EnterprisePanel title="Compliance tracker" description="Contracts, insurance, background checks, and renewal dates stay attached to partner content.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Insurance certificate', status: 'Expires soon', tone: 'warning' },
                { label: 'Background check attestation', status: 'Approved', tone: 'success' },
                { label: 'Data sharing agreement', status: 'Needs upload', tone: 'danger' }
              ]}
            />
          </EnterprisePanel>
        ) : null}
      </div>
    </EnterpriseSurface>
  );
}
