// Cortex Capital - DAY TRADER Agent
// Intraday trading for ultra_aggressive profile only
// No overnight holds, force exit before market close

import { query } from '../integrations/database';
import { getQuote, getNews } from '../integrations/tradier';

export type SetupType = 'breakout' | 'momentum' | 'news' | 'reversal' | 'gap';
export type ExitReason = 'target' | 'stop_loss' | 'time' | 'manual' | 'trailing_stop';

export interface DayTradeSetup {
  symbol: string;
  setupType: SetupType;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  confidence: number; // 0-100
  catalyst?: string; // News headline or technical pattern
  volumeSurge?: number; // % increase in volume
  volatility?: number; // ATR or implied volatility
}

export interface DayTradePosition {
  id?: string;
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  shares: number;
  pnl?: number;
  entryTime: Date;
  exitTime?: Date;
  setupType: SetupType;
  exitReason?: ExitReason;
  status: 'open' | 'closed' | 'stopped';
  targetPrice: number;
  stopLossPrice: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
}

export interface ScanFilters {
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  minVolatility?: number;
  sectors?: string[];
  excludeETFs?: boolean;
}

export class DayTrader {
  private userId: string;
  private dayTradingCapital: number;
  private maxRiskPerTrade: number; // % of day trading capital
  private forceExitTime: string; // e.g., "15:45"
  
  constructor(userId: string, dayTradingCapital: number, maxRiskPerTrade: number = 0.05, forceExitTime: string = '15:45') {
    this.userId = userId;
    this.dayTradingCapital = dayTradingCapital;
    this.maxRiskPerTrade = maxRiskPerTrade;
    this.forceExitTime = forceExitTime;
  }
  
  /**
   * Scan for intraday setups
   */
  async scanForSetups(filters: ScanFilters = {}): Promise<DayTradeSetup[]> {
    const setups: DayTradeSetup[] = [];
    
    try {
      // In production, this would scan hundreds of stocks
      // For MVP, we'll use a predefined watchlist
      const watchlist = ['AAPL', 'TSLA', 'NVDA', 'META', 'AMZN', 'GOOGL', 'MSFT', 'AMD', 'INTC', 'SPY'];
      
      for (const symbol of watchlist) {
        try {
          const quote = await getQuote(symbol);
          if (!quote || !quote.last) continue;
          
          // Apply price filter
          if (filters.minPrice && quote.last < filters.minPrice) continue;
          if (filters.maxPrice && quote.last > filters.maxPrice) continue;
          
          // Check for breakout setups
          const breakoutSetup = await this.scanForBreakout(symbol, quote);
          if (breakoutSetup) {
            setups.push(breakoutSetup);
          }
          
          // Check for momentum setups
          const momentumSetup = await this.scanForMomentum(symbol, quote);
          if (momentumSetup) {
            setups.push(momentumSetup);
          }
          
          // Check for news setups
          const newsSetup = await this.scanForNews(symbol, quote);
          if (newsSetup) {
            setups.push(newsSetup);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`[DAYTRADER] Error scanning ${symbol}:`, errorMessage);
          continue;
        }
      }
      
      // Sort by confidence
      setups.sort((a, b) => b.confidence - a.confidence);
      
      console.log(`[DAYTRADER] Found ${setups.length} setups`);
      return setups.slice(0, 10); // Return top 10 setups
      
    } catch (error) {
      console.error('[DAYTRADER] Error scanning for setups:', error);
      return [];
    }
  }
  
  private async scanForBreakout(symbol: string, quote: any): Promise<DayTradeSetup | null> {
    // Simplified breakout detection
    // In production, use technical analysis library
    const currentPrice = quote.last;
    const volume = quote.volume || 0;
    const avgVolume = quote.average_volume || volume;
    
    // Volume surge (50%+ above average)
    const volumeSurge = avgVolume > 0 ? (volume - avgVolume) / avgVolume : 0;
    
    if (volumeSurge > 0.5 && currentPrice > (quote.high || currentPrice * 1.01)) {
      const atr = this.estimateATR(symbol, quote);
      const entryPrice = currentPrice;
      const stopLoss = entryPrice - (atr * 1.5);
      const target = entryPrice + (atr * 3);
      const riskReward = (target - entryPrice) / (entryPrice - stopLoss);
      
      if (riskReward >= 2) {
        return {
          symbol,
          setupType: 'breakout',
          entryPrice,
          targetPrice: target,
          stopLossPrice: stopLoss,
          riskRewardRatio: riskReward,
          confidence: Math.min(80, volumeSurge * 100),
          volumeSurge,
          volatility: atr / entryPrice,
        };
      }
    }
    
    return null;
  }
  
