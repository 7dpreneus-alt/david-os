import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt password hashing for the local identity provider.
 *
 * Parameters follow current OWASP guidance for scrypt (N=2^16, r=8, p=1).
 * Format: `scrypt$N$r$p$<salt-b64>$<hash-b64>` so parameters can be raised
 * later without invalidating existing hashes.
 */
const PARAMS = { N: 65536, r: 8, p: 1, maxmem: 128 * 65536 * 8 * 2 };
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? '', 'base64');
  const expected = Buffer.from(parts[5] ?? '', 'base64');
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 128 * n * r * 2,
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export const MIN_PASSWORD_LENGTH = 12;

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > 256) {
    issues.push('Use at most 256 characters.');
  }
  return issues;
}
