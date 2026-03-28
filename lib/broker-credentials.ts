import crypto from 'crypto';

const BROKER_KEY_DERIVATION_SALT = process.env.BROKER_ENCRYPTION_SALT || 'cortex-broker-credentials-v1';

function deriveEncryptionKey(): Buffer {
  const encryptionSecret = process.env.BROKER_ENCRYPTION_KEY;
  if (!encryptionSecret) {
    throw new Error('BROKER_ENCRYPTION_KEY environment variable is required');
  }

  return crypto.scryptSync(encryptionSecret, BROKER_KEY_DERIVATION_SALT, 32);
}

/**
 * Encrypts a token using AES-256-GCM.
 * Returns: { encrypted: string, iv: string, authTag: string }
 */
export function encryptToken(token: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const key = deriveEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts a token using AES-256-GCM.
 * Input format: { encrypted: string, iv: string, authTag: string }
 */
export function decryptToken(encrypted: string, iv: string, authTag: string): string {
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  const key = deriveEncryptionKey();
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Alternative: single-string format (compatible with original spec)
 * Format: "iv:authTag:encrypted"
 */
export function encryptTokenCompact(token: string): string {
  const { encrypted, iv, authTag } = encryptToken(token);
  return `${iv}:${authTag}:${encrypted}`;
}

export function decryptTokenCompact(compactEncrypted: string): string {
  const [iv, authTag, encrypted] = compactEncrypted.split(':');
  if (!iv || !authTag || !encrypted) {
    throw new Error('Invalid encrypted token format');
  }
  return decryptToken(encrypted, iv, authTag);
}
