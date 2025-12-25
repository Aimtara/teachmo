export async function signWorkflowVersion(args: {
  hasuraUrl: string;
  adminSecret: string;
  workflowId: string;
}): Promise<string | null> {
  const secret = process.env.WORKFLOW_PUBLISH_SECRET;
  if (!secret) return null;

  const wf = await loadWorkflow(args);
  if (!wf) return null;

  const payload = {
    workflow_id: wf.id,
    version: wf.version,
    trigger: wf.trigger,
    definition: wf.definition,
  };
  const hash = await sha256Hex(JSON.stringify(payload));
  const signature = await hmacBase64(secret, `${wf.id}:${wf.version}:${hash}`);
  return signature;
}

async function loadWorkflow(args: { hasuraUrl: string; adminSecret: string; workflowId: string }) {
  const q = `query Wf($id: uuid!) {
    workflow_definitions_by_pk(id: $id) { id version trigger definition }
  }`;

  const data = await hasuraRequest({
    hasuraUrl: args.hasuraUrl,
    adminSecret: args.adminSecret,
    query: q,
    variables: { id: args.workflowId },
  });

  return data?.workflow_definitions_by_pk as any;
}

async function hasuraRequest(args: { hasuraUrl: string; adminSecret: string; query: string; variables?: any }) {
  const resp = await fetch(args.hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': args.adminSecret,
    },
    body: JSON.stringify({ query: args.query, variables: args.variables || {} }),
  });
  const j = await resp.json();
  if (!resp.ok || j?.errors?.length) {
    console.error('[workflow-signing] hasura error', resp.status, j?.errors || j);
    throw new Error(j?.errors?.[0]?.message || 'hasura_error');
  }
  return j.data;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacBase64(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64(new Uint8Array(sig));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
