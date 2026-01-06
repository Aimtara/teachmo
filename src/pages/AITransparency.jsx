import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { graphqlRequest } from '@/lib/graphql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AITransparency() {
  const docsQuery = useQuery({
    queryKey: ['ai-policy-docs'],
    queryFn: async () => {
      const query = `query AIPolicyDocs {
        ai_policy_docs(where: { organization_id: { _is_null: true } }, order_by: { published_at: desc }) {
          id
          slug
          title
          summary
          body_markdown
          links
          published_at
        }
      }`;

      const res = await graphqlRequest({ query });
      return res?.ai_policy_docs ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">AI Transparency</h1>
          <p className="text-sm text-slate-600">
            Learn how Teachmo uses AI responsibly. These transparency briefs explain our data flow, ethics, and
            human-in-the-loop safeguards.
          </p>
          <a
            href="mailto:ai-governance@teachmo.com"
            className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Contact the AI governance team
          </a>
        </header>

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
                  <ReactMarkdown className="prose prose-sm max-w-none text-slate-700">
                    {doc.body_markdown}
                  </ReactMarkdown>
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
      </div>
    </div>
  );
}
