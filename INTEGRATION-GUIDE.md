# Playbook System Integration Guide

**How to wire Phase 1 into the existing Cortex Capital agents**

---

## Step 1: Add Expiry Guardian to Server

**File:** `server.ts`

Add near the top with other imports:

```typescript
import { startExpiryGuardianCron } from './agents/expiry-guardian';
```

Add after Fastify server starts (around line 500+):

```typescript
// Start Expiry Guardian (auto-sell dangerous positions)
if (process.env.ENABLE_EXPIRY_GUARDIAN !== 'false') {
  startExpiryGuardianCron();
  server.log.info('[SERVER] Expiry Guardian started (15-min cron)');
}
```

Add to `.env`:

```bash
ENABLE_EXPIRY_GUARDIAN=true
```

---

## Step 2: Update Portfolio Discussion Agent

**File:** `agents/portfolio-discussion.ts`

Add imports:

```typescript
import { classifyPositions, getUnderlyingSymbols } from './position-classifier';
import { getPlaybookContexts, formatContextForAgent } from './playbook-context';
import { getLatestQuote } from '../integrations/alpaca';
```

In the `runPortfolioDiscussion()` function, after fetching positions:

```typescript
// Existing code:
const positions = await getPositions();

// NEW: Classify positions with playbook context
const underlyingSymbols = getUnderlyingSymbols(positions);
const underlyingPrices = new Map<string, number>();

for (const symbol of underlyingSymbols) {
  try {
    const quote = await getLatestQuote(symbol);
    const midPrice = (quote.ask_price + quote.bid_price) / 2;
    underlyingPrices.set(symbol, midPrice);
  } catch (error) {
    console.error(`[PORTFOLIO] Failed to fetch ${symbol} price:`, error);
  }
}

const classified = classifyPositions(positions, underlyingPrices);
const contexts = getPlaybookContexts(classified);

// Log critical positions
const critical = classified.filter(p => p.dte !== undefined && p.dte <= 1);
if (critical.length > 0) {
  console.log(`[PORTFOLIO] ⚠️ ${critical.length} positions expire within 1 day`);
  critical.forEach(p => {
    console.log(`  - ${p.symbol} (DTE: ${p.dte}, P&L: ${p.unrealizedPnlPct.toFixed(1)}%)`);
  });
}

// Continue with existing agent discussion...
```

---

## Step 3: Inject Playbook Context into Agent Prompts

**File:** `agents/analyst.ts`

Update the `analyzePosition()` function:

```typescript
import { classifyPosition } from './position-classifier';
import { getPlaybookContext, formatContextForAgent } from './playbook-context';

export async function analyzePosition(
  symbol: string, 
  position: AlpacaPosition,
  underlyingPrice?: number
) {
  // Classify position
  const classified = classifyPosition(position, underlyingPrice);
  const context = getPlaybookContext(classified);
  
  // Show alerts
  if (classified.alerts.length > 0) {
    console.log(`[ANALYST] Alerts for ${symbol}:`);
    classified.alerts.forEach(alert => console.log(`  ${alert}`));
  }
  
  // Build prompt with playbook context
  const prompt = `
You are analyzing a position with the following context:

${formatContextForAgent(context)}

Current market conditions:
- Symbol: ${symbol}
- Current price: $${classified.currentPrice.toFixed(2)}
- Entry price: $${classified.entryPrice.toFixed(2)}
- P&L: ${classified.unrealizedPnlPct.toFixed(2)}%

Based on the playbook rules above:
1. Is this position following the playbook?
2. Are we approaching any hard stops?
3. Should we take any action (scale out, close, hold)?
4. What are the key risks right now?

Provide your analysis in 2-3 concise bullet points.
`;

  // Call LLM with prompt
  const response = await callLLM(prompt);
  
  return {
    classification: classified,
    context,
    analysis: response,
  };
}
```

---

## Step 4: Update RISK Agent

**File:** `agents/risk.ts` (or wherever risk logic lives)

Add hard stop enforcement:

