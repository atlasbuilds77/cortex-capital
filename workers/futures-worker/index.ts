/**
 * Futures Worker - Nebula/TopstepX Integration
 * Claims execute_trade steps for futures and executes via Nebula webhook
 * CRITICAL: ALWAYS 10 CONTRACTS - Trim 5 at TP1, run 5 to TP2
 */

import https from 'https';
import http from 'http';
import { config, getCredentials } from '../../integration/config';
import * as db from '../../integration/db-adapter';

// Worker configuration
const WORKER_ID = `futures-worker-${process.pid}`;
const POLL_INTERVAL = config.workers.pollIntervalMs;
const CIRCUIT_BREAKER_THRESHOLD = config.workers.circuitBreakerThreshold;
const CIRCUIT_BREAKER_RESET = config.workers.circuitBreakerResetMs;

// CRITICAL: Trading rules
const CONTRACT_SIZE = config.trading.futures.contracts; // ALWAYS 10
const TP1_CONTRACTS = config.trading.futures.tp1Contracts; // Trim 5
const TP2_CONTRACTS = config.trading.futures.tp2Contracts; // Run 5
const ACCOUNT = config.trading.futures.account; // 18354484

// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpen = false;
let circuitOpenedAt: Date | null = null;

interface FuturesPayload {
  symbol: string;           // "MES", "MNQ", "ES", "NQ"
  side: 'buy' | 'sell' | 'flatten';
  contracts?: number;       // Default to 10
  orderType?: 'market' | 'limit' | 'stop';
  limitPrice?: number;
  stopPrice?: number;
  tp1?: number;
  tp2?: number;
  stopLoss?: number;
  isTP1?: boolean;          // True if this is a TP1 exit
  isTP2?: boolean;          // True if this is a TP2 exit
}

interface NebulaWebhookPayload {
  key: string;
  symbol: string;
  side: 'buy' | 'sell' | 'flatten';
  size: number;
  account: number;
  orderType?: string;
  limitPrice?: number;
  stopPrice?: number;
}

/**
 * Get current futures prices from local relay
 */
