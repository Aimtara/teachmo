import { nhost } from '@/lib/nhostClient';

type ResolveUserPayload = { userId?: string | null };
type FunctionCallResponse = { data?: ResolveUserPayload };

export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const { res, error } = await nhost.functions.call('resolve-user-by-email', { email });

  if (error) throw error;

  const envelope = res as FunctionCallResponse | ResolveUserPayload | null | undefined;
  const payload =
    envelope && typeof envelope === 'object' && 'data' in envelope
      ? (envelope as FunctionCallResponse).data
      : (envelope as ResolveUserPayload | null | undefined);

  return payload?.userId ?? null;
}
