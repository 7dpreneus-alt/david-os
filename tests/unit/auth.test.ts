import { describe, expect, it } from 'vitest';
import { hashPassword, passwordIssues, verifyPassword } from '@/lib/auth/password';
import {
  issueSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session-token';

const SECRET = 'a'.repeat(48);

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(await verifyPassword('wrong password entirely', stored)).toBe(false);
  });

  it('never stores the password in plaintext', async () => {
    const stored = await hashPassword('super secret passphrase');
    expect(stored).not.toContain('super secret passphrase');
    expect(stored.startsWith('scrypt$')).toBe(true);
  });

  it('produces a different hash for the same password (unique salt)', async () => {
    const first = await hashPassword('same password twice');
    const second = await hashPassword('same password twice');
    expect(first).not.toBe(second);
    expect(await verifyPassword('same password twice', first)).toBe(true);
    expect(await verifyPassword('same password twice', second)).toBe(true);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'bcrypt$1$2$3$4$5')).toBe(false);
  });

  it('requires at least 12 characters', () => {
    expect(passwordIssues('short')).toHaveLength(1);
    expect(passwordIssues('twelve chars')).toEqual([]);
  });
});

describe('session tokens', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('round-trips a valid token', () => {
    const token = issueSessionToken(userId, SECRET, 3600);
    expect(verifySessionToken(token, SECRET)?.sub).toBe(userId);
  });

  it('rejects a token signed with a different secret', () => {
    const token = issueSessionToken(userId, SECRET, 3600);
    expect(verifySessionToken(token, 'b'.repeat(48))).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = issueSessionToken(userId, SECRET, 3600);
    const [payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: '22222222-2222-4222-8222-222222222222', iat: 0, exp: 9_999_999_999 }),
      'utf8',
    ).toString('base64url');
    expect(payload).toBeDefined();
    expect(verifySessionToken(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const issuedAt = Date.now() - 7200 * 1000;
    const token = issueSessionToken(userId, SECRET, 3600, issuedAt);
    expect(verifySessionToken(token, SECRET)).toBeNull();
    // Still valid when checked before it expired.
    expect(verifySessionToken(token, SECRET, issuedAt + 60_000)?.sub).toBe(userId);
  });

  it('rejects structurally invalid tokens', () => {
    expect(verifySessionToken('', SECRET)).toBeNull();
    expect(verifySessionToken('nodot', SECRET)).toBeNull();
    expect(verifySessionToken('.onlysignature', SECRET)).toBeNull();
  });

  it('uses a namespaced cookie name', () => {
    expect(SESSION_COOKIE_NAME).toBe('pmcos_session');
  });
});