```typescript
import { classifyPosition } from './position-classifier';
import { getPlaybookContext } from './playbook-context';

export function checkHardStops(position: AlpacaPosition, underlyingPrice?: number) {
  const classified = classifyPosition(position, underlyingPrice);
  const context = getPlaybookContext(classified);
  
  const { hardStop } = context.rules;
  const currentPnL = classified.unrealizedPnlPct;
  
  // Check if at or below hard stop
  if (hardStop !== 0 && currentPnL <= hardStop) {
    return {
      atHardStop: true,
      action: 'CLOSE_IMMEDIATELY',
      reason: `Position at/below hard stop (${currentPnL.toFixed(1)}% vs ${hardStop}% limit)`,
      playbook: classified.playbook,
    };
  }
  
  // Check if approaching hard stop (within 5%)
  if (hardStop !== 0 && currentPnL <= hardStop + 5) {
    return {
      atHardStop: false,
      action: 'WARNING',
      reason: `Position approaching hard stop (${currentPnL.toFixed(1)}% vs ${hardStop}% limit)`,
      playbook: classified.playbook,
    };
  }
  
  return {
    atHardStop: false,
    action: 'HOLD',
    reason: 'Within risk tolerance',
    playbook: classified.playbook,
  };
}
```

---

## Step 5: Update STRATEGIST Agent

**File:** `agents/strategist.ts`

Add scaling exit logic:

```typescript
import { classifyPosition } from './position-classifier';
import { getPlaybookContext } from './playbook-context';

export function calculateScalingExits(position: AlpacaPosition, underlyingPrice?: number) {
  const classified = classifyPosition(position, underlyingPrice);
  const context = getPlaybookContext(classified);
  
  const { scalingExits } = context.rules;
  const currentPnL = classified.unrealizedPnlPct;
  
  // Determine next scaling exit
  for (let i = 0; i < scalingExits.length; i++) {
    const exitThreshold = scalingExits[i];
    
    if (currentPnL >= exitThreshold) {
      // We've hit this threshold
      const nextThreshold = scalingExits[i + 1] ?? null;
      
      return {
        triggered: true,
        threshold: exitThreshold,
        nextThreshold,
        action: `Sell portion at +${exitThreshold}% (playbook: ${classified.playbook})`,
        playbook: classified.playbook,
      };
    }
  }
  
  return {
    triggered: false,
    threshold: null,
    nextThreshold: scalingExits[0] ?? null,
    action: 'Hold - no scaling threshold reached',
    playbook: classified.playbook,
  };
}
```

---

## Step 6: Update EXECUTOR Agent

**File:** `agents/executor.ts`

Add playbook-aware order execution:

```typescript
import { classifyPosition } from './position-classifier';
import { getPlaybookContext } from './playbook-context';

export async function executeScalingExit(
  position: AlpacaPosition,
  underlyingPrice?: number
) {
  const classified = classifyPosition(position, underlyingPrice);
  const context = getPlaybookContext(classified);
  
  const scalingDecision = calculateScalingExits(position, underlyingPrice);
  
  if (!scalingDecision.triggered) {
    console.log(`[EXECUTOR] No scaling exit triggered for ${position.symbol}`);
    return null;
  }
  
  // Determine how much to sell based on playbook
  let sellPercent: number;
  
  switch (scalingDecision.threshold) {
    case 30:
      sellPercent = context.playbook === 'OPTIONS_SCALP' ? 0.33 : 0.25;
      break;
    case 50:
      sellPercent = context.playbook === 'OPTIONS_SCALP' ? 0.50 : 0.33;
      break;
    case 75:
      sellPercent = 0.67;
      break;
    case 100:
      sellPercent = context.playbook === 'OPTIONS_SCALP' ? 1.0 : 0.67;
      break;
    default:
      sellPercent = 0.25;
  }
  
  const qtyToSell = Math.floor(parseFloat(position.qty) * sellPercent);
  
  console.log(`[EXECUTOR] Scaling exit: ${position.symbol}`);
  console.log(`  Playbook: ${context.playbook}`);
  console.log(`  P&L: ${classified.unrealizedPnlPct.toFixed(1)}%`);
  console.log(`  Selling ${sellPercent * 100}% (${qtyToSell} shares/contracts)`);
  
  // Execute the order
  const order = await placeOrder({
    symbol: position.symbol,
    qty: qtyToSell,
    side: 'sell',
    type: 'market',
    time_in_force: 'day',
  });
  
  return order;
}
```

---

## Step 7: Add Playbook Display to Dashboard

**File:** `frontend/src/components/PositionCard.tsx` (or similar)

Add playbook badge:

