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
  try {
    const response = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.warn('Google Auth endpoint unreachable or returned non-OK response, returning mock for development.', {
          status: response.status
        });
        return {
          data: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true'
          }
        };
      }

      // In production, surface the error response instead of returning a mock
      return response.json();
    }

    return response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Google Auth network error, returning mock for development.', error);
      return {
        data: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true'
        }
      };
    }

    throw error;
  }
}

export async function googleClassroomSync(params: { action: string; courseId?: string }) {
  try {
    const response = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const isEndpointMissing = response.status === 404 || response.status === 501;

      if (import.meta.env.DEV && isEndpointMissing) {
        console.warn('Google Sync endpoint missing, returning mock success for development.');
        return {
          data: {
            success: true,
            totalSynced: 12,
            message: 'Sync completed (mock)'
          }
        };
      }

      throw new Error(`Google Sync request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Google Sync network error, returning mock success for development.', error);
      return {
        data: {
          success: true,
          totalSynced: 12,
          message: 'Sync completed (mock)'
        }
      };
    }

    throw error;
  }
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
