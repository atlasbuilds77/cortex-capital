// Cortex Capital - MOMENTUM Agent
// Weekly sector rotation for ultra_aggressive profile
// Ranks sectors, generates rotation plan, executes Monday at open

import { query } from '../integrations/database';
import { getSectorPerformance, getETFHoldings } from '../integrations/tradier';

export type Sector = 
  | 'technology' | 'healthcare' | 'financial' | 'consumer_cyclical'
  | 'industrial' | 'energy' | 'utilities' | 'real_estate'
  | 'consumer_defensive' | 'materials' | 'communication';

export interface SectorRanking {
  sector: Sector;
  performance: number; // % change for the week
  momentum: number; // 0-100 momentum score
  volatility: number;
  volume: number;
  rank: number;
  etfSymbol: string; // Primary ETF for the sector
}

export interface RotationPlan {
  weekStart: Date;
  weekEnd: Date;
  rankings: SectorRanking[];
  buys: Array<{
    symbol: string;
    sector: Sector;
    allocation: number; // % of rotation capital
    reason: string;
  }>;
  sells: Array<{
    symbol: string;
    sector: Sector;
    allocation: number;
    reason: string;
  }>;
  totalRotationCapital: number;
  expected_weekly_return: number; // % expected return for the week // % expected return for the week
  riskLevel: 'low' | 'medium' | 'high';
}

export class MomentumAgent {
  private userId: string;
  private rotationCapital: number; // Capital allocated for weekly rotation
  private sectors: Sector[] = [
    'technology', 'healthcare', 'financial', 'consumer_cyclical',
    'industrial', 'energy', 'utilities', 'real_estate',
    'consumer_defensive', 'materials', 'communication'
  ];
  
  // Sector to ETF mapping
  private sectorETFs: Record<Sector, string> = {
    technology: 'XLK',
    healthcare: 'XLV',
    financial: 'XLF',
    consumer_cyclical: 'XLY',
    industrial: 'XLI',
    energy: 'XLE',
    utilities: 'XLU',
    real_estate: 'XLRE',
    consumer_defensive: 'XLP',
    materials: 'XLB',
    communication: 'XLC',
  };
  
  constructor(userId: string, rotationCapital: number) {
    this.userId = userId;
    this.rotationCapital = rotationCapital;
  }
  
