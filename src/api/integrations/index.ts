import { API_BASE_URL } from "@/config/api";
import { nhost } from "@/lib/nhostClient";

const getHeaders = () => {
  const token = nhost.auth.getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
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

// 1. Connect AI Service
export async function InvokeLLM(request: LLMRequest = {}): Promise<unknown> {
  const { prompt = "", context = {}, model, response_json_schema, ...rest } = request;
  try {
    const res = await fetch(`${API_BASE_URL}/ai/completion`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ prompt, context, model, response_json_schema, ...rest }),
    });
    if (!res.ok) throw new Error(`AI Service Error: ${res.statusText}`);
    const data = await res.json();
    const content = data?.content ?? data?.response ?? data;
    if (response_json_schema && typeof content === "string") {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.warn("LLM response was not valid JSON:", error);
      }
    }
    return content;
  } catch (error) {
    console.error("LLM Failed:", error);
    throw error;
  }
}

// 2. Connect File Uploads
export type UploadFileResult = { url: string | null; file_url: string | null };
type UploadFileParams = { file?: File };
export async function UploadFile(fileOrParams?: File | UploadFileParams): Promise<UploadFileResult> {
  const file = fileOrParams instanceof File ? fileOrParams : fileOrParams?.file;
  if (!file) return { url: null, file_url: null };
  try {
    const { fileMetadata, error } = await nhost.storage.upload({ file });
    if (error) throw error;
    const url = nhost.storage.getPublicUrl({ fileId: fileMetadata.id });
    return { url, file_url: url };
  } catch (error) {
    console.error("Upload Failed:", error);
    throw error;
  }
}

// 3. Connect Email Service
export type EmailRequest = { to: string; subject: string; body: string };
export async function SendEmail({
  to,
  subject,
  body,
}: EmailRequest): Promise<{ sent: boolean; to: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/integrations/email/send`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ to, subject, body }),
    });
    if (!res.ok) throw new Error(`Email Service Error: ${res.statusText}`);
    return { sent: true, to };
  } catch (error) {
    console.error("Email Failed:", error);
    return { sent: false, to };
  }
}

export async function googleAuth(params: { action: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/auth`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function googleClassroomSync(params: { action: string; courseId?: string }) {
  const res = await fetch(`${API_BASE_URL}/integrations/google/sync`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  return res.json();
}
