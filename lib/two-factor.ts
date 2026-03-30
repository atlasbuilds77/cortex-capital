import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';

const APP_NAME = 'Cortex Capital';

/**
 * Generate a new TOTP secret for a user
 */
export function generateSecret(): string {
  return otplib.generateSecret();
}

/**
 * Generate a QR code data URL for the authenticator app
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth = otplib.generateURI({
    type: 'totp',
    secret,
    label: email,
    issuer: APP_NAME,
  });
  return QRCode.toDataURL(otpauth);
}

/**
 * Verify a TOTP code against a secret
 */
export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  try {
    const result = await otplib.verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (10 random 8-character codes)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8 character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Check if a code matches any backup code (returns index if found, -1 if not)
 */
export function checkBackupCode(code: string, hashedCodes: string[]): number {
  const hashedInput = hashBackupCode(code);
  return hashedCodes.findIndex(hashed => hashed === hashedInput);
}