async function getFuturesPrices(): Promise<Record<string, {
  last: number;
  bid: number;
  ask: number;
  change: number;
}>> {
  return new Promise((resolve, reject) => {
    http.get(config.apis.nebula.prices, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse prices: ${e}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Send webhook to Nebula for order execution
 */
async function sendNebulaWebhook(payload: NebulaWebhookPayload): Promise<{
  success: boolean;
  response?: any;
  error?: string;
}> {
  const webhookUrl = config.apis.nebula.webhook;
  
  return new Promise((resolve) => {
    const urlObj = new URL(webhookUrl);
    
    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: `${urlObj.pathname}${urlObj.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, response: data });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Execute a futures trade via Nebula webhook
 * CRITICAL: Validates 10 contract rule
 */
async function executeTrade(payload: FuturesPayload): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
  contracts?: number;
}> {
  try {
    // CRITICAL: Validate contract size
    const contracts = payload.contracts || CONTRACT_SIZE;
    
    // For entry, must be 10 contracts
    if (payload.side !== 'flatten' && !payload.isTP1 && !payload.isTP2) {
      if (contracts !== CONTRACT_SIZE) {
        console.log(`[FuturesWorker] ⚠️ Correcting contract size from ${contracts} to ${CONTRACT_SIZE}`);
      }
    }
    
    // For TP1 exit, should be 5 contracts
    if (payload.isTP1 && contracts !== TP1_CONTRACTS) {
      console.log(`[FuturesWorker] ⚠️ TP1 should be ${TP1_CONTRACTS} contracts`);
    }
    
    // For TP2 exit, should be 5 contracts
    if (payload.isTP2 && contracts !== TP2_CONTRACTS) {
      console.log(`[FuturesWorker] ⚠️ TP2 should be ${TP2_CONTRACTS} contracts`);
    }
    
    // Get current prices for validation
    console.log(`[FuturesWorker] Fetching current prices...`);
    const prices = await getFuturesPrices().catch(() => null);
    if (prices && prices[payload.symbol]) {
      console.log(`[FuturesWorker] ${payload.symbol}: ${JSON.stringify(prices[payload.symbol])}`);
    }
    
    // Build webhook payload
    const webhookPayload: NebulaWebhookPayload = {
      key: new URL(config.apis.nebula.webhook).searchParams.get('key') || '',
      symbol: payload.symbol,
      side: payload.side,
      size: payload.side === 'flatten' ? 0 : (payload.isTP1 ? TP1_CONTRACTS : payload.isTP2 ? TP2_CONTRACTS : CONTRACT_SIZE),
      account: ACCOUNT,
    };
    
    if (payload.orderType === 'limit' && payload.limitPrice) {
      webhookPayload.orderType = 'limit';
      webhookPayload.limitPrice = payload.limitPrice;
    }
    
    if (payload.orderType === 'stop' && payload.stopPrice) {
      webhookPayload.orderType = 'stop';
      webhookPayload.stopPrice = payload.stopPrice;
    }
    
    console.log(`[FuturesWorker] Sending webhook: ${payload.side} ${webhookPayload.size} ${payload.symbol}`);
    const result = await sendNebulaWebhook(webhookPayload);
    
    if (result.success) {
      const orderId = `nebula_${Date.now()}`;
      console.log(`[FuturesWorker] ✅ Order sent successfully: ${orderId}`);
      return { success: true, orderId, contracts: webhookPayload.size };
    }
    
    throw new Error(result.error || 'Webhook failed');
    
  } catch (error) {
    console.error('[FuturesWorker] Trade failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Set up bracket orders (TP1, TP2, Stop Loss)
 */
async function setupBracketOrders(
  symbol: string,
  side: 'buy' | 'sell',
  entryPrice: number,
  tp1: number,
  tp2: number,
  stopLoss: number
): Promise<{ success: boolean; error?: string }> {
  console.log(`[FuturesWorker] Setting up bracket: TP1=${tp1}, TP2=${tp2}, SL=${stopLoss}`);
  
  const exitSide = side === 'buy' ? 'sell' : 'buy';
  
  // TP1: Limit order for 5 contracts
  const tp1Result = await sendNebulaWebhook({
    key: new URL(config.apis.nebula.webhook).searchParams.get('key') || '',
    symbol,
    side: exitSide,
    size: TP1_CONTRACTS,
    account: ACCOUNT,
    orderType: 'limit',
    limitPrice: tp1,
  });
  
  if (!tp1Result.success) {
    console.error('[FuturesWorker] Failed to set TP1:', tp1Result.error);
  }
  
  // TP2: Limit order for remaining 5 contracts
  const tp2Result = await sendNebulaWebhook({
    key: new URL(config.apis.nebula.webhook).searchParams.get('key') || '',
    symbol,
    side: exitSide,
    size: TP2_CONTRACTS,
    account: ACCOUNT,
    orderType: 'limit',
    limitPrice: tp2,
  });
  
  if (!tp2Result.success) {
    console.error('[FuturesWorker] Failed to set TP2:', tp2Result.error);
  }
  
  // Stop Loss: Stop order for all 10 contracts
  const slResult = await sendNebulaWebhook({
    key: new URL(config.apis.nebula.webhook).searchParams.get('key') || '',
    symbol,
    side: exitSide,
    size: CONTRACT_SIZE,
    account: ACCOUNT,
    orderType: 'stop',
    stopPrice: stopLoss,
  });
  
  if (!slResult.success) {
    console.error('[FuturesWorker] Failed to set SL:', slResult.error);
  }
  
  return { success: tp1Result.success && tp2Result.success && slResult.success };
}

/**
 * Process a single step
 */
async function processStep(step: db.MissionStep): Promise<void> {
  const payload = step.payload as FuturesPayload;
  console.log(`[FuturesWorker] Processing step ${step.id}: ${payload.side} ${payload.contracts || CONTRACT_SIZE} ${payload.symbol}`);
  
  try {
    const result = await executeTrade(payload);
    
    if (result.success) {
      // If this is an entry with TP/SL, set up brackets
      if (payload.side !== 'flatten' && !payload.isTP1 && !payload.isTP2 && payload.tp1 && payload.tp2 && payload.stopLoss) {
        const prices = await getFuturesPrices().catch(() => null);
        const entryPrice = prices?.[payload.symbol]?.last || 0;
        
        await setupBracketOrders(
          payload.symbol,
          payload.side,
          entryPrice,
          payload.tp1,
          payload.tp2,
          payload.stopLoss
        );
      }
      
      await db.completeStep(step.id!, {
        orderId: result.orderId,
        contracts: result.contracts,
        executedAt: new Date().toISOString(),
      });
      
      // Create event
      await db.createEvent({
        agent_id: 'scout',
        kind: 'trade_executed',
        title: `Executed ${payload.side} ${result.contracts} ${payload.symbol}`,
        summary: `Order ID: ${result.orderId}, Contracts: ${result.contracts}`,
        tags: ['trade', 'futures', payload.side, payload.symbol],
        metadata: {
          step_id: step.id,
          mission_id: step.mission_id,
          ...result,
        },
      });
      
      consecutiveFailures = 0;
    } else {
      throw new Error(result.error || 'Trade failed');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FuturesWorker] Step ${step.id} failed:`, errorMsg);
    
    await db.failStep(step.id!, errorMsg);
    consecutiveFailures++;
    
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.error(`[FuturesWorker] 🔴 Circuit breaker OPEN after ${consecutiveFailures} failures`);
      circuitOpen = true;
      circuitOpenedAt = new Date();
    }
  }
}

/**
 * Check FuturesRelay health
 */
async function checkRelayHealth(): Promise<boolean> {
  try {
    const prices = await getFuturesPrices();
    return Object.keys(prices).length > 0;
  } catch {
    return false;
  }
}

/**
 * Main polling loop
 */
async function pollLoop(): Promise<void> {
  // Check circuit breaker
  if (circuitOpen) {
    const timeSinceOpen = Date.now() - (circuitOpenedAt?.getTime() || 0);
    if (timeSinceOpen > CIRCUIT_BREAKER_RESET) {
      console.log('[FuturesWorker] 🟢 Circuit breaker RESET');
      circuitOpen = false;
      circuitOpenedAt = null;
      consecutiveFailures = 0;
    } else {
      console.log(`[FuturesWorker] Circuit breaker open, waiting ${Math.ceil((CIRCUIT_BREAKER_RESET - timeSinceOpen) / 1000)}s...`);
      return;
    }
  }
  
  // Check relay health
  const relayHealthy = await checkRelayHealth();
  if (!relayHealthy) {
    console.warn('[FuturesWorker] FuturesRelay not responding - skipping poll');
    return;
  }
  
  try {
    // Get queued execute_trade steps for futures
    const steps = await db.getQueuedSteps('execute_trade');
    const futuresSteps = steps.filter(s => 
      s.payload?.market === 'futures' || 
      ['MES', 'MNQ', 'ES', 'NQ'].includes(s.payload?.symbol)
    );
    
    for (const step of futuresSteps) {
      // Atomic claim
      const claimed = await db.claimStep(step.id!, WORKER_ID);
      if (!claimed) {
        console.log(`[FuturesWorker] Step ${step.id} claimed by another worker`);
        continue;
      }
      
      await processStep(step);
      
      // Small delay between trades
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('[FuturesWorker] Poll loop error:', error);
    consecutiveFailures++;
  }
}

/**
 * Start worker
 */
async function start(): Promise<void> {
  console.log(`[FuturesWorker] Starting worker ${WORKER_ID}...`);
  console.log(`[FuturesWorker] ⚠️ CRITICAL: Always ${CONTRACT_SIZE} contracts`);
  console.log(`[FuturesWorker] TP1: Trim ${TP1_CONTRACTS}, TP2: Run ${TP2_CONTRACTS}`);
  console.log(`[FuturesWorker] Account: ${ACCOUNT}`);
  console.log(`[FuturesWorker] Polling every ${POLL_INTERVAL}ms`);
  
  // Check relay health on startup
  const healthy = await checkRelayHealth();
  if (healthy) {
    console.log('[FuturesWorker] ✅ FuturesRelay is healthy');
  } else {
    console.warn('[FuturesWorker] ⚠️ FuturesRelay not responding - will retry');
  }
  
  // Initial poll
  await pollLoop();
  
  // Set up interval
  setInterval(pollLoop, POLL_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[FuturesWorker] Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[FuturesWorker] Received SIGINT, shutting down...');
    process.exit(0);
  });
}

// Run if main module
if (require.main === module) {
  start().catch(error => {
    console.error('[FuturesWorker] Fatal error:', error);
    process.exit(1);
  });
}

export { start, executeTrade, processStep, setupBracketOrders };
