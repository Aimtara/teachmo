import { API_BASE_URL } from "@/config/api";
import { nhost } from "@/lib/nhostClient";

const getHeaders = () => {
  const token = nhost.auth.getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export type LLMRequest = {
  prompt?: string;
  context?: Record<string, unknown>;
  model?: string;
};

export async function InvokeLLM({ prompt = '', context = {}, model }: LLMRequest = {}): Promise<{ response: string; context: Record<string, unknown> }> {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/completion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, context, model })
    });

    if (!res.ok) throw new Error(`AI Service Error: ${res.statusText}`);

    const data = await res.json();
    return { 
      response: data.content || data.response, 
      context: data.context || context 
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
    const url = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
    return { url };
  } catch (error) {
    console.error('File Upload Failed:', error);
    throw error;
  }
}

export type EmailRequest = { to: string; subject: string; body: string };

export async function SendEmail({ to, subject, body }: EmailRequest): Promise<{ sent: boolean; to: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations/email/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ to, subject, body })
    });
    if (!res.ok) throw new Error(`Email Service Error: ${res.statusText}`);
    return { sent: true, to };
  } catch (error) {
    console.error('Email Send Failed:', error);
    return { sent: false, to };
  }
}

export async function googleAuth(params: { action: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });
  return res.json();
}

export async function googleClassroomSync(params: { action: string; courseId?: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });
  return res.json();
}
