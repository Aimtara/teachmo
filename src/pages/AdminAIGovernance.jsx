import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// AdminAIGovernance page
//
// This page provides transparency into Teachmo's AI systems and ethics. It is
// intended for system administrators and institutional leaders who need to
// understand how AI is used, monitor bias detection results, review
// human-in-the-loop moderation, and audit AI decision logs. Each section
// below is a placeholder for richer content and tooling that will be
// implemented as part of the enterprise AI governance roadmap.

export default function AdminAIGovernance() {
  return (
    <ProtectedRoute allowedRoles={['system_admin', 'district_admin', 'school_admin', 'admin']}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">AI Governance &amp; Transparency</h1>
        <p className="mb-6 text-gray-700">
          Understand how Teachmo uses AI and machine learning. Review our model
          policies, data usage, ethics guidelines, and monitoring results. This
          page empowers administrators to ensure the AI features reduce
          cognitive and emotional load without introducing bias or
          noncompliance.
        </p>
        <Card>
          <CardHeader>Transparency &amp; Ethics</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Detailed documentation about the models Teachmo uses, how data is
              processed, and the ethical safeguards in place will be provided
              here. Administrators will be able to access our transparency
              reports and compliance certifications.
            </p>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>Bias Detection</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Results from automated bias monitoring will be displayed in this
              section. Alerts will notify administrators of any potential
              statistical biases or problematic patterns detected in AI
              outputs.
            </p>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>Human-in-the-Loop Review</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This queue will allow human moderators to review AI-generated
              content (e.g., Weekly Brief drafts, activity suggestions) before
              they are delivered to end users. Moderators can approve,
              reject, or revise AI output.
            </p>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>AI Usage Log</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              A detailed log of every AI invocation, its inputs, outputs, and
              any human interventions will appear here. This audit log helps
              ensure accountability and enables external audits or regulatory
              reviews.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
