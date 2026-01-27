import React, { useState } from 'react';
import { Page, Card, Button, TextInput, Textarea } from '@/components/ui';
import { nhost } from '@/utils/nhost';

/**
 * PartnerOnboarding
 * Self-service portal for partners to submit profiles, sign agreements and request approval.
 */
export default function PartnerOnboarding() {
  const [form, setForm] = useState({
    company: '',
    contactName: '',
    email: '',
    description: '',
    website: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await nhost.functions.call('partner-submit-application', { form });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit application', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Page title="Partner Application Submitted">
        <p>Thank you for your application. Our team will review your submission and contact you shortly.</p>
      </Page>
    );
  }

  return (
    <Page title="Partner Onboarding">
      <p>Submit your company information to join the Teachmo partner marketplace.</p>
      <Card className="p-4 space-y-3 max-w-xl">
        <TextInput
          label="Company Name"
          value={form.company}
          onChange={(e: any) => handleChange('company', e.target.value)}
        />
        <TextInput
          label="Contact Name"
          value={form.contactName}
          onChange={(e: any) => handleChange('contactName', e.target.value)}
        />
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e: any) => handleChange('email', e.target.value)}
        />
        <TextInput
          label="Website"
          value={form.website}
          onChange={(e: any) => handleChange('website', e.target.value)}
        />
        <Textarea
          label="Description of your offering"
          value={form.description}
          onChange={(e: any) => handleChange('description', e.target.value)}
        />
        <Button onClick={submit} disabled={loading}>Submit Application</Button>
      </Card>
    </Page>
  );
}