  /**
   * Weekly sector ranking (top 2 / bottom 2)
   */
  async rankSectors(): Promise<SectorRanking[]> {
    console.log('[MOMENTUM] Ranking sectors...');
    
    const rankings: SectorRanking[] = [];
    
    try {
      // Get sector performance data
      const sectorPerformance = await getSectorPerformance();
      
      for (const sector of this.sectors) {
        try {
          const etfSymbol = this.sectorETFs[sector];
          const performance = await this.calculateSectorPerformance(sector, etfSymbol);
          
          // Calculate momentum score (simplified)
          const momentum = this.calculateMomentumScore(sector, performance);
          
          rankings.push({
            sector,
            performance,
            momentum,
            volatility: this.estimateVolatility(sector),
            volume: this.estimateVolume(sector),
            rank: 0, // Will be set after sorting
            etfSymbol,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`[MOMENTUM] Error ranking ${sector}:`, errorMessage);
          // Add placeholder ranking
          rankings.push({
            sector,
            performance: 0,
            momentum: 50,
            volatility: 0,
            volume: 0,
            rank: 0,
            etfSymbol: this.sectorETFs[sector],
          });
        }
      }
      
      // Sort by momentum (descending)
      rankings.sort((a, b) => b.momentum - a.momentum);
      
      // Assign ranks
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });
      
      console.log(`[MOMENTUM] Sector ranking complete. Top sector: ${rankings[0]?.sector}`);
      return rankings;
      
    } catch (error) {
      console.error('[MOMENTUM] Error ranking sectors:', error);
      return this.getFallbackRankings();
    }
  }
  
  private async calculateSectorPerformance(sector: Sector, etfSymbol: string): Promise<number> {
    try {
      // In production, use actual sector performance API
      // For MVP, simulate performance
      
      // Base performance by sector (simulated)
      const basePerformance: Record<Sector, number> = {
        technology: 2.5,
        healthcare: 1.8,
        financial: 1.2,
        consumer_cyclical: 2.1,
        industrial: 1.5,
        energy: -0.5,
        utilities: 0.8,
        real_estate: 1.0,
        consumer_defensive: 0.9,
        materials: 1.3,
        communication: 1.7,
      };
      
      // Add random variation
      const variation = (Math.random() - 0.5) * 2; // ±1%
      return basePerformance[sector] + variation;
      
    } catch (error) {
      console.warn(`[MOMENTUM] Error calculating performance for ${sector}:`, error);
      return 0;
    }
  }
  
  private calculateMomentumScore(sector: Sector, performance: number): number {
    // Simplified momentum calculation
    // In production, use multiple factors: price trend, volume, RSI, etc.
    
    let score = 50; // Base score
    
    // Performance factor
    score += performance * 10; // 1% performance = 10 points
    
    // Sector-specific biases (simulated)
    const sectorBias: Record<Sector, number> = {
      technology: 10,
      healthcare: 5,
      financial: 0,
      consumer_cyclical: 8,
      industrial: 3,
      energy: -5,
      utilities: -2,
      real_estate: 2,
      consumer_defensive: 0,
      materials: 4,
      communication: 7,
    };
    
    score += sectorBias[sector] || 0;
    
    // Add random noise
    score += (Math.random() - 0.5) * 10;
    
    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  private estimateVolatility(sector: Sector): number {
    // Simplified volatility estimation
    const baseVolatility: Record<Sector, number> = {
      technology: 25,
      healthcare: 18,
      financial: 22,
      consumer_cyclical: 20,
      industrial: 16,
      energy: 30,
      utilities: 12,
      real_estate: 15,
      consumer_defensive: 10,
      materials: 19,
      communication: 21,
    };
    
    return baseVolatility[sector] || 20;
  }
  
  private estimateVolume(sector: Sector): number {
    // Simplified volume estimation (in millions)
    const baseVolume: Record<Sector, number> = {
      technology: 50,
      healthcare: 30,
      financial: 40,
      consumer_cyclical: 35,
      industrial: 25,
      energy: 45,
      utilities: 15,
      real_estate: 20,
      consumer_defensive: 18,
      materials: 22,
      communication: 28,
    };
    
    return baseVolume[sector] || 25;
  }
  
  private getFallbackRankings(): SectorRanking[] {
    // Fallback rankings if API fails
    return this.sectors.map((sector, index) => ({
      sector,
      performance: 1.0 + (index * 0.1),
      momentum: 60 - (index * 5),
      volatility: 20,
      volume: 25,
      rank: index + 1,
      etfSymbol: this.sectorETFs[sector],
    }));
  }
  
  /**
   * Friday rotation logic
   */
  async generateRotationPlan(): Promise<RotationPlan> {
    console.log('[MOMENTUM] Generating rotation plan...');
    
    const rankings = await this.rankSectors();
    
    // Get top 2 and bottom 2 sectors
    const topSectors = rankings.slice(0, 2);
    const bottomSectors = rankings.slice(-2).reverse(); // Worst first
    
    // Calculate date range for the week
    const now = new Date();
    const weekStart = this.getNextMonday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday
    
    // Generate rotation plan
    const plan: RotationPlan = {
      weekStart,
      weekEnd,
      rankings,
      buys: [],
      sells: [],
      totalRotationCapital: this.rotationCapital,
      expected_weekly_return: 0,
      riskLevel: 'medium',
    };
    
    // Determine allocations
    const capitalPerBuy = this.rotationCapital * 0.4; // 40% each for top 2 sectors
    const capitalPerSell = this.rotationCapital * 0.3; // 30% each for bottom 2 sectors
    
    // Add buys (top sectors)
    for (const sector of topSectors) {
      plan.buys.push({
        symbol: sector.etfSymbol,
        sector: sector.sector,
        allocation: capitalPerBuy,
        reason: `Top ranked sector (#${sector.rank}), momentum: ${sector.momentum.toFixed(1)}`,
      });
    }
    
    // Add sells (bottom sectors)
    for (const sector of bottomSectors) {
      plan.sells.push({
        symbol: sector.etfSymbol,
        sector: sector.sector,
        allocation: capitalPerSell,
        reason: `Bottom ranked sector (#${sector.rank}), momentum: ${sector.momentum.toFixed(1)}`,
      });
    }
    
    // Calculate expected return
    const avgTopPerformance = topSectors.reduce((sum, s) => sum + s.performance, 0) / topSectors.length;
    const avgBottomPerformance = bottomSectors.reduce((sum, s) => sum + s.performance, 0) / bottomSectors.length;
    plan.expected_weekly_return = (avgTopPerformance - avgBottomPerformance) * 0.7; // 70% of spread
    
    // Determine risk level
    const avgVolatility = rankings.reduce((sum, s) => sum + s.volatility, 0) / rankings.length;
    plan.riskLevel = avgVolatility > 25 ? 'high' : avgVolatility > 18 ? 'medium' : 'low';
    
    // Save plan to database
    await this.saveRotationPlan(plan);
    
    console.log(`[MOMENTUM] Rotation plan generated:`);
    console.log(`  Buys: ${plan.buys.map(b => b.symbol).join(', ')}`);
    console.log(`  Sells: ${plan.sells.map(s => s.symbol).join(', ')}`);
    console.log(`  Expected return: ${plan.expected_weekly_return.toFixed(2)}%`);
    console.log(`  Risk level: ${plan.riskLevel}`);
    
    return plan;
  }
  
  /**
   * Execute rotation plan on Monday at open
   */
  async executeRotation(): Promise<boolean> {
    console.log('[MOMENTUM] Executing rotation...');
    
    try {
      // Get this week's plan
      const now = new Date();
      const weekStart = this.getCurrentWeekMonday(now);
      
      const result = await query(
        `SELECT * FROM weekly_rotation 
         WHERE user_id = $1 AND week_start = $2 AND executed = false`,
        [this.userId, weekStart]
      );
      
      if (result.rows.length === 0) {
        console.log('[MOMENTUM] No rotation plan found for this week');
        return false;
      }
      
      const planData = result.rows[0];
      const plan: RotationPlan = {
        weekStart: new Date(planData.week_start),
        weekEnd: new Date(planData.week_end),
        rankings: planData.sectors,
        buys: planData.rotation_plan.buys,
        sells: planData.rotation_plan.sells,
        totalRotationCapital: this.rotationCapital,
        expected_weekly_return: planData.expected_return || 0,
        riskLevel: planData.risk_level || 'medium',
      };
      
      // Check if it's Monday market hours
      if (!this.isMondayMarketHours()) {
        console.log('[MOMENTUM] Not Monday market hours, waiting...');
        return false;
      }
      
      console.log(`[MOMENTUM] Executing ${plan.buys.length} buys and ${plan.sells.length} sells`);
      
      // In production, execute trades via executor
      // For MVP, simulate execution
      
      let totalExecuted = 0;
      let totalValue = 0;
      
      // Execute sells first (raise cash)
      for (const sell of plan.sells) {
        console.log(`[MOMENTUM] Would sell $${sell.allocation.toFixed(2)} of ${sell.symbol}`);
        totalExecuted++;
        totalValue += sell.allocation;
      }
      
      // Execute buys
      for (const buy of plan.buys) {
        console.log(`[MOMENTUM] Would buy $${buy.allocation.toFixed(2)} of ${buy.symbol}`);
        totalExecuted++;
        totalValue += buy.allocation;
      }
      
      // Mark plan as executed
      await query(
        `UPDATE weekly_rotation 
         SET executed = true, execution_date = NOW()
         WHERE id = $1`,
        [planData.id]
      );
      
      console.log(`[MOMENTUM] Rotation executed: ${totalExecuted} trades, $${totalValue.toFixed(2)} total`);
      
      // Log execution
      await this.logRotationExecution(planData.id, totalExecuted, totalValue);
      
      return true;
      
    } catch (error) {
      console.error('[MOMENTUM] Error executing rotation:', error);
      return false;
    }
  }
  
  /**
   * Get rotation performance history
   */
  async getPerformanceHistory(weeks: number = 8): Promise<Array<{
    weekStart: Date;
    weekEnd: Date;
    executed: boolean;
    pnl: number;
    pnlPercent: number;
    buys: string[];
    sells: string[];
  }>> {
    try {
      const result = await query(
        `SELECT * FROM weekly_rotation 
         WHERE user_id = $1 
         ORDER BY week_start DESC 
         LIMIT $2`,
        [this.userId, weeks]
      );
      
      return result.rows.map(row => ({
        weekStart: new Date(row.week_start),
        weekEnd: new Date(row.week_end),
        executed: row.executed,
        pnl: parseFloat(row.pnl) || 0,
        pnlPercent: row.pnl && this.rotationCapital > 0 ? (parseFloat(row.pnl) / this.rotationCapital) * 100 : 0,
        buys: row.rotation_plan?.buys?.map((b: any) => b.symbol) || [],
        sells: row.rotation_plan?.sells?.map((s: any) => s.symbol) || [],
      }));
    } catch (error) {
      console.error('[MOMENTUM] Error getting performance history:', error);
      return [];
    }
  }
  
  private getNextMonday(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + ((1 + 7 - result.getDay()) % 7 || 7));
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  private getCurrentWeekMonday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  private isMondayMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Check if it's Monday
    if (day !== 1) return false;
    
    // Check if it's market hours (6:30 AM - 1:00 PM PST)
    const timeInMinutes = hour * 60 + minute;
    return timeInMinutes >= 390 && timeInMinutes <= 780; // 6:30-13:00
  }
  
  private async saveRotationPlan(plan: RotationPlan): Promise<boolean> {
    try {
      await query(
        `INSERT INTO weekly_rotation 
         (user_id, week_start, week_end, sectors, rotation_plan, expected_return, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, week_start) DO UPDATE 
         SET sectors = EXCLUDED.sectors, rotation_plan = EXCLUDED.rotation_plan,
             expected_return = EXCLUDED.expected_return, risk_level = EXCLUDED.risk_level`,
        [
          this.userId,
          plan.weekStart,
          plan.weekEnd,
          JSON.stringify(plan.rankings),
          JSON.stringify({ buys: plan.buys, sells: plan.sells }),
          plan.expected_weekly_return,
          plan.riskLevel,
        ]
      );
      return true;
    } catch (error) {
      console.error('[MOMENTUM] Error saving rotation plan:', error);
      return false;
    }
  }
  
  private async logRotationExecution(planId: string, trades: number, value: number): Promise<void> {
    try {
      await query(
        `INSERT INTO execution_history 
         (execution_id, plan_id, user_id, account_id, config, report)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `momentum_${Date.now()}`,
          planId,
          this.userId,
          'rotation_account',
          JSON.stringify({ type: 'weekly_rotation', trades, value }),
          JSON.stringify({ status: 'executed', timestamp: new Date() }),
        ]
      );
    } catch (error) {
      console.error('[MOMENTUM] Error logging execution:', error);
    }
  }
}

// Test function
export async function testMomentumAgent() {
  console.log('Testing Momentum Agent:');
  
  const userId = 'test_user_123';
  const rotationCapital = 20000;
  const momentumAgent = new MomentumAgent(userId, rotationCapital);
  
  // Test sector ranking
  console.log('\n=== SECTOR RANKING ===');
  const rankings = await momentumAgent.rankSectors();
  
  console.log('Sector Rankings:');
  rankings.forEach(ranking => {
    console.log(`${ranking.rank}. ${ranking.sector}: ${ranking.momentum.toFixed(1)} momentum, ${ranking.performance.toFixed(2)}% perf`);
  });
  
  // Test rotation plan generation
  console.log('\n=== ROTATION PLAN GENERATION ===');
  const plan = await momentumAgent.generateRotationPlan();
  
  console.log(`Week: ${plan.weekStart.toDateString()} to ${plan.weekEnd.toDateString()}`);
  console.log(`Rotation capital: $${plan.totalRotationCapital.toFixed(2)}`);
  console.log(`Expected return: ${plan.expected_weekly_return.toFixed(2)}%`);
  console.log(`Risk level: ${plan.riskLevel}`);
  
  console.log('\nBuys:');
  plan.buys.forEach(buy => {
    console.log(`  ${buy.symbol} (${buy.sector}): $${buy.allocation.toFixed(2)} - ${buy.reason}`);
  });
  
  console.log('\nSells:');
  plan.sells.forEach(sell => {
    console.log(`  ${sell.symbol} (${sell.sector}): $${sell.allocation.toFixed(2)} - ${sell.reason}`);
  });
  
  // Test rotation execution (simulated)
  console.log('\n=== ROTATION EXECUTION (SIMULATED) ===');
  const executed = await momentumAgent.executeRotation();
  console.log(`Rotation executed: ${executed}`);
  
  // Test performance history
  console.log('\n=== PERFORMANCE HISTORY ===');
  const history = await momentumAgent.getPerformanceHistory(4);
  console.log(`Last ${history.length} weeks:`);
  
  history.forEach((week, i) => {
    console.log(`Week ${i + 1}: ${week.weekStart.toDateString()}`);
    console.log(`  P&L: $${week.pnl.toFixed(2)} (${week.pnlPercent.toFixed(2)}%)`);
    console.log(`  Buys: ${week.buys.join(', ')}`);
    console.log(`  Sells: ${week.sells.join(', ')}`);
    console.log(`  Executed: ${week.executed}`);
  });
  
  console.log('\n=== MOMENTUM AGENT TEST COMPLETE ===');
}

// Run test if this file is executed directly
if (require.main === module) {
  testMomentumAgent().catch(console.error);
}