import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-signed session tokens for the local identity provider.
 *
 * Format: base64url(payload).base64url(hmacSha256(payload)). The payload carries
 * the user id, issue time, and expiry. The cookie itself is HttpOnly,
 * SameSite=Lax, and Secure outside local HTTP development.
 */

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function b64url(input: Buffer): string {
  return input.toString('base64url');
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payload).digest());
}

export function issueSessionToken(
  userId: string,
  secret: string,
  ttlSeconds: number,
  now: number = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const encoded = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(encoded, secret);
  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (givenBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(givenBuffer, expectedBuffer)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
  } catch (error) {
    void error;
    return null;
  }

  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp * 1000 <= now) return null;
  return payload;
}

export const SESSION_COOKIE_NAME = 'pmcos_session';