  private async scanForMomentum(symbol: string, quote: any): Promise<DayTradeSetup | null> {
    // Simplified momentum detection
    const currentPrice = quote.last;
    const changePercent = quote.change_percentage || 0;
    const volume = quote.volume || 0;
    const avgVolume = quote.average_volume || volume;
    
    // Strong momentum: >3% move on high volume
    if (Math.abs(changePercent) > 3 && volume > avgVolume * 1.5) {
      const direction = changePercent > 0 ? 'bullish' : 'bearish';
      const atr = this.estimateATR(symbol, quote);
      
      if (direction === 'bullish') {
        const entryPrice = currentPrice;
        const stopLoss = entryPrice - (atr * 2);
        const target = entryPrice + (atr * 4);
        const riskReward = (target - entryPrice) / (entryPrice - stopLoss);
        
        if (riskReward >= 2) {
          return {
            symbol,
            setupType: 'momentum',
            entryPrice,
            targetPrice: target,
            stopLossPrice: stopLoss,
            riskRewardRatio: riskReward,
            confidence: Math.min(75, Math.abs(changePercent) * 10),
            volumeSurge: (volume - avgVolume) / avgVolume,
            volatility: atr / entryPrice,
          };
        }
      }
    }
    
    return null;
  }
  
  private async scanForNews(symbol: string, quote: any): Promise<DayTradeSetup | null> {
    // Check for recent news
    try {
      const news = await getNews(symbol);
      if (!news || news.length === 0) return null;
      
      const latestNews = news[0];
      const currentPrice = quote.last;
      const atr = this.estimateATR(symbol, quote);
      
      // News catalyst setup
      const entryPrice = currentPrice;
      const stopLoss = entryPrice - (atr * 2);
      const target = entryPrice + (atr * 3);
      const riskReward = (target - entryPrice) / (entryPrice - stopLoss);
      
      if (riskReward >= 1.5) {
        return {
          symbol,
          setupType: 'news',
          entryPrice,
          targetPrice: target,
          stopLossPrice: stopLoss,
          riskRewardRatio: riskReward,
          confidence: 70,
          catalyst: latestNews.headline?.substring(0, 100),
          volatility: atr / entryPrice,
        };
      }
    } catch (error) {
      // News API might fail, that's OK
    }
    
    return null;
  }
  
  private estimateATR(symbol: string, quote: any): number {
    // Simplified ATR estimation
    // In production, calculate actual ATR from historical data
    const high = quote.high || quote.last * 1.02;
    const low = quote.low || quote.last * 0.98;
    const range = high - low;
    return range * 0.7; // Rough ATR estimate
  }
  
