import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  clinic_id: string;
  role: string;
}

interface SignedPayload extends AccessTokenPayload {
  iat: number;
  exp: number;
}

// Keys are read once and cached — avoids repeated disk I/O per request
let _privateKey: Buffer | undefined;
let _publicKey: Buffer | undefined;

function getPrivateKey(): Buffer {
  if (!_privateKey) {
    _privateKey = fs.readFileSync(path.resolve(process.cwd(), env.JWT_PRIVATE_KEY_PATH));
  }
  return _privateKey;
}

function getPublicKey(): Buffer {
  if (!_publicKey) {
    _publicKey = fs.readFileSync(path.resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH));
  }
  return _publicKey;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // Cast via unknown: Zod validates JWT_ACCESS_TOKEN_EXPIRY is a valid ms string at runtime,
  // but ms@3 uses a branded StringValue type that plain `string` cannot satisfy statically.
  const opts = { algorithm: 'RS256' as const, expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY as unknown as number };
  return jwt.sign(payload, getPrivateKey(), opts);
}

export function verifyAccessToken(token: string): SignedPayload {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
  }) as SignedPayload;
}
