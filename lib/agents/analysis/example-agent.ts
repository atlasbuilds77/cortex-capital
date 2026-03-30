/**
 * Example Cortex Capital Agent using Research Engine
 * 
 * Demonstrates how to integrate research into trading decisions
 */

import { ResearchReport, getFullResearch, getBatchResearch } from './research-aggregator';

export interface TradeDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  confidence: number;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  positionSize?: number; // Percentage of portfolio (0-100)
  stopLoss?: number; // Percentage stop loss
  takeProfit?: number; // Percentage take profit
}

export class ResearchBasedAgent {
  private minConfidence: number;
  private maxRiskFactors: number;
  
  constructor(config: { minConfidence?: number; maxRiskFactors?: number } = {}) {
    this.minConfidence = config.minConfidence || 70;
    this.maxRiskFactors = config.maxRiskFactors || 3;
  }
  
  /**
   * Analyze a single symbol and make trading decision
   */
  async analyzeSymbol(symbol: string): Promise<TradeDecision> {
    console.log(`Analyzing ${symbol}...`);
    
    try {
      const report = await getFullResearch(symbol);
      
      // Base decision on research
      return this.makeDecisionFromReport(report);
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return {
        symbol,
        action: 'AVOID',
        confidence: 0,
        reason: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        riskLevel: 'HIGH'
      };
    }
  }
  
  /**
   * Analyze multiple symbols and rank them
   */
  async analyzeSymbols(symbols: string[]): Promise<TradeDecision[]> {
    console.log(`Analyzing ${symbols.length} symbols...`);
    
    try {
      const reports = await getBatchResearch(symbols);
      const decisions: TradeDecision[] = [];
      
      for (const [symbol, report] of reports) {
        const decision = this.makeDecisionFromReport(report);
        decisions.push(decision);
      }
      
      // Sort by confidence (highest first)
      return decisions.sort((a, b) => b.confidence - a.confidence);
      
    } catch (error) {
      console.error('Error analyzing symbols:', error);
      return symbols.map(symbol => ({
        symbol,
        action: 'AVOID',
        confidence: 0,
        reason: 'Batch research failed',
        riskLevel: 'HIGH'
      }));
    }
  }
  
  /**
   * Make trading decision from research report
   */
  private makeDecisionFromReport(report: ResearchReport): TradeDecision {
    const { symbol, sentiment, confidence, riskFactors, upcomingCatalysts } = report;
    
    // Check minimum confidence threshold
    if (confidence < this.minConfidence) {
      return {
        symbol,
        action: 'AVOID',
        confidence,
        reason: `Research confidence too low (${confidence}% < ${this.minConfidence}%)`,
        riskLevel: 'HIGH'
      };
    }
    
    // Check risk factors
    if (riskFactors.length > this.maxRiskFactors) {
      return {
        symbol,
        action: 'AVOID',
        confidence,
        reason: `Too many risk factors (${riskFactors.length} > ${this.maxRiskFactors})`,
        riskLevel: 'HIGH'
      };
    }
    
    // Determine action based on sentiment
    let action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
    let reason: string;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let positionSize: number | undefined;
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;
    
    switch (sentiment) {
      case 'bullish':
        action = 'BUY';
        reason = `Bullish sentiment with ${confidence}% confidence`;
        riskLevel = riskFactors.length === 0 ? 'LOW' : riskFactors.length <= 2 ? 'MEDIUM' : 'HIGH';
        
        // Calculate position size based on confidence and risk
        positionSize = Math.min(100, Math.floor(confidence / 10)); // 0-10% of portfolio
        stopLoss = 5; // 5% stop loss
        takeProfit = 15; // 15% take profit
        
        // Adjust for catalysts
        if (upcomingCatalysts.length > 0) {
          reason += `, ${upcomingCatalysts.length} upcoming catalyst(s)`;
          positionSize = Math.min(positionSize * 1.5, 15); // Increase position for catalysts
        }
        break;
        
      case 'bearish':
        action = 'SELL';
        reason = `Bearish sentiment with ${confidence}% confidence`;
        riskLevel = 'HIGH'; // Shorting is generally higher risk
        positionSize = Math.min(50, Math.floor(confidence / 20)); // Smaller position for shorts
        stopLoss = 3; // Tighter stop loss for shorts
        takeProfit = 10; // Smaller profit target for shorts
        break;
        
      case 'neutral':
      default:
        action = 'HOLD';
        reason = `Neutral sentiment with ${confidence}% confidence`;
        riskLevel = 'MEDIUM';
        break;
    }
    
    // Add risk factor details if any
    if (riskFactors.length > 0) {
      reason += `. Risks: ${riskFactors.slice(0, 3).join(', ')}`;
      if (riskFactors.length > 3) {
        reason += ` and ${riskFactors.length - 3} more`;
      }
    }
    
    return {
      symbol,
      action,
      confidence,
      reason,
      riskLevel,
      positionSize,
      stopLoss,
      takeProfit
    };
  }
  
