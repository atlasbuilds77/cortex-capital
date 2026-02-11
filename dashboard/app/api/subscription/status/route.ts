import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Demo mode - allow access without real subscription check
const DEMO_MODE = false;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        isSubscribed: false,
        tier: null,
        tierName: null,
        features: []
      });
    }

    // Demo mode - allow access for demo emails
    if (DEMO_MODE && (email.includes('demo') || email.includes('test'))) {
      return NextResponse.json({
        isSubscribed: true,
        tier: 'elite',
        tierName: 'Elite',
        status: 'active',
        features: [
          'Watch all 19 agents work',
          'Live trade feed',
          'Daily market briefings',
          'Community Discord access',
          'Copy-trading signals',
          'Real-time trade alerts',
          'Agent decision explanations',
          'Priority support',
          'Direct agent access',
          'Custom watchlist alerts',
          'Private strategy calls',
          '1-on-1 onboarding',
          'Founding member status'
        ],
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Try to connect to Supabase if credentials are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // No Supabase config - return demo access in dev
      if (DEMO_MODE) {
        return NextResponse.json({
          isSubscribed: true,
          tier: 'elite',
          tierName: 'Elite',
          status: 'active',
          features: [
            'Watch all 19 agents work',
            'Live trade feed',
            'Daily market briefings',
            'Community Discord access',
            'Copy-trading signals',
            'Real-time trade alerts',
            'Agent decision explanations',
            'Priority support'
          ],
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      return NextResponse.json({
        isSubscribed: false,
        tier: null,
        tierName: null,
        features: []
      });
    }

    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('ops_subscribers')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return NextResponse.json({
        isSubscribed: false,
        tier: null,
        tierName: null,
        features: []
      });
    }

    // Define features based on tier
    const allFeatures = [
      'Watch all 19 agents work',
      'Live trade feed',
      'Daily market briefings',
      'Community Discord access',
      'Copy-trading signals',
      'Real-time trade alerts',
      'Agent decision explanations',
      'Priority support',
      'Direct agent access',
      'Custom watchlist alerts',
      'Private strategy calls',
      '1-on-1 onboarding',
      'Founding member status'
    ];
    
    const tierFeatures: Record<string, string[]> = {
      starter: allFeatures.slice(0, 4),
      pro: allFeatures.slice(0, 8),
      elite: allFeatures
    };

    return NextResponse.json({
      isSubscribed: true,
      tier: data.tier,
      tierName: data.tier_name,
      status: data.status,
      features: tierFeatures[data.tier] || allFeatures.slice(0, 4),
      currentPeriodEnd: data.current_period_end || null
    });

  } catch (error: any) {
    console.error('Status check error:', error);
    
    // Return demo access on error in dev mode
    if (DEMO_MODE) {
      return NextResponse.json({
        isSubscribed: true,
        tier: 'elite',
        tierName: 'Elite',
        status: 'active',
        features: [
          'Watch all 19 agents work',
          'Live trade feed',
          'Daily market briefings',
          'Community Discord access'
        ],
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return NextResponse.json({
      isSubscribed: false,
      tier: null,
      tierName: null,
      features: []
    });
  }
}