  /**
   * Enter a position based on setup
   */
  async enterPosition(setup: DayTradeSetup): Promise<DayTradePosition | null> {
    try {
      // Calculate position size based on risk
      const riskPerShare = setup.entryPrice - setup.stopLossPrice;
      const maxRiskAmount = this.dayTradingCapital * this.maxRiskPerTrade;
      const maxShares = Math.floor(maxRiskAmount / riskPerShare);
      
      if (maxShares < 1) {
        console.warn(`[DAYTRADER] Risk too high for ${setup.symbol}: $${riskPerShare} per share > max risk $${maxRiskAmount}`);
        return null;
      }
      
      // Get current price for execution
      const quote = await getQuote(setup.symbol);
      if (!quote || !quote.last) {
        console.warn(`[DAYTRADER] No quote for ${setup.symbol}`);
        return null;
      }
      
      const currentPrice = quote.last;
      const priceDiff = Math.abs(currentPrice - setup.entryPrice) / setup.entryPrice;
      
      // Don't enter if price moved too far from setup
      if (priceDiff > 0.02) { // 2% tolerance
        console.warn(`[DAYTRADER] Price moved ${(priceDiff * 100).toFixed(1)}% from setup for ${setup.symbol}`);
        return null;
      }
      
      // Calculate final position size (limit to 1000 shares max)
      const shares = Math.min(maxShares, 1000);
      const entryPrice = currentPrice;
      
      // Create position record
      const position: DayTradePosition = {
        symbol: setup.symbol,
        entryPrice,
        shares,
        entryTime: new Date(),
        setupType: setup.setupType,
        status: 'open',
        targetPrice: setup.targetPrice,
        stopLossPrice: setup.stopLossPrice,
        currentPrice: entryPrice,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
      };
      
      // Save to database
      const saved = await this.savePosition(position);
      if (!saved) {
        console.error(`[DAYTRADER] Failed to save position for ${setup.symbol}`);
        return null;
      }
      
      console.log(`[DAYTRADER] Entered ${shares} shares of ${setup.symbol} at $${entryPrice}`);
      console.log(`[DAYTRADER] Target: $${setup.targetPrice}, Stop: $${setup.stopLossPrice}`);
      console.log(`[DAYTRADER] Risk: $${(riskPerShare * shares).toFixed(2)} (${((riskPerShare * shares) / this.dayTradingCapital * 100).toFixed(1)}% of capital)`);
      
      return position;
      
    } catch (error) {
      console.error(`[DAYTRADER] Error entering position for ${setup.symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Monitor open positions and check for exits
   */
  async monitorPosition(position: DayTradePosition): Promise<{
    shouldExit: boolean;
    exitReason?: ExitReason;
    exitPrice?: number;
  }> {
    try {
      const quote = await getQuote(position.symbol);
      if (!quote || !quote.last) {
        console.warn(`[DAYTRADER] No quote for ${position.symbol}`);
        return { shouldExit: false };
      }
      
      const currentPrice = quote.last;
      position.currentPrice = currentPrice;
      
      // Calculate unrealized P&L
      position.unrealizedPnl = (currentPrice - position.entryPrice) * position.shares;
      position.unrealizedPnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      
      // Check for target hit
      if (currentPrice >= position.targetPrice) {
        console.log(`[DAYTRADER] ${position.symbol} hit target: $${currentPrice} >= $${position.targetPrice}`);
        return {
          shouldExit: true,
          exitReason: 'target',
          exitPrice: currentPrice,
        };
      }
      
      // Check for stop loss hit
      if (currentPrice <= position.stopLossPrice) {
        console.log(`[DAYTRADER] ${position.symbol} hit stop: $${currentPrice} <= $${position.stopLossPrice}`);
        return {
          shouldExit: true,
          exitReason: 'stop_loss',
          exitPrice: currentPrice,
        };
      }
      
      // Check for trailing stop (simplified)
      // In production, implement proper trailing stop logic
      
      // Check if we should exit based on time
      const now = new Date();
      const exitTime = this.parseForceExitTime();
      if (now >= exitTime) {
        console.log(`[DAYTRADER] ${position.symbol} force exit time reached`);
        return {
          shouldExit: true,
          exitReason: 'time',
          exitPrice: currentPrice,
        };
      }
      
      // Update position in database
      await this.updatePosition(position);
      
      return { shouldExit: false };
      
    } catch (error) {
      console.error(`[DAYTRADER] Error monitoring ${position.symbol}:`, error);
      return { shouldExit: false };
    }
  }
  
  /**
   * Force exit all positions before market close
   */
  async forceExitEOD(): Promise<number> {
    try {
      const openPositions = await this.getOpenPositions();
      let exitedCount = 0;
      
      console.log(`[DAYTRADER] Force exiting ${openPositions.length} positions before close`);
      
      for (const position of openPositions) {
        const quote = await getQuote(position.symbol);
        if (!quote || !quote.last) continue;
        
        const exitPrice = quote.last;
        const success = await this.exitPosition(position, exitPrice, 'time');
        
        if (success) {
          exitedCount++;
          console.log(`[DAYTRADER] Exited ${position.symbol} at $${exitPrice}`);
        }
      }
      
      console.log(`[DAYTRADER] Force exit complete: ${exitedCount}/${openPositions.length} positions exited`);
      return exitedCount;
      
    } catch (error) {
      console.error('[DAYTRADER] Error in force exit:', error);
      return 0;
    }
  }
  
  /**
   * Exit a position
   */
  async exitPosition(
    position: DayTradePosition, 
    exitPrice: number, 
    exitReason: ExitReason
  ): Promise<boolean> {
    try {
      const pnl = (exitPrice - position.entryPrice) * position.shares;
      const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      
      await query(
        `UPDATE day_trades 
         SET exit_price = $1, exit_time = NOW(), pnl = $2, 
             exit_reason = $3, status = 'closed'
         WHERE id = $4`,
        [exitPrice, pnl, exitReason, position.id]
      );
      
      console.log(`[DAYTRADER] Exited ${position.symbol}: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
      console.log(`[DAYTRADER] Entry: $${position.entryPrice}, Exit: $${exitPrice}, Reason: ${exitReason}`);
      
      return true;
    } catch (error) {
      console.error(`[DAYTRADER] Error exiting ${position.symbol}:`, error);
      return false;
    }
  }
  
  /**
   * Get all open day trades
   */
  async getOpenPositions(): Promise<DayTradePosition[]> {
    try {
      const result = await query(
        `SELECT * FROM day_trades 
         WHERE user_id = $1 AND status = 'open'
         ORDER BY entry_time DESC`,
        [this.userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        entryPrice: parseFloat(row.entry_price),
        exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
        shares: row.shares,
        pnl: row.pnl ? parseFloat(row.pnl) : undefined,
        entryTime: new Date(row.entry_time),
        exitTime: row.exit_time ? new Date(row.exit_time) : undefined,
        setupType: row.setup_type as SetupType,
        exitReason: row.exit_reason as ExitReason,
        status: row.status as 'open' | 'closed' | 'stopped',
        targetPrice: parseFloat(row.target_price),
        stopLossPrice: parseFloat(row.stop_loss_price),
      }));
    } catch (error) {
      console.error('[DAYTRADER] Error fetching open positions:', error);
      return [];
    }
  }
  
