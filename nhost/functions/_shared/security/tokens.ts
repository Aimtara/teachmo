import crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  const secret = String(process.env.INVITE_TOKEN_SECRET ?? '');
  return crypto.createHash('sha256').update(`${token}${secret}`).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a ?? '', 'utf8');
  const bBuf = Buffer.from(b ?? '', 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
