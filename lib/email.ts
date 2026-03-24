// Email Service with Resend
// Handles transactional emails for Cortex Capital

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('[EMAIL] RESEND_API_KEY not set - email features disabled');
}

// Initialize Resend client (will be null if no key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'Cortex Capital <noreply@zerogtrading.com>';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  tier?: string;
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(user: User): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log(`[EMAIL] Would send welcome email to ${user.email}`);
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Welcome to Cortex Capital! 🚀',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { padding: 10px 0; border-bottom: 1px solid #eee; }
            .feature:last-child { border-bottom: none; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Cortex Capital</h1>
            </div>
            <div class="content">
              <p>Hi there! 👋</p>
              
              <p>Thanks for joining Cortex Capital. You're now part of a community of investors who use AI-powered tools to make smarter portfolio decisions.</p>
              
              <div class="features">
                <h3>Here's what you can do:</h3>
                <div class="feature">🩺 <strong>Analyze</strong> - Get instant portfolio health checks</div>
                <div class="feature">♟️ <strong>Strategize</strong> - Receive AI-generated rebalancing plans</div>
                <div class="feature">🎯 <strong>Execute</strong> - Auto-execute trades with one click</div>
                <div class="feature">📊 <strong>Report</strong> - Track performance with detailed reports</div>
              </div>
              
              <p style="text-align: center;">
                <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
              </p>
              
              <p>If you have any questions, just reply to this email. We're here to help!</p>
              
              <p>— The Cortex Capital Team</p>
            </div>
            <div class="footer">
              <p>You're receiving this email because you signed up for Cortex Capital.</p>
              <p>© ${new Date().getFullYear()} Cortex Capital. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  user: User,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log(`[EMAIL] Would send password reset to ${user.email} with token ${token.substring(0, 8)}...`);
    return { success: true };
  }

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Reset Your Password - Cortex Capital',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              
              <p>We received a request to reset your password for your Cortex Capital account.</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <div class="warning">
                <strong>⏰ This link expires in 1 hour.</strong><br>
                If you didn't request this, you can safely ignore this email.
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Or copy and paste this link into your browser:<br>
                <code style="word-break: break-all;">${resetUrl}</code>
              </p>
              
              <p>— The Cortex Capital Team</p>
            </div>
            <div class="footer">
              <p>If you didn't request a password reset, please contact support immediately.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send password reset:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmation(
  user: User,
  tier: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log(`[EMAIL] Would send subscription confirmation to ${user.email} for tier ${tier}`);
    return { success: true };
  }

  const tierDetails: Record<string, { name: string; emoji: string; features: string[] }> = {
    scout: {
      name: 'Scout',
      emoji: '🔍',
      features: ['Portfolio analysis', 'Weekly reports', 'Email alerts', 'Basic rebalancing'],
    },
    operator: {
      name: 'Operator',
      emoji: '⚡',
      features: ['Auto-rebalancing', 'Options suggestions', 'Real-time monitoring', 'Priority support'],
    },
    partner: {
      name: 'Partner',
      emoji: '🚀',
      features: ['Day trading signals', 'Momentum rotation', 'LEAPS strategies', 'Dedicated support'],
    },
    recovery: {
      name: 'Recovery',
      emoji: '🔄',
      features: ['Recovery analysis', 'Loss mitigation', 'Monthly check-ins', 'Basic alerts'],
    },
  };

  const details = tierDetails[tier] || tierDetails.scout;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `You're now a ${details.name}! ${details.emoji} - Cortex Capital`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 32px; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .tier-badge { display: inline-block; background: #667eea; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { padding: 12px 0; border-bottom: 1px solid #eee; font-size: 16px; }
            .feature:last-child { border-bottom: none; }
            .feature .check { color: #10b981; margin-right: 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${details.emoji}</h1>
              <h1>Subscription Confirmed!</h1>
              <p>You're now a ${details.name}</p>
            </div>
            <div class="content">
              <p>Hi! 🎉</p>
              
              <p>Your ${details.name} subscription is now active. Here's what you have access to:</p>
              
              <div class="features">
                ${details.features.map((f) => `<div class="feature"><span class="check">✓</span> ${f}</div>`).join('')}
              </div>
              
              <p style="text-align: center;">
                <a href="${APP_URL}/dashboard" class="button">Start Using Cortex</a>
              </p>
              
              <p>Your subscription renews monthly. You can manage your subscription any time from your account settings.</p>
              
              <p>Need help getting started? Check out our <a href="${APP_URL}/docs">quick start guide</a>.</p>
              
              <p>— The Cortex Capital Team</p>
            </div>
            <div class="footer">
              <p>Questions? Reply to this email or visit our <a href="${APP_URL}/support">support center</a>.</p>
              <p>© ${new Date().getFullYear()} Cortex Capital. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send subscription confirmation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email verification link
 */
export async function sendEmailVerification(
  user: User,
  token: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log(`[EMAIL] Would send verification to ${user.email}`);
    return { success: true };
  }

  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Verify Your Email - Cortex Capital',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              
              <p>Please verify your email address to complete your Cortex Capital registration.</p>
              
              <p style="text-align: center;">
                <a href="${verifyUrl}" class="button">Verify Email</a>
              </p>
              
              <p style="font-size: 14px; color: #666;">
                This link expires in 24 hours. If you didn't create an account, you can ignore this email.
              </p>
              
              <p>— The Cortex Capital Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Cortex Capital</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send verification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send subscription cancellation confirmation
 */
export async function sendCancellationConfirmation(
  user: User,
  endDate: Date
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log(`[EMAIL] Would send cancellation confirmation to ${user.email}`);
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Subscription Cancelled - Cortex Capital',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi,</p>
              
              <p>Your Cortex Capital subscription has been cancelled as requested.</p>
              
              <div class="info-box">
                <p><strong>Access until:</strong> ${endDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>You'll continue to have full access until this date.</p>
              </div>
              
              <p>We're sorry to see you go. If you change your mind, you can resubscribe anytime.</p>
              
              <p style="text-align: center;">
                <a href="${APP_URL}/pricing" class="button">Resubscribe</a>
              </p>
              
              <p>If you have feedback on how we could improve, we'd love to hear it. Just reply to this email.</p>
              
              <p>— The Cortex Capital Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Cortex Capital</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] Failed to send cancellation confirmation:', error);
    return { success: false, error: error.message };
  }
}
