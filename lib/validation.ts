// Request validation schemas using Zod

import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  tier: z.enum(['scout', 'operator', 'partner']),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive', 'ultra_aggressive']).default('moderate'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================
// USER SCHEMAS
// ============================================

export const UpdateProfileSchema = z.object({
  email: z.string().email().optional(),
  tier: z.enum(['scout', 'operator', 'partner']).optional(),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive', 'ultra_aggressive']).optional(),
});

export const UpdatePreferencesSchema = z.object({
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive', 'ultra_aggressive']).optional(),
  investment_horizon: z.enum(['short', 'medium', 'long']).optional(),
  constraints: z.object({
    never_sell: z.array(z.string()).optional(),
    max_position_size: z.number().min(0).max(100).optional(),
    max_sector_exposure: z.number().min(0).max(100).optional(),
  }).optional(),
  day_trading_allocation: z.number().min(0).max(1).optional(),
  options_allocation: z.number().min(0).max(1).optional(),
});

// ============================================
// BROKER SCHEMAS
// ============================================

export const ConnectBrokerSchema = z.object({
  broker: z.enum(['tradier', 'alpaca', 'robinhood', 'webull']),
  credentials: z.object({
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    api_key: z.string().optional(),
    api_secret: z.string().optional(),
  }),
});

// ============================================
// TRADING SCHEMAS
// ============================================

export const GeneratePlanSchema = z.object({
  user_id: z.string().uuid(),
  account_id: z.string(),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive', 'ultra_aggressive']),
  constraints: z.object({
    never_sell: z.array(z.string()),
    max_position_size: z.number().min(0).max(100),
    max_sector_exposure: z.number().min(0).max(100),
  }),
});

export const ExecuteTradesSchema = z.object({
  plan_id: z.string().uuid(),
  account_id: z.string(),
  user_id: z.string().uuid(),
  dry_run: z.boolean().default(true),
});

export const ManualTradeSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive().optional(),
  notional: z.number().positive().optional(),
  type: z.enum(['market', 'limit']).default('market'),
  limit_price: z.number().positive().optional(),
  reason: z.string().optional(),
}).refine(
  (data) => data.quantity || data.notional,
  { message: 'Either quantity or notional must be provided' }
);

// ============================================
// OPTIONS SCHEMAS
// ============================================

export const LEAPSRequestSchema = z.object({
  capital: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxAllocation: z.string().regex(/^0\.\d+$/).optional(),
});

// ============================================
// DAY TRADING SCHEMAS
// ============================================

export const DayTradingSetupsSchema = z.object({
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  minVolume: z.string().regex(/^\d+$/).optional(),
});

// ============================================
// HELPER: Validate request body
// ============================================

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}
