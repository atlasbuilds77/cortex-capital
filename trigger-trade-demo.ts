/**
 * TRIGGER TRADE DEMO
 * Force agents to generate trades for demo
 */

import { getPool } from './lib/db';
import { getPortfolioContext, buildAgentContext } from './lib/portfolio-context';
import { getDeepSeekClient } from './integrations/deepseek';
import { parseAgentDecisions } from './lib/decision-parser';
import { queueTradeForApproval } from './services/trade-queue';
import { executeApprovedTrade } from './services/broker-executor';

async function triggerTradeDemo() {
  const db = getPool();
  const userId = '8fc842af-fdbb-46b8-a800-0b3bd1d8d757';

  console.log('💰 Triggering trade demo for demo user\n');

  try {
    // Get portfolio
    const snapshot = await getPortfolioContext(userId, db);
    if (!snapshot) throw new Error('User not found');

    const context = buildAgentContext(snapshot);

    // Build aggressive prompt
    const prompt = `
You are a team of AI portfolio managers for ${context.userName}.

PORTFOLIO CONTEXT:
- Tier: ${context.tier} (FULL AUTO-EXECUTION)
- Risk Profile: AGGRESSIVE
- Total Value: $${context.totalValue.toLocaleString()}
- Cash: $${context.cash.toLocaleString()} (100% cash - NEED TO DEPLOY)
- Positions: None

TASK: Build an initial aggressive portfolio NOW.

REQUIREMENTS:
1. Deploy at least 50% of cash ($49k) into positions
2. Choose 3-5 high-growth stocks (tech, AI, growth sectors)
3. Position sizes: 10-20% each
4. EXECUTOR must provide EXACT trade details

AGENT ROLES:
- ANALYST: Recommend 3-5 high-growth stocks worth buying today
- STRATEGIST: Design portfolio allocation (what % in each)
- RISK: Validate position sizes are appropriate for aggressive profile
- EXECUTOR: List EXACT trades to execute (BUY [qty] [symbol])

Format EXECUTOR trades as:
"I will execute:
1. BUY 50 shares of NVDA
2. BUY 100 shares of TSLA
..."

GO:
`;

    console.log('Calling DeepSeek with aggressive prompt...\n');
    
    const deepSeek = getDeepSeekClient();
    const response = await deepSeek.generateCompletion(
      [{ role: 'user', content: prompt }],
      0.7,
      2000
    );
    console.log('📝 DeepSeek Response:');
    console.log(response.slice(0, 500) + '...\n');

    // Parse for EXECUTOR decisions
    const mockMessages = [
      { agent: 'EXECUTOR', role: 'assistant', content: response, timestamp: new Date().toISOString() }
    ];

    const decisions = parseAgentDecisions(mockMessages);
    console.log(`💼 Parsed ${decisions.length} trade decisions\n`);

    if (decisions.length === 0) {
      console.log('❌ No trades found in response. Try again or parse manually.');
      await db.end();
      return;
    }

    // Queue trades
    for (const decision of decisions) {
      console.log(`Queuing: ${decision.action.toUpperCase()} ${decision.quantity} ${decision.symbol}`);
      
      const queued = await queueTradeForApproval(userId, 'partner', decision, db);
      
      // Partner tier = auto-approved, execute immediately
      if (queued.status === 'approved') {
        console.log(`  → Auto-approved (Partner tier), executing...`);
        
        const result = await executeApprovedTrade(queued, db);
        
        if (result.success) {
          console.log(`  ✅ Executed: Order ${result.orderId}`);
        } else {
          console.log(`  ❌ Failed: ${result.error}`);
        }
      }
    }

    console.log('\n✅ DEMO COMPLETE');
    await db.end();
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    await db.end();
    process.exit(1);
  }
}

triggerTradeDemo();
