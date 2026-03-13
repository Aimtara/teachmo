import { z } from 'zod';
import { API_BASE_URL } from '@/config/api';
import { requestJson } from '@/api/http/client';
import { nhost } from '@/lib/nhostClient';

const llmCompletionSchema = z.object({
  content: z.string().optional(),
  response: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

const integrationRecordSchema = z.record(z.unknown());

async function requestIntegration<T>(
  path: string,
  payload: Record<string, unknown>,
  schema: z.ZodSchema<T>
): Promise<T> {
  const data = await requestJson<unknown>(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return schema.parse(data);
}

export type LLMRequest = {
  prompt?: string;
  context?: Record<string, unknown>;
  model?: string;
};

export async function InvokeLLM({ prompt = '', context = {}, model }: LLMRequest = {}): Promise<{ response: string; context: Record<string, unknown> }> {
  try {
    const data = await requestIntegration('/ai/completion', { prompt, context, model }, llmCompletionSchema);

    return {
      response: data.content || data.response || '',
      context: data.context || context,
    };
  } catch (error) {
    console.error('LLM Invocation Failed:', error);
    throw error;
  }
}

export type UploadFileResult = { url: string | null };

export async function UploadFile(file?: File): Promise<UploadFileResult> {
  if (!file) return { url: null };
  try {
    const { fileMetadata, error } = await nhost.storage.upload({ file });
    if (error) throw error;
    return { url: nhost.storage.getPublicUrl({ fileId: fileMetadata.id }) };
  } catch (error) {
    console.error('File Upload Failed:', error);
    throw error;
  }
}

export type EmailRequest = { to: string; subject: string; body: string };

export async function SendEmail({ to, subject, body }: EmailRequest): Promise<{ sent: boolean; to: string }> {
  try {
    await requestIntegration('/integrations/email/send', { to, subject, body }, integrationRecordSchema);
    return { sent: true, to };
  } catch (error) {
    console.error('Email Send Failed:', error);
    return { sent: false, to };
  }
}

export async function googleAuth(params: { action: string }): Promise<Record<string, unknown>> {
  return requestIntegration('/integrations/google/auth', params, integrationRecordSchema);
}

export async function googleClassroomSync(params: { action: string; courseId?: string }): Promise<Record<string, unknown>> {
  return requestIntegration('/integrations/google/sync', params, integrationRecordSchema);
}
