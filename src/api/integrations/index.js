// Lightweight integration stubs used by various UI surfaces.

export async function invokeLLM({ prompt, context } = {}) {
  return { response: `Echo: ${prompt || ''}`, context };
}

export async function uploadFile(file) {
  return { url: file?.name ? `/uploads/${file.name}` : null };
}

export async function sendEmail({ to, subject, body }) {
  console.info('sendEmail', { to, subject, body });
  return { sent: true };
}
