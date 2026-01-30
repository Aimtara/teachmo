import { API_BASE_URL } from "@/config/api";
import { nhost } from "@/lib/nhostClient";

// Helper to get auth headers
const getHeaders = () => {
  const token = nhost.auth.getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

/**
 * Helper to extract detailed error information from a failed response.
 * Includes HTTP status code, status text, and response body.
 */
async function extractErrorDetails(res: Response, serviceName: string): Promise<string> {
  let errorDetails = "";
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const jsonBody = await res.json();
      if (jsonBody && typeof jsonBody === "object") {
        const message =
          (jsonBody as { message?: string }).message ??
          JSON.stringify(jsonBody);
        errorDetails = message;
      }
    } else {
      const textBody = await res.text();
      if (textBody) {
        // Avoid extremely large error messages
        errorDetails = textBody.slice(0, 500);
      }
    }
  } catch {
    // Swallow body parsing errors; we'll still throw a status-based error below.
  }

  const statusInfo = `${res.status} ${res.statusText || ""}`.trim();
  const parts = [serviceName];
  if (statusInfo) {
    parts.push(statusInfo);
  }
  if (errorDetails) {
    parts.push(errorDetails);
  }

  return parts.join(" - ");
}

export type LLMRequest = {
  prompt?: string;
  context?: Record<string, unknown>;
  model?: string;
};

/**
 * Invokes the backend AI completion endpoint.
 * Replaces the static "Echo" stub with a real call to /api/ai/completion.
 */
export async function InvokeLLM({
  prompt = "",
  context = {},
  model,
}: LLMRequest = {}): Promise<{
  response: string;
  context: Record<string, unknown>;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/completion`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ prompt, context, model }),
    });

    if (!res.ok) {
      const errorMessage = await extractErrorDetails(res, "AI Service Error");
      throw new Error(errorMessage);
    }

    const data = await res.json();
    return {
      response: data.content || data.response,
      context: data.context || context,
    };
  } catch (error) {
    console.error("LLM Invocation Failed:", error);
    throw error;
  }
}

export type UploadFileResult = { url: string | null };

/**
 * Uploads a file to Nhost Storage via the backend presigned URL flow
 * or direct storage upload if configured.
 */
export async function UploadFile(file?: File): Promise<UploadFileResult> {
  if (!file) return { url: null };

  try {
    // using Nhost SDK for direct storage upload
    const { fileMetadata, error } = await nhost.storage.upload({ file });

    if (error) {
      throw error;
    }

    // Return the public URL for the uploaded file
    const url = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
    return { url };
  } catch (error) {
    console.error("File Upload Failed:", error);
    throw error;
  }
}

export type EmailRequest = { to: string; subject: string; body: string };

/**
 * Sends a transactional email via the backend.
 * Replaces the console.log stub.
 * @throws Error if the email send fails
 */
export async function SendEmail({
  to,
  subject,
  body,
}: EmailRequest): Promise<{ to: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations/email/send`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ to, subject, body }),
    });

    if (!res.ok) {
      const errorMessage = await extractErrorDetails(res, "Email Service Error");
      throw new Error(errorMessage);
    }

    return { to };
  } catch (error) {
    console.error("Email Send Failed:", error);
    throw error;
  }
}

// --- Google Classroom Integration ---

export async function googleAuth(params: { action: string }) {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorMessage = await extractErrorDetails(res, "Google Auth Error");
      throw new Error(errorMessage);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Google Auth Failed:", error);
    throw error;
  }
}

export async function googleClassroomSync(params: {
  action: string;
  courseId?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorMessage = await extractErrorDetails(res, "Google Classroom Sync Error");
      throw new Error(errorMessage);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Google Classroom Sync Failed:", error);
    throw error;
  }
}
