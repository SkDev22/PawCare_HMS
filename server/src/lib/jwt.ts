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
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): SignedPayload {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
  }) as SignedPayload;
}