```typescript
import { classifyPosition } from '../../agents/position-classifier';
import { getPlaybookContext } from '../../agents/playbook-context';

function PositionCard({ position, underlyingPrice }) {
  const classified = classifyPosition(position, underlyingPrice);
  const context = getPlaybookContext(classified);
  
  const playbookColors = {
    OPTIONS_SCALP: 'red',
    OPTIONS_SWING: 'orange',
    OPTIONS_LEAPS: 'blue',
    STOCKS_ACTIVE: 'green',
    STOCKS_LONGTERM: 'purple',
  };
  
  return (
    <div className="position-card">
      <div className="position-header">
        <span className="symbol">{position.symbol}</span>
        <span 
          className="playbook-badge" 
          style={{ backgroundColor: playbookColors[classified.playbook] }}
        >
          {classified.playbook.replace('_', ' ')}
        </span>
        {classified.dte !== undefined && (
          <span className="dte-badge">
            {classified.dte}d
          </span>
        )}
      </div>
      
      {classified.alerts.length > 0 && (
        <div className="alerts">
          {classified.alerts.map((alert, i) => (
            <div key={i} className="alert">{alert}</div>
          ))}
        </div>
      )}
      
      {/* Rest of position card... */}
    </div>
  );
}
```

---

## Step 8: Add Guardian Activity Feed

**File:** `routes/portfolio.ts` (or similar)

Add endpoint to get guardian actions:

```typescript
import fs from 'fs/promises';

// Store guardian actions in a log file
const GUARDIAN_LOG = './logs/expiry-guardian.jsonl';

fastify.get('/api/guardian-activity', async (request, reply) => {
  try {
    const log = await fs.readFile(GUARDIAN_LOG, 'utf-8');
    const lines = log.trim().split('\n');
    const actions = lines.map(line => JSON.parse(line));
    
    // Return last 50 actions
    return actions.slice(-50).reverse();
  } catch (error) {
    return [];
  }
});
```

Update `expiry-guardian.ts` to log actions:

```typescript
import fs from 'fs/promises';

async function logGuardianAction(action: any) {
  const logEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...action,
  }) + '\n';
  
  await fs.appendFile('./logs/expiry-guardian.jsonl', logEntry);
}

// In runExpiryGuardian(), after each action:
await logGuardianAction({
  type: 'EMERGENCY_SELL',
  symbol: symbol,
  reason: 'Rule 1: 0 DTE + OTM + after 2 PM ET',
  pnl: pnlPct,
  dte: dte,
});
```

---

## Step 9: Environment Setup

Update `.env.example`:

```bash
# Alpaca Paper Trading
ALPACA_KEY=your_paper_key_here
ALPACA_SECRET=your_paper_secret_here
ALPACA_PAPER=true

# Expiry Guardian
ENABLE_EXPIRY_GUARDIAN=true
GUARDIAN_LOG_PATH=./logs/expiry-guardian.jsonl
```

---

## Testing the Integration

### 1. Start the server with guardian
```bash
cd /Users/atlasbuilds/clawd/cortex-capital
npm run dev
```

### 2. Check logs
```bash
# Should see:
# [SERVER] Expiry Guardian started (15-min cron)
# [EXPIRY GUARDIAN] Running at 2026-03-27...
```

### 3. Test portfolio discussion
```bash
tsx test-playbook-system.ts
# Should show playbook classifications
```

### 4. Verify guardian catches dangerous positions
```bash
tsx test-expiry-guardian.ts
# Should show which positions would be auto-sold
```

---

## Rollout Plan

### Week 1: Soft Launch
- ✅ Phase 1 complete (classifier + guardian)
- Deploy to staging
- Run guardian in LOG-ONLY mode (no auto-sells)
- Monitor for false positives

### Week 2: Agent Integration
- Wire playbook context into ANALYST/RISK/STRATEGIST
- Test agent discussions with new context
- Verify agents respect playbook rules

### Week 3: Dashboard
- Add playbook badges to position cards
- Show DTE countdown for options
- Display guardian activity feed

### Week 4: Enable Auto-Sells
- Switch guardian to ENFORCE mode
- Start with paper trading only
- Monitor for 1 week before going live

---

## Success Metrics

After 1 month:
- [ ] Zero 0 DTE positions expire worthless (guardian catches them)
- [ ] Hard stops respected 100% of the time
- [ ] Agents reference playbook rules in discussions
- [ ] Users see playbook badges on all positions
- [ ] At least 1 disaster prevented (like SPY $660 call)

---

**Ready to integrate. Ready to prevent disasters.**

— Atlas ⚡
