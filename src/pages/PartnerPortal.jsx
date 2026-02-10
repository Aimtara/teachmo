import { useState } from 'react';
import { Card, Button, Input, Select, Textarea } from '@/components/ui';
import { createPartnerSubmission } from '@/domains/submissions';

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
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Partner Portal</h1>
        <p className="text-gray-600">Submit and manage your educational content.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900">Active Submissions</h3>
            <p className="text-2xl font-bold text-blue-700">12</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900">Approved</h3>
            <p className="text-2xl font-bold text-green-700">8</p>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6">
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
        </div>
      </div>
    </div>
  );
}
