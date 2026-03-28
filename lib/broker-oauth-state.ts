import crypto from 'crypto';
import { getRequiredEnv, safeEqual } from '@/lib/env';

export type BrokerProvider = 'alpaca' | 'tradier';

interface BrokerOAuthStatePayload {
  userId: string;
  broker: BrokerProvider;
  iat: number;
  exp: number;
  nonce: string;
}

const OAUTH_STATE_TTL_SECONDS = 10 * 60;

function getOAuthStateSecret(): string {
  return process.env.BROKER_OAUTH_STATE_SECRET || getRequiredEnv('JWT_SECRET');
}

function signStatePayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getOAuthStateSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createBrokerOAuthState(userId: string, broker: BrokerProvider): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: BrokerOAuthStatePayload = {
    userId,
    broker,
    iat: now,
    exp: now + OAUTH_STATE_TTL_SECONDS,
    nonce: crypto.randomBytes(12).toString('hex'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signStatePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyBrokerOAuthState(state: string): BrokerOAuthStatePayload {
  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid OAuth state format');
  }

  const expectedSignature = signStatePayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Invalid OAuth state signature');
  }

  let payload: BrokerOAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid OAuth state payload');
  }

  if (!payload.userId || !payload.broker || !payload.exp || !payload.iat) {
    throw new Error('Invalid OAuth state contents');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now || payload.iat > now + 60) {
    throw new Error('OAuth state expired or invalid');
  }

  if (payload.broker !== 'alpaca' && payload.broker !== 'tradier') {
    throw new Error('Invalid OAuth state broker');
  }

  return payload;
}
