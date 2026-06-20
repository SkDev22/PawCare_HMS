// Generates an RS256 RSA-2048 key pair and writes them to server/keys/
// Run with: node generate-keys.mjs

import { generateKeyPairSync } from 'crypto';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keysDir = join(__dirname, 'server', 'keys');

if (!existsSync(keysDir)) {
  mkdirSync(keysDir, { recursive: true });
  console.log(`Created directory: ${keysDir}`);
}

const privatePath = join(keysDir, 'private.pem');
const publicPath  = join(keysDir, 'public.pem');

if (existsSync(privatePath)) {
  console.log('Keys already exist — delete server/keys/ first if you want to regenerate.');
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8',  format: 'pem' },
  publicKeyEncoding:  { type: 'spki',   format: 'pem' },
});

writeFileSync(privatePath, privateKey,  { mode: 0o600 });
writeFileSync(publicPath,  publicKey);

console.log('✅ RS256 key pair generated:');
console.log(`   Private key → ${privatePath}`);
console.log(`   Public key  → ${publicPath}`);
console.log('\nNever commit private.pem — it is already in .gitignore.');
