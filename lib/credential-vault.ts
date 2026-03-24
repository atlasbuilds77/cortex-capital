/**
 * CREDENTIAL VAULT
 * AES-256-GCM encryption/decryption for broker API credentials
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Object containing encrypted text and IV
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Validate key length (32 bytes for AES-256)
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);
  
  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data with auth tag
  const encryptedWithTag = encrypted + authTag.toString('hex');
  
  return {
    encrypted: encryptedWithTag,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt encrypted text using AES-256-GCM
 * @param encrypted - The encrypted text (including auth tag)
 * @param iv - The initialization vector (hex string)
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string, iv: string): string {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Validate key length
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  // Parse IV
  const ivBuffer = Buffer.from(iv, 'hex');
  if (ivBuffer.length !== 12) {
    throw new Error('IV must be 12 bytes (24 hex characters)');
  }

  // Extract auth tag (last 32 hex chars = 16 bytes)
  const authTagHex = encrypted.slice(-32);
  const encryptedDataHex = encrypted.slice(0, -32);
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Test encryption/decryption (for development)
 */
export function testEncryption(): boolean {
  try {
    const testText = 'test-credential-123';
    const { encrypted, iv } = encrypt(testText);
    const decrypted = decrypt(encrypted, iv);
    
    return decrypted === testText;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}