import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
};

type EmailProvider = 'smtp' | 'postmark' | 'sendgrid';

type SendResult = { ok: boolean; provider: EmailProvider; messageId?: string };

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseFrom(value: string) {
  const match = value.match(/^(.*)<(.+)>$/);
  if (match) {
    const name = match[1]?.trim().replace(/"/g, '') ?? undefined;
    return { email: match[2].trim(), name: name?.length ? name : undefined };
  }
  return { email: value.trim(), name: undefined };
}

function getProvider(): EmailProvider {
  const provider = (getEnv('EMAIL_PROVIDER') ?? 'smtp').toLowerCase();
  if (provider === 'postmark' || provider === 'sendgrid' || provider === 'smtp') return provider;
  return 'smtp';
}

function sanitizeError(provider: EmailProvider, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return new Error(`Email sending failed via ${provider}: ${message}`);
}

async function sendViaSmtp(payload: EmailPayload): Promise<SendResult> {
  const host = getEnv('SMTP_HOST');
  const portValue = getEnv('SMTP_PORT');
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');

  if (!host || !portValue || !user || !pass) {
    throw new Error('SMTP credentials are not fully configured');
  }

  const port = Number(portValue);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const response = await transporter.sendMail({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  return { ok: true, provider: 'smtp', messageId: response.messageId };
}

async function sendViaPostmark(payload: EmailPayload): Promise<SendResult> {
  const token = getEnv('POSTMARK_TOKEN');
  if (!token) throw new Error('Postmark token is not configured');

  const resp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-postmark-server-token': token,
    },
    body: JSON.stringify({
      From: payload.from,
      To: payload.to,
      Subject: payload.subject,
      HtmlBody: payload.html,
      TextBody: payload.text,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Postmark returned ${resp.status}: ${errorText || 'unknown error'}`);
  }

  return { ok: true, provider: 'postmark' };
}

async function sendViaSendGrid(payload: EmailPayload): Promise<SendResult> {
  const apiKey = getEnv('SENDGRID_API_KEY');
  if (!apiKey) throw new Error('SendGrid API key is not configured');

  const from = parseFrom(payload.from);

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.to }],
          subject: payload.subject,
        },
      ],
      from: from.name ? { email: from.email, name: from.name } : { email: from.email },
      content: [
        { type: 'text/plain', value: payload.text },
        { type: 'text/html', value: payload.html },
      ],
    }),
  });

  if (resp.status !== 202) {
    const errorText = await resp.text();
    throw new Error(`SendGrid returned ${resp.status}: ${errorText || 'unknown error'}`);
  }

  return { ok: true, provider: 'sendgrid' };
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const provider = getProvider();
  const from = payload.from ?? getEnv('EMAIL_FROM');
  if (!from) throw new Error('EMAIL_FROM is not configured');

  try {
    if (provider === 'postmark') {
      return await sendViaPostmark({ ...payload, from });
    }

    if (provider === 'sendgrid') {
      return await sendViaSendGrid({ ...payload, from });
    }

    return await sendViaSmtp({ ...payload, from });
  } catch (error) {
    throw sanitizeError(provider, error);
  }
}
