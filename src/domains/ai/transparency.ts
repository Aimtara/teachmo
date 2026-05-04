import { graphqlRequest } from '@/lib/graphql';

export type AIPolicyDoc = {
  id: string;
  slug?: string | null;
  title: string;
  summary?: string | null;
  body_markdown?: string | null;
  links?: string[] | null;
  published_at?: string | null;
};

export async function listAIPolicyDocs() {
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

  const res = await graphqlRequest<{ ai_policy_docs?: AIPolicyDoc[] }>({ query });
  return Array.isArray(res?.ai_policy_docs) ? res.ai_policy_docs : [];
}
