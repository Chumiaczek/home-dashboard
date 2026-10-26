/**
 * Zero-Knowledge Encrypted Credentials Vault (AES-256-GCM + Scrypt KDF)
 *
 * Security model:
 * - The Vault Master Password is NEVER stored on disk, in environment variables, or in cookies.
 * - Key derivation uses memory-hard crypto.scryptSync(masterPassword, salt, 32, { N: 16384, r: 8, p: 1 }).
 * - Payload is encrypted at rest in config/vault.enc.json using AES-256-GCM with a fresh random IV on every write.
 * - Without the Master Password, config/vault.enc.json is indistinguishable from random bytes.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VAULT_FILE = path.join(__dirname, '..', '..', 'config', 'vault.enc.json');
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

function isVaultInitialized() {
  return fs.existsSync(VAULT_FILE);
}

function deriveKey(masterPassword, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.scryptSync(String(masterPassword), salt, 32, SCRYPT_PARAMS);
}

function encryptVaultData(entries, masterPassword) {
  if (!masterPassword || String(masterPassword).length < 4) {
    throw new Error('Master password must be at least 4 characters long.');
  }

  const salt = crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(16);
  const key = deriveKey(masterPassword, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: Array.isArray(entries) ? entries : [],
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope = {
    v: 1,
    kdf: 'scrypt',
    cipher: 'aes-256-gcm',
    salt,
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    ciphertext: encrypted.toString('base64'),
  };

  const dir = path.dirname(VAULT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(VAULT_FILE, JSON.stringify(envelope, null, 2), 'utf8');
}

function decryptVaultData(masterPassword) {
  if (!isVaultInitialized()) {
    throw new Error('Vault is not initialized yet.');
  }

  const raw = fs.readFileSync(VAULT_FILE, 'utf8');
  const envelope = JSON.parse(raw);

  const key = deriveKey(masterPassword, envelope.salt);
  const iv = Buffer.from(envelope.iv, 'hex');
  const authTag = Buffer.from(envelope.tag, 'hex');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8'
    );
    const parsed = JSON.parse(decrypted);
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch (_) {
    throw new Error('Invalid Vault Master Password');
  }
}

module.exports = {
  isVaultInitialized,
  encryptVaultData,
  decryptVaultData,
};
