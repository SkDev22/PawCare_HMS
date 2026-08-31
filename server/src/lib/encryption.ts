import crypto from 'crypto';
import { env } from '../config/env';

// Defense-in-depth for a handful of sensitive columns (see call sites in
// owners.service.ts, pets.service.ts, staff.service.ts) — if raw DB access
// were ever exposed, these stay unreadable without ENCRYPTION_KEY.
// AES-256-GCM: a random IV per call means encrypting the same value twice
// never produces the same ciphertext, and the auth tag makes tampering
// detectable (decrypt throws if the ciphertext was altered).

let _key: Buffer | undefined;

// Lazy + cached, mirroring lib/jwt.ts's key loading — throws only when
// encryption is actually attempted, not at import time, so environments
// that never touch these fields aren't affected by a missing key.
function getKey(): Buffer {
  if (!_key) {
    if (!env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not set — required to encrypt/decrypt sensitive fields');
    }
    const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars) — see .env.example');
    }
    _key = key;
  }
  return _key;
}

const ENCRYPTED_FORMAT = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/;

export function isEncrypted(value: string): boolean {
  return ENCRYPTED_FORMAT.test(value);
}

// Null/empty passthrough — these fields are all optional, and "nothing to
// protect" shouldn't require a key to be configured.
export function encrypt(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (!isEncrypted(value)) {
    throw new Error('Value is not in the expected encrypted format — did the backfill script run?');
  }
  const [ivHex, tagHex, dataHex] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}
