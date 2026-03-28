import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.BROKER_ENCRYPTION_KEY || 'cortex-default-encryption-key-2026!';

/**
 * Encrypts a token using AES-256-GCM.
 * Returns: { encrypted: string, iv: string, authTag: string }
 */
export function encryptToken(token: string): { encrypted: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
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
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
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
  return decryptToken(encrypted, iv, authTag);
}
