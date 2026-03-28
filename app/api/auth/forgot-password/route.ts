import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists (but don't reveal this to the client)
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    // In production, this would send an actual email if user exists
    if (result.rows.length > 0) {
      // TODO: Generate reset token and send email via Resend
      console.log(`Password reset requested for: ${email}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
