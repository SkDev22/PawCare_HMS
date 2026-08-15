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
    if (env.JWT_PRIVATE_KEY) {
      _privateKey = Buffer.from(env.JWT_PRIVATE_KEY);
    } else if (env.JWT_PRIVATE_KEY_PATH) {
      _privateKey = fs.readFileSync(path.resolve(process.cwd(), env.JWT_PRIVATE_KEY_PATH));
    } else {
      throw new Error('Set either JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH');
    }
  }
  return _privateKey;
}

function getPublicKey(): Buffer {
  if (!_publicKey) {
    if (env.JWT_PUBLIC_KEY) {
      _publicKey = Buffer.from(env.JWT_PUBLIC_KEY);
    } else if (env.JWT_PUBLIC_KEY_PATH) {
      _publicKey = fs.readFileSync(path.resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH));
    } else {
      throw new Error('Set either JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH');
    }
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
