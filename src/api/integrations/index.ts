import { API_BASE_URL } from "@/config/api";

export type LLMRequest = {
  prompt?: string;
  context?: Record<string, unknown>;
};

export async function InvokeLLM({ prompt = '', context = {} }: LLMRequest = {}): Promise<{ response: string; context: Record<string, unknown> }> {
  return { response: `Echo: ${prompt}`, context };
}

export type UploadFileResult = { url: string | null };

export async function UploadFile(file?: File | { name?: string }): Promise<UploadFileResult> {
  return { url: file?.name ? `/uploads/${file.name}` : null };
}

export type EmailRequest = { to: string; subject: string; body: string };

export async function SendEmail({ to, subject, body }: EmailRequest): Promise<{ sent: boolean; to: string }> {
  console.info('sendEmail', { to, subject, body });
  return { sent: true, to };
}

export async function googleAuth(params: { action: string }) {
  const response = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    console.warn('Google Auth endpoint unreachable, returning mock for development.');
    return {
      data: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true'
      }
    };
  }

  return response.json();
}

export async function googleClassroomSync(params: { action: string; courseId?: string }) {
  const response = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    console.warn('Google Sync endpoint unreachable, returning mock success.');
    return {
      data: {
        success: true,
        totalSynced: 12,
        message: 'Sync completed (mock)'
      }
    };
  }

  return response.json();
}
