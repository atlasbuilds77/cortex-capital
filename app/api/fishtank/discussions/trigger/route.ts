export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { collaborativeDaemon } from '@/lib/agents/collaborative-daemon';
import { getAuthUser } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, params } = body;
    
    // Get userId from auth token if not provided
    let userId = body.userId;
    if (!userId) {
      const authUser = await getAuthUser(request);
      userId = authUser?.userId;
    }
    
    // Import portfolio discussion engine (lazy load)
    const { portfolioDiscussionEngine } = await import('@/lib/agents/portfolio-discussion');
    
    let discussion;
    switch (type) {
      case 'briefing':
        discussion = await collaborativeDaemon.morningBriefing();
        break;
      case 'trade_idea':
        discussion = await collaborativeDaemon.discussTradeIdea(
          params?.symbol || 'QQQ',
          params?.direction || 'long',
          params?.thesis || 'Technical breakout setup'
        );
        break;
      case 'position_review':
        discussion = await collaborativeDaemon.reviewPosition(
          params?.symbol || 'NVDA',
          params?.entry || 850,
          params?.current || 890,
          params?.pnl || 4000
        );
        break;
      case 'portfolio_review':
        // Full portfolio review - uses userId if provided, else demo
        const reviewPortfolio = await portfolioDiscussionEngine.fetchPortfolio(userId);
        
        // Check if user has a broker connected
        if (userId) {
          const { query: brokerCheck } = await import('@/lib/db');
          const brokerResult = await brokerCheck(
            'SELECT broker_type FROM broker_credentials WHERE user_id = $1 AND is_active = true LIMIT 1',
            [userId]
          );
          
          if (brokerResult.rows.length === 0) {
            // No broker - run a welcome discussion instead of portfolio analysis
            await collaborativeDaemon.runDiscussion(
              'Welcome',
              ['ANALYST'],
              "Welcome the user to Cortex Capital. Let them know they can connect their broker in Settings → Brokers to get personalized portfolio insights. Until then, you'll share general market analysis. Keep it brief and friendly - one short paragraph.",
              1
            );
            return NextResponse.json({ 
              success: true, 
              message: 'No broker connected - welcomed user',
              needsBroker: true
            });
          }
        }
        
        if (reviewPortfolio) {
          // Load user preferences from database
          const { query: dbQuery } = await import('@/lib/db');
          let userPrefs = {
            risk_tolerance: 'moderate' as const,
            investment_horizon: 'medium' as const,
            goals: ['Growth', 'Capital Preservation'],
            excluded_sectors: [] as string[],
          };
          
          if (userId) {
            const prefsResult = await dbQuery(
              'SELECT risk_profile, trading_goals, sector_interests, exclusions FROM users WHERE id = $1',
              [userId]
            );
            if (prefsResult.rows.length > 0) {
              const row = prefsResult.rows[0];
              userPrefs = {
                risk_tolerance: row.risk_profile || 'moderate',
                investment_horizon: 'medium',
                goals: row.trading_goals || ['Growth'],
                excluded_sectors: row.exclusions || [],
              };
            }
          }
          
          await portfolioDiscussionEngine.discussPortfolio(reviewPortfolio, userPrefs, undefined, userId);
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Portfolio review discussion started', 
          userId: userId || 'demo' 
        });
      case 'portfolio_risk':
        // Risk-focused portfolio discussion
        const portfolio = await portfolioDiscussionEngine.fetchPortfolio(userId);
        if (portfolio) {
          await portfolioDiscussionEngine.discussPortfolio(portfolio, {
            risk_tolerance: params?.risk_tolerance || 'moderate',
            investment_horizon: params?.horizon || 'medium',
            goals: params?.goals || ['Growth']
          }, 'risk', userId);
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Risk assessment discussion started', 
          userId: userId || 'demo' 
        });
      case 'portfolio_opportunities':
        // Opportunity-focused discussion
        const pf = await portfolioDiscussionEngine.fetchPortfolio(userId);
        if (pf) {
          await portfolioDiscussionEngine.discussPortfolio(pf, {
            risk_tolerance: params?.risk_tolerance || 'aggressive',
            investment_horizon: params?.horizon || 'medium',
            goals: params?.goals || ['Growth', 'Alpha']
          }, 'opportunities', userId);
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Opportunities discussion started', 
          userId: userId || 'demo' 
        });
      default:
        return NextResponse.json(
          { error: 'Invalid discussion type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true, data: discussion });
  } catch (error) {
    console.error('Discussion trigger failed:', error);
    return NextResponse.json(
      { error: 'Failed to trigger discussion' },
      { status: 500 }
    );
  }
}
