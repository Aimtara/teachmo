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
  featureFlags?: Record<string, unknown>;
  response_json_schema?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Invokes the backend AI completion endpoint.
 * Replaces the static "Echo" stub with a real call to /api/ai/completion.
 */
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

/**
 * Uploads a file to Nhost Storage.
 */
export async function UploadFile(file?: File): Promise<UploadFileResult> {
  if (!file) return { url: null };

  try {
    const { fileMetadata, error } = await nhost.storage.upload({ file });

    if (error) {
      throw error;
    }

    const url = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
    return { url, file_url: url };
  } catch (error) {
    console.error('File Upload Failed:', error);
    throw error;
  }
}

// 3. Connect Email Service
export type EmailRequest = { to: string; subject: string; body: string };

/**
 * Sends a transactional email via the backend.
 */
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
    throw error;
  }
}

export async function googleAuth(params: { action: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    throw new Error(`Google Auth Error: ${res.statusText}`);
  }

  return res.json();
}

export async function googleClassroomSync(params: { action: string; courseId?: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    throw new Error(`Google Classroom Sync Error: ${res.statusText}`);
  }

  return res.json();
}