  /**
   * Generate trading plan for portfolio
   */
  async generateTradingPlan(symbols: string[], portfolioSize: number = 100000): Promise<{
    decisions: TradeDecision[];
    totalAllocation: number;
    expectedReturn: number;
    maxDrawdown: number;
  }> {
    const decisions = await this.analyzeSymbols(symbols);
    
    // Filter for actionable decisions (BUY/SELL)
    const actionableDecisions = decisions.filter(d => d.action === 'BUY' || d.action === 'SELL');
    
    // Calculate allocations
    let totalAllocation = 0;
    let expectedReturn = 0;
    let maxDrawdown = 0;
    
    for (const decision of actionableDecisions) {
      if (decision.positionSize) {
        const allocation = (decision.positionSize / 100) * portfolioSize;
        totalAllocation += allocation;
        
        // Simple expected return calculation
        const baseReturn = decision.action === 'BUY' ? 8 : -5; // Base expected return %
        const confidenceMultiplier = decision.confidence / 100;
        const decisionReturn = baseReturn * confidenceMultiplier;
        
        expectedReturn += (allocation / portfolioSize) * decisionReturn;
        
        // Estimate max drawdown based on risk level
        const riskDrawdown = decision.riskLevel === 'HIGH' ? 15 : 
                            decision.riskLevel === 'MEDIUM' ? 10 : 5;
        maxDrawdown = Math.max(maxDrawdown, riskDrawdown);
      }
    }
    
    return {
      decisions,
      totalAllocation,
      expectedReturn,
      maxDrawdown
    };
  }
}

/**
 * Example usage
 */
async function exampleUsage() {
  console.log('=== Cortex Capital Research-Based Agent Example ===\n');
  
  // Create agent with custom configuration
  const agent = new ResearchBasedAgent({
    minConfidence: 65,
    maxRiskFactors: 4
  });
  
  // Analyze individual symbol
  console.log('1. Analyzing individual symbol (AAPL):');
  const aaplDecision = await agent.analyzeSymbol('AAPL');
  console.log(JSON.stringify(aaplDecision, null, 2));
  
  // Analyze multiple symbols
  console.log('\n2. Analyzing portfolio of symbols:');
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
  const portfolioDecisions = await agent.analyzeSymbols(symbols);
  
  console.log('\nRanked decisions:');
  portfolioDecisions.forEach((decision, index) => {
    console.log(`${index + 1}. ${decision.symbol}: ${decision.action} (${decision.confidence}% confidence)`);
  });
  
  // Generate trading plan
  console.log('\n3. Generating trading plan ($100,000 portfolio):');
  const tradingPlan = await agent.generateTradingPlan(symbols, 100000);
  
  console.log(`Total allocation: $${tradingPlan.totalAllocation.toFixed(2)}`);
  console.log(`Expected return: ${tradingPlan.expectedReturn.toFixed(2)}%`);
  console.log(`Max drawdown: ${tradingPlan.maxDrawdown.toFixed(2)}%`);
  
  console.log('\n=== Example complete ===');
}

// Export for use in other agents
export { exampleUsage };

// Run example if this file is executed directly
if (require.main === module) {
  // Check for BRAVE_API_KEY
  if (!process.env.BRAVE_API_KEY) {
    console.error('ERROR: BRAVE_API_KEY environment variable is not set');
    console.error('Please set it before running the example:');
    console.error('  export BRAVE_API_KEY=your_key_here');
    console.error('Or add it to your .env.local file');
    process.exit(1);
  }
  
  exampleUsage().catch(console.error);
}