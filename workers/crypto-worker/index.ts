/**
 * Crypto Worker - Jupiter Integration
 * Claims execute_trade steps for crypto and executes via Jupiter API
 * Position size: 0.23 SOL (~$20)
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { readFileSync } from 'fs';
import https from 'https';
import { config, getCredentials } from '../../integration/config';
import * as db from '../../integration/db-adapter';
import { logger } from '../../utils/logger';

const log = logger.child('CryptoWorker');

// Worker configuration
const WORKER_ID = `crypto-worker-${process.pid}`;
const POLL_INTERVAL = config.workers.pollIntervalMs;
const CIRCUIT_BREAKER_THRESHOLD = config.workers.circuitBreakerThreshold;
const CIRCUIT_BREAKER_RESET = config.workers.circuitBreakerResetMs;

// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpen = false;
let circuitOpenedAt: Date | null = null;

// Wallet and connection
let wallet: Keypair | null = null;
let connection: Connection | null = null;

interface TradePayload {
  token: string;
  tokenAddress: string;
  side: 'buy' | 'sell';
  amountSol?: number;
  amountTokens?: number;
  slippageBps?: number;
}

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: any[];
}

/**
 * Retry helper for API calls
 */
async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      
      const isRetryable = 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.statusCode === 429 ||
        error.statusCode >= 500;
      
      if (!isRetryable) throw error;
      
      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.log(`[CryptoWorker] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Initialize wallet and connection
 */
function initialize(): void {
  const creds = getCredentials();
  
  // Load wallet
  try {
    const walletData = JSON.parse(readFileSync(creds.solana.private_key_file, 'utf-8'));
    wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    log.info('Wallet loaded', { publicKey: wallet.publicKey.toBase58() });
  } catch (error) {
    log.error('Failed to load wallet', { error });
    throw new Error('Cannot load wallet');
  }
  
  // Initialize connection
  connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  log.info('Connection initialized');
}

/**
 * Make HTTPS request
 */
function httpsRequest(url: string, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Get Jupiter quote
 */
async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100
): Promise<JupiterQuote> {
  const creds = getCredentials();
  const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  
  // Wrap with retry logic
  const response = await apiCallWithRetry(() => 
    httpsRequest(url, {
      method: 'GET',
      headers: {
        'x-api-key': creds.jupiter.api_key,
      },
    })
  );
  
  return response;
}

/**
 * Execute swap via Jupiter
 */
async function executeSwap(quote: JupiterQuote): Promise<string> {
  if (!wallet) throw new Error('Wallet not initialized');
  
  const creds = getCredentials();
  
  // Get swap transaction (with retry logic)
  const swapResponse = await apiCallWithRetry(() =>
    httpsRequest('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': creds.jupiter.api_key,
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: wallet!.publicKey.toBase58(),
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    })
  );
  
  if (!swapResponse.swapTransaction) {
    throw new Error('No swap transaction returned');
  }
  
  // Deserialize, sign, and send
  const swapTxBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTxBuf);
  transaction.sign([wallet!]);
  
  const rawTx = transaction.serialize();
  const txid = await connection!.sendRawTransaction(rawTx, {
    skipPreflight: true,
    maxRetries: 3,
  });
  
  // Confirm
  const confirmation = await connection!.confirmTransaction(txid, 'confirmed');
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  
  return txid;
}

/**
 * Execute a crypto trade
 */
async function executeTrade(payload: TradePayload): Promise<{
  success: boolean;
  txid?: string;
  error?: string;
  priceImpact?: string;
}> {
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const positionSizeSol = payload.amountSol || config.trading.crypto.positionSizeSol;
  const slippageBps = payload.slippageBps || 100; // 1%
  
  try {
    if (payload.side === 'buy') {
      // Buy token with SOL
      const amountLamports = Math.floor(positionSizeSol * 1e9);
      console.log(`[CryptoWorker] Getting quote to buy ${payload.token} with ${positionSizeSol} SOL...`);
      
      const quote = await getQuote(SOL_MINT, payload.tokenAddress, amountLamports, slippageBps);
      console.log(`[CryptoWorker] Quote: ${quote.outAmount} tokens, price impact: ${quote.priceImpactPct}%`);
      
      // Check price impact
      const priceImpact = parseFloat(quote.priceImpactPct);
      if (priceImpact > 5) {
        return { success: false, error: `Price impact too high: ${priceImpact}%` };
      }
      
      console.log('[CryptoWorker] Executing swap...');
      const txid = await executeSwap(quote);
      console.log(`[CryptoWorker] ✅ Trade executed: ${txid}`);
      
      return { success: true, txid, priceImpact: quote.priceImpactPct };
      
    } else {
      // Sell token for SOL
      const amountTokens = payload.amountTokens || 0;
      console.log(`[CryptoWorker] Getting quote to sell ${amountTokens} ${payload.token}...`);
      
      const quote = await getQuote(payload.tokenAddress, SOL_MINT, amountTokens, slippageBps);
      console.log(`[CryptoWorker] Quote: ${quote.outAmount} lamports, price impact: ${quote.priceImpactPct}%`);
      
      console.log('[CryptoWorker] Executing swap...');
      const txid = await executeSwap(quote);
      console.log(`[CryptoWorker] ✅ Trade executed: ${txid}`);
      
      return { success: true, txid, priceImpact: quote.priceImpactPct };
    }
  } catch (error) {
    console.error('[CryptoWorker] Trade failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process a single step
 */
async function processStep(step: db.MissionStep): Promise<void> {
  const payload = step.payload as TradePayload;
  console.log(`[CryptoWorker] Processing step ${step.id}: ${payload.side} ${payload.token}`);
  
  try {
    const result = await executeTrade(payload);
    
    if (result.success) {
      await db.completeStep(step.id!, {
        txid: result.txid,
        priceImpact: result.priceImpact,
        executedAt: new Date().toISOString(),
      });
      
      // Create event
      await db.createEvent({
        agent_id: 'scout',
        kind: 'trade_executed',
        title: `Executed ${payload.side} ${payload.token}`,
        summary: `Transaction: ${result.txid}`,
        tags: ['trade', 'crypto', payload.side, payload.token],
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
    console.error(`[CryptoWorker] Step ${step.id} failed:`, errorMsg);
    
    await db.failStep(step.id!, errorMsg);
    consecutiveFailures++;
    
    // Check circuit breaker
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      console.error(`[CryptoWorker] 🔴 Circuit breaker OPEN after ${consecutiveFailures} failures`);
      circuitOpen = true;
      circuitOpenedAt = new Date();
    }
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
      console.log('[CryptoWorker] 🟢 Circuit breaker RESET');
      circuitOpen = false;
      circuitOpenedAt = null;
      consecutiveFailures = 0;
    } else {
      console.log(`[CryptoWorker] Circuit breaker open, waiting ${Math.ceil((CIRCUIT_BREAKER_RESET - timeSinceOpen) / 1000)}s...`);
      return;
    }
  }
  
  try {
    // Get queued execute_trade steps for crypto
    const steps = await db.getQueuedSteps('execute_trade');
    const cryptoSteps = steps.filter(s => 
      s.payload?.market === 'crypto' || 
      s.payload?.tokenAddress || 
      s.payload?.side
    );
    
    for (const step of cryptoSteps) {
      // Atomic claim
      const claimed = await db.claimStep(step.id!, WORKER_ID);
      if (!claimed) {
        console.log(`[CryptoWorker] Step ${step.id} claimed by another worker`);
        continue;
      }
      
      await processStep(step);
      
      // Small delay between trades
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error('[CryptoWorker] Poll loop error:', error);
    consecutiveFailures++;
  }
}

/**
 * Start worker
 */
async function start(): Promise<void> {
  console.log(`[CryptoWorker] Starting worker ${WORKER_ID}...`);
  
  try {
    initialize();
    await db.initDb();
    log.info('Database ready');
  } catch (error) {
    console.error('[CryptoWorker] Initialization failed:', error);
    process.exit(1);
  }
  
  console.log(`[CryptoWorker] Polling every ${POLL_INTERVAL}ms`);
  
  // Initial poll
  await pollLoop();
  
  // Set up interval
  setInterval(pollLoop, POLL_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[CryptoWorker] Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[CryptoWorker] Received SIGINT, shutting down...');
    process.exit(0);
  });
}

// Run if main module
if (require.main === module) {
  start().catch(error => {
    console.error('[CryptoWorker] Fatal error:', error);
    process.exit(1);
  });
}

export { start, executeTrade, processStep };
