// Lightweight integration stubs used by various UI surfaces.

export async function InvokeLLM({ prompt, context } = {}) {
  return { response: `Echo: ${prompt || ''}`, context };
}

export async function UploadFile(file) {
  return { url: file?.name ? `/uploads/${file.name}` : null };
}

export async function SendEmail({ to, subject, body }) {
  console.info('sendEmail', { to, subject, body });
  return { sent: true };
}
