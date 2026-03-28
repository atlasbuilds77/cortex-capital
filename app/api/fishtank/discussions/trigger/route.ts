export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { collaborativeDaemon } from '@/lib/agents/collaborative-daemon';

export async function POST(request: NextRequest) {
  try {
    const { type, userId, params } = await request.json();
    
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
        if (reviewPortfolio) {
          await portfolioDiscussionEngine.discussPortfolio(reviewPortfolio, {
            risk_tolerance: params?.risk_tolerance || 'moderate',
            investment_horizon: params?.horizon || 'medium',
            goals: params?.goals || ['Growth', 'Capital Preservation']
          });
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
          }, 'risk');
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
          }, 'opportunities');
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
  } catch (error: any) {
    console.error('Discussion trigger failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