  /**
   * Get day trading performance statistics
   */
  async getPerformanceStats(days: number = 30): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
  }> {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total_trades,
           SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
           SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
           SUM(pnl) as total_pnl,
           AVG(CASE WHEN pnl > 0 THEN pnl END) as avg_win,
           AVG(CASE WHEN pnl < 0 THEN pnl END) as avg_loss
         FROM day_trades 
         WHERE user_id = $1 
           AND status = 'closed'
           AND exit_time >= NOW() - INTERVAL '1 day' * $2`,
        [this.userId, Math.max(1, Math.min(365, Math.floor(Number(days) || 30)))]
      );
      
      const row = result.rows[0];
      const totalTrades = parseInt(row.total_trades) || 0;
      const winningTrades = parseInt(row.winning_trades) || 0;
      const losingTrades = parseInt(row.losing_trades) || 0;
      const totalPnl = parseFloat(row.total_pnl) || 0;
      const avgWin = parseFloat(row.avg_win) || 0;
      const avgLoss = parseFloat(row.avg_loss) || 0;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const profitFactor = avgLoss !== 0 ? (avgWin * winningTrades) / Math.abs(avgLoss * losingTrades) : Infinity;
      
      // Get max drawdown
      const drawdownResult = await query(
        `WITH daily_pnl AS (
           SELECT DATE(exit_time) as trade_date, SUM(pnl) as daily_pnl
           FROM day_trades 
           WHERE user_id = $1 AND status = 'closed'
           GROUP BY DATE(exit_time)
           ORDER BY trade_date
         ), running_total AS (
           SELECT trade_date, daily_pnl,
                  SUM(daily_pnl) OVER (ORDER BY trade_date) as running_pnl,
                  MAX(SUM(daily_pnl)) OVER (ORDER BY trade_date) as peak_pnl
           FROM daily_pnl
         )
         SELECT MAX(peak_pnl - running_pnl) as max_drawdown
         FROM running_total`,
        [this.userId]
      );
      
      const maxDrawdown = parseFloat(drawdownResult.rows[0]?.max_drawdown) || 0;
      
      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalPnl,
        avgWin,
        avgLoss,
        profitFactor,
        maxDrawdown,
      };
    } catch (error) {
      console.error('[DAYTRADER] Error getting performance stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
      };
    }
  }
  
  private async savePosition(position: DayTradePosition): Promise<boolean> {
    try {
      const result = await query(
        `INSERT INTO day_trades 
         (user_id, symbol, entry_price, shares, entry_time, setup_type, 
          target_price, stop_loss_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
         RETURNING id`,
        [
          this.userId,
          position.symbol,
          position.entryPrice,
          position.shares,
          position.entryTime,
          position.setupType,
          position.targetPrice,
          position.stopLossPrice,
        ]
      );
      
      if (result.rows[0]) {
        position.id = result.rows[0].id;
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DAYTRADER] Error saving position:', error);
      return false;
    }
  }
  
  private async updatePosition(position: DayTradePosition): Promise<boolean> {
    if (!position.id) return false;
    
    try {
      await query(
        `UPDATE day_trades 
         SET current_price = $1, unrealized_pnl = $2
         WHERE id = $3`,
        [position.currentPrice, position.unrealizedPnl, position.id]
      );
      return true;
    } catch (error) {
      console.error('[DAYTRADER] Error updating position:', error);
      return false;
    }
  }
  
  private parseForceExitTime(): Date {
    const now = new Date();
    const [hours, minutes] = this.forceExitTime.split(':').map(Number);
    
    const exitTime = new Date(now);
    exitTime.setHours(hours, minutes, 0, 0);
    
    // If exit time is before now, use tomorrow
    if (exitTime < now) {
      exitTime.setDate(exitTime.getDate() + 1);
    }
    
    return exitTime;
  }
}

// Test function
export async function testDayTrader() {
  console.log('Testing Day Trader:');
  
  const userId = 'test_user_123';
  const dayTradingCapital = 10000;
  const dayTrader = new DayTrader(userId, dayTradingCapital);
  
  // Test setup scanning
  console.log('\n=== SCANNING FOR SETUPS ===');
  const setups = await dayTrader.scanForSetups({
    minPrice: 50,
    maxPrice: 500,
    minVolume: 1000000,
  });
  
  console.log(`Found ${setups.length} setups:`);
  setups.forEach((setup, i) => {
    console.log(`${i + 1}. ${setup.symbol} - ${setup.setupType}`);
    console.log(`   Entry: $${setup.entryPrice}, Target: $${setup.targetPrice}, Stop: $${setup.stopLossPrice}`);
    console.log(`   R/R: ${setup.riskRewardRatio.toFixed(2)}, Confidence: ${setup.confidence}`);
  });
  
  // Test entering a position (simulated)
  if (setups.length > 0) {
    console.log('\n=== ENTERING POSITION ===');
    const position = await dayTrader.enterPosition(setups[0]);
    
    if (position) {
      console.log(`Entered position: ${position.symbol} ${position.shares} shares at $${position.entryPrice}`);
      
      // Test monitoring
      console.log('\n=== MONITORING POSITION ===');
      const monitorResult = await dayTrader.monitorPosition(position);
      console.log(`Should exit: ${monitorResult.shouldExit}`);
      if (monitorResult.shouldExit) {
        console.log(`Exit reason: ${monitorResult.exitReason}, Price: $${monitorResult.exitPrice}`);
      }
      
      // Test force exit
      console.log('\n=== FORCE EXIT TEST ===');
      const exitedCount = await dayTrader.forceExitEOD();
      console.log(`Force exited ${exitedCount} positions`);
      
      // Test performance stats
      console.log('\n=== PERFORMANCE STATS ===');
      const stats = await dayTrader.getPerformanceStats();
      console.log(`Total trades: ${stats.totalTrades}`);
      console.log(`Win rate: ${stats.winRate.toFixed(1)}%`);
      console.log(`Total P&L: $${stats.totalPnl.toFixed(2)}`);
      console.log(`Profit factor: ${stats.profitFactor.toFixed(2)}`);
    }
  }
  
  console.log('\n=== DAY TRADER TEST COMPLETE ===');
}

// Run test if this file is executed directly
if (require.main === module) {
  testDayTrader().catch(console.error);
}