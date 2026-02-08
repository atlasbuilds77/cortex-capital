# Quick Wins - Fix These First (1-2 Hours)

These are the easiest, highest-impact fixes you can make right now.

---

## 1. Fix Worker Step Claiming Race Condition (15 min)

**File:** `integration/db-adapter.ts:163-171`

**Current:**
```typescript
export async function claimStep(stepId: string, workerId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute(`
    UPDATE ops_mission_steps 
    SET status = 'running', assigned_to = $1, started_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'queued'
  `, [workerId, stepId]);
  
  return result.rowCount > 0;
}
```

**Fixed:**
```typescript
export async function claimStep(stepId: string, workerId: string): Promise<boolean> {
  const db = getDb();
  // Use RETURNING to ensure atomic claim
  const result = await db.queryOne<{ id: string }>(`
    UPDATE ops_mission_steps 
    SET status = 'running', 
        assigned_to = $1, 
        started_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'queued'
    RETURNING id
  `, [workerId, stepId]);
  
  return result !== null;
}
```

**Test:**
```bash
# Start two workers
npm run worker:crypto &
npm run worker:crypto &

# Watch for duplicate claims in logs
grep "claimed" logs/*.log | sort
```

---

## 2. Add Heartbeat Deadlock Protection (10 min)

**File:** `integration/heartbeat.ts:54-60`

**Add before existing `if (this.isRunning)` check:**
```typescript
private readonly MAX_HEARTBEAT_DURATION = 60000; // 60 seconds

async run(): Promise<HeartbeatResult> {
  // Check if stuck
  if (this.isRunning && this.runStartTime) {
    const runDuration = Date.now() - this.runStartTime;
    if (runDuration > this.MAX_HEARTBEAT_DURATION) {
      console.error(`[Heartbeat] DEADLOCK: Stuck for ${runDuration}ms. Forcing reset.`);
      this.isRunning = false;
      this.runStartTime = null;
    }
  }
  
  // ... rest of existing code
}
```

**Test:**
```bash
# Manually trigger heartbeat
npm run heartbeat

# Should complete in <15 seconds
# Check logs for "DEADLOCK" warnings
```

---

## 3. Fix Dashboard Memory Leak (20 min)

**File:** `dashboard/app/page.tsx:18-30`

**Replace the entire `useEffect` with:**
```typescript
const MAX_EVENTS = 100;
const [events, setEvents] = useState<SSEEvent[]>([]);
const eventBufferRef = useRef<SSEEvent[]>([]);
const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  const eventSource = new EventSource('/api/events');
  
  eventSource.onopen = () => {
    console.log('SSE Connected');
    setConnected(true);
  };
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      eventBufferRef.current.push({ ...data, timestamp: Date.now() });
      
      // Batch updates every 500ms
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = setTimeout(() => {
        setEvents(prev => {
          const merged = [...prev, ...eventBufferRef.current];
          eventBufferRef.current = [];
          return merged.slice(-MAX_EVENTS);
        });
      }, 500);
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };
  
  eventSource.onerror = () => {
    console.log('SSE Error - Reconnecting...');
    setConnected(false);
  };
  
  return () => {
    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    eventSource.close();
  };
}, []);
```

**Test:**
```bash
# Open dashboard in Chrome
# Open DevTools → Memory → Take heap snapshot
# Wait 5 minutes
# Take another snapshot
# Compare: Should be roughly same size
```

---

## 4. Add Database Connection Validation (15 min)

**File:** `integration/db-adapter.ts:91-97`

**Replace PostgresDb constructor:**
```typescript
class PostgresDb implements DbClient {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor(connectionString: string) {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString,
      min: config.database.poolMin || 2,
      max: config.database.poolMax || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });
    
    // Test connection on startup
    this.pool.query('SELECT 1')
      .then(() => {
        this.isInitialized = true;
        console.log('[PostgresDb] Connection pool initialized');
      })
      .catch((err: Error) => {
        console.error('[PostgresDb] Failed to connect:', err);
        throw new Error(`Database connection failed: ${err.message}`);
      });
    
    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      console.error('[PostgresDb] Unexpected pool error:', err);
    });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    try {
      const result = await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      console.error('[PostgresDb] Query failed:', sql.substring(0, 100), error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log('[PostgresDb] Draining connection pool...');
    await this.pool.end();
  }
}

// Export shutdown handler
export async function closeDb(): Promise<void> {
  if (_db && 'close' in _db) {
    await (_db as PostgresDb).close();
  }
}
```

**Add to all workers:**
```typescript
import { closeDb } from '../integration/db-adapter';

process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, shutting down...');
  await closeDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT, shutting down...');
  await closeDb();
  process.exit(0);
});
```

**Test:**
```bash
# Start worker
npm run worker:crypto &

# Send SIGTERM
kill -TERM <pid>

# Check logs for "Draining connection pool"
```

---

## 5. Add Health Check Endpoint (10 min)

**File:** `dashboard/app/api/health/route.ts` (create new file)

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/integration/db-adapter';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const db = getDb();
    await db.query('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      services: {
        database: 'up',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'down',
        },
      },
      { status: 503 }
    );
  }
}
```

**Test:**
```bash
# Start dashboard
npm run dashboard

# In another terminal:
curl http://localhost:3000/api/health

# Should return:
# {"status":"healthy","timestamp":"...","services":{"database":"up"}}
```

---

## 6. Add Input Validation (20 min)

**Install zod:**
```bash
npm install zod
```

**File:** `core/proposal-service.ts:37-49`

**Add at top:**
```typescript
import { z } from 'zod';

const ProposalInputSchema = z.object({
  agentId: z.enum(['atlas', 'sage', 'scout', 'growth', 'intel', 'observer']),
  title: z.string().min(1).max(255),
  proposedSteps: z.array(
    z.enum(['execute_trade', 'close_position', 'scale_position', 'analyze_signal', 
            'calculate_risk', 'monitor_position', 'roundtable_conversation'])
  ).min(1),
  metadata: z.record(z.any()).optional(),
});
```

**Update function:**
```typescript
async createProposalAndMaybeAutoApprove(
  agentId: AgentId,
  title: string,
  proposedSteps: StepKind[],
  metadata: Record<string, any> = {}
): Promise<CreateProposalResult> {
  try {
    // Validate inputs
    const validated = ProposalInputSchema.parse({
      agentId,
      title,
      proposedSteps,
      metadata,
    });
    
    // Use validated data
    // ... rest of existing code ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      };
    }
    // ... existing error handling ...
  }
}
```

**Test:**
```typescript
// Should fail
await proposalService.createProposalAndMaybeAutoApprove(
  'invalid_agent' as any,
  '',
  [],
  {}
);

// Should succeed
await proposalService.createProposalAndMaybeAutoApprove(
  'atlas',
  'Test proposal',
  ['execute_trade'],
  { token: 'SOL' }
);
```

---

## 7. Add Retry Logic to Jupiter API (15 min)

**File:** `workers/crypto-worker/index.ts`

**Add helper function:**
```typescript
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
```

**Update getQuote and executeSwap:**
```typescript
async function getQuote(...): Promise<JupiterQuote> {
  const creds = getCredentials();
  const url = `...`;
  
  return apiCallWithRetry(() => 
    httpsRequest(url, {
      method: 'GET',
      headers: { 'x-api-key': creds.jupiter.api_key },
    })
  );
}

async function executeSwap(quote: JupiterQuote): Promise<string> {
  // ... existing code ...
  
  const swapResponse = await apiCallWithRetry(() =>
    httpsRequest('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': creds.jupiter.api_key,
      },
      body: JSON.stringify({ ... }),
    })
  );
  
  // ... rest of code ...
}
```

**Test:**
```bash
# Disconnect internet briefly during trade execution
# Should see retry attempts in logs
# Trade should eventually succeed or fail gracefully
```

---

## Summary

These 7 fixes address the most critical issues and can be done in 1-2 hours:

1. ✅ Fix race condition (15 min) - **CRITICAL**
2. ✅ Add deadlock protection (10 min) - **CRITICAL**
3. ✅ Fix memory leak (20 min) - **CRITICAL**
4. ✅ Add DB validation (15 min) - **CRITICAL**
5. ✅ Add health check (10 min) - **Production requirement**
6. ✅ Add input validation (20 min) - **Security**
7. ✅ Add retry logic (15 min) - **Reliability**

**Total Time:** ~1 hour 45 minutes

After these fixes, the system will be significantly more stable and safe for staging deployment.

---

## Testing After Fixes

```bash
# 1. Build everything
npm run build

# 2. Start database
docker-compose up -d postgres

# 3. Run migrations
psql $DATABASE_URL < database/schema.sql

# 4. Start heartbeat
npm run heartbeat &

# 5. Start workers
npm run worker:crypto &
npm run worker:options &

# 6. Start dashboard
npm run dashboard &

# 7. Monitor logs
tail -f logs/*.log

# 8. Check health
curl http://localhost:3000/api/health

# 9. Simulate load
for i in {1..10}; do npm run heartbeat & done

# 10. Check for race conditions
grep "claimed" logs/*.log | sort | uniq -d
# Should return nothing (no duplicates)
```

---

**Next:** After these quick wins, tackle the remaining P1 issues in `CODE_REVIEW.md`.
