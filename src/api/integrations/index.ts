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
