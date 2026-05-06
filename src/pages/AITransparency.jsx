import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listAIPolicyDocs } from '@/domains/ai/transparency';
import {
  EnterpriseComplianceStrip,
  EnterprisePanel,
  EnterpriseSurface,
  EnterpriseWorkflowList
} from '@/components/enterprise';

export default function AITransparency() {
  const docsQuery = useQuery({
    queryKey: ['ai-policy-docs'],
    queryFn: listAIPolicyDocs,
  });

  return (
    <EnterpriseSurface
      eyebrow="Public transparency"
      title="AI transparency"
      description="Infographics, plain-language policy briefs, audit posture, and governance contacts explain how Teachmo uses AI responsibly."
      badges={['Public', 'Explainable AI', 'Human review', 'FERPA/COPPA']}
      metrics={[
        { label: 'Human review', value: 'Always', badge: 'Guardrail', trend: 'flat', description: 'High-impact AI actions route through people.' },
        { label: 'Policy briefs', value: String((docsQuery.data ?? []).length), badge: 'Published', trend: 'up', description: 'Tenant and platform policy docs are listed here.' },
        { label: 'Data minimization', value: 'On', badge: 'Privacy', trend: 'flat', description: 'The page explains what context is used and why.' },
        { label: 'Auditability', value: 'Traceable', badge: 'Trust', trend: 'up', description: 'Automated actions are logged for review.' }
      ]}
      aside={
        <>
          <EnterprisePanel title="How AI is governed" description="A readable flow replaces dense policy language.">
            <EnterpriseWorkflowList
              items={[
                { label: 'Request', description: 'User asks a role-aware assistant question.', status: 'Scoped', tone: 'info' },
                { label: 'Policy check', description: 'Prompt and response are checked against district guardrails.', status: 'Simulated', tone: 'success' },
                { label: 'Human escalation', description: 'Sensitive outcomes route to review queues and incident runbooks.', status: 'Guarded', tone: 'warning' }
              ]}
            />
          </EnterprisePanel>
          <EnterpriseComplianceStrip
            items={[
              { label: 'Guardian-friendly copy', description: 'Policies are written for families and school teams.' },
              { label: 'No hidden personalization', description: 'Users can opt out in settings.' },
              { label: 'Audit contact visible', description: 'Governance team contact is easy to find.' }
            ]}
          />
        </>
      }
    >
      <EnterprisePanel title="Transparency documents" description="Published policy briefs and references remain available.">
          <div className="mb-4">
          <a
            href="mailto:ai-governance@teachmo.com"
            className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Contact the AI governance team
          </a>
        </div>
        <section className="grid gap-6">
          {(docsQuery.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-slate-600">
                Transparency documents are being published. Please check back soon.
              </CardContent>
            </Card>
          ) : (
            docsQuery.data.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <CardTitle>{doc.title}</CardTitle>
                  {doc.summary ? <p className="text-sm text-muted-foreground">{doc.summary}</p> : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown>{doc.body_markdown}</ReactMarkdown>
                  </div>
                  {Array.isArray(doc.links) && doc.links.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-slate-500">References</p>
                      <ul className="list-disc pl-4 text-sm text-blue-700">
                        {doc.links.map((link) => (
                          <li key={link}>
                            <a href={link} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
