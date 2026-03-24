# Claw3D Integration Examples

**How to add activity tracking to Cortex Capital agents**

---

## Setup

1. **Enable in `.env`:**

```env
CLAW3D_ENABLED=true
CLAW3D_ENDPOINT=http://localhost:3000/api/cortex/activity
```

2. **Import helpers:**

```typescript
import {
  notifyAnalystActivity,
  notifyStrategistActivity,
  notifyExecutorActivity,
  notifyReporterActivity,
  notifyOptionsStrategistActivity,
  notifyDayTraderActivity,
  notifyMomentumActivity,
} from '../lib/claw3d-integration';
```

---

## Agent Examples

### ANALYST

**File:** `agents/analyst.ts`

```typescript
// Before analysis
await notifyAnalystActivity(
  `Analyzing portfolio for ${userId}`,
  { userId }
);

// Perform analysis...
const report = await analyzePortfolio(userId);

// After analysis
await notifyAnalystActivity(
  `Portfolio health: ${report.portfolio_health}/100`,
  { userId, health: report.portfolio_health }
);
```

---

### STRATEGIST

**File:** `agents/strategist.ts`

```typescript
// Strategy generation
await notifyStrategistActivity(
  `Generating strategy for ${ticker}`,
  { ticker }
);

const strategy = await generateStrategy(ticker);

await notifyStrategistActivity(
  `Strategy: ${strategy.recommendation} ${ticker}`,
  { ticker, recommendation: strategy.recommendation }
);
```

---

### EXECUTOR

**File:** `agents/executor.ts`

```typescript
// Before order
await notifyExecutorActivity(
  `Placing ${order.side} order for ${order.ticker}`,
  order.side,
  order.ticker
);

// Execute...
const result = await placeOrder(order);

// After order
await notifyExecutorActivity(
  `${order.side} ${order.quantity} ${order.ticker} @ ${result.fill_price}`,
  order.side,
  order.ticker
);
```

---

### REPORTER

**File:** `agents/reporter.ts`

```typescript
// Before report
await notifyReporterActivity(
  `Generating ${reportType} report`,
  reportType
);

const report = await generateReport(reportType);

// After report
await notifyReporterActivity(
  `${reportType} report sent to ${recipientCount} users`,
  reportType
);
```

---

### OPTIONS_STRATEGIST

**File:** `agents/options-strategist.ts`

```typescript
// Analyzing Greeks
await notifyOptionsStrategistActivity(
  `Calculating Greeks for ${ticker}`,
  ticker
);

const greeks = await calculateGreeks(ticker);

await notifyOptionsStrategistActivity(
  `${ticker} Delta: ${greeks.delta.toFixed(2)}`,
  ticker
);
```

---

### DAY_TRADER

**File:** `agents/day-trader.ts`

```typescript
// Monitoring momentum
await notifyDayTraderActivity(
  `Scanning momentum in ${sector} sector`,
  { sector }
);

const signals = await scanMomentum(sector);

await notifyDayTraderActivity(
  `Found ${signals.length} momentum signals`,
  { sector, signalCount: signals.length }
);
```

---

### MOMENTUM

**File:** `agents/momentum.ts`

```typescript
// Sector rotation
await notifyMomentumActivity(
  `Tracking relative strength in ${sector}`,
  { sector }
);

const leaders = await findSectorLeaders(sector);

await notifyMomentumActivity(
  `${sector} leaders: ${leaders.join(', ')}`,
  { sector, leaders }
);
```

---

## Best Practices

### 1. Notify at Key Moments

```typescript
// ✅ Good
await notifyActivity("Starting analysis");
// ... work ...
await notifyActivity("Analysis complete");

// ❌ Too much
await notifyActivity("Fetching data");
await notifyActivity("Parsing data");
await notifyActivity("Calculating metrics");
// ... spammy
```

### 2. Include Relevant Metadata

```typescript
// ✅ Good
await notifyExecutorActivity(
  "Placed BUY order for AAPL",
  "BUY",
  "AAPL"
);

// ❌ Missing context
await notifyExecutorActivity("Order placed");
```

### 3. Set Back to Idle

```typescript
import { sendToClaw3D } from '../lib/claw3d-integration';

// After work is done
await sendToClaw3D("ANALYST", "idle", "Standing by");
```

### 4. Handle Errors

```typescript
try {
  await notifyAnalystActivity("Starting analysis");
  const result = await analyze();
  await notifyAnalystActivity("Analysis complete");
} catch (error) {
  // Don't let Claw3D notifications crash trading logic
  console.error("Claw3D notification failed:", error);
}
```

---

## Integration Points

### Server Startup

**File:** `server.ts`

```typescript
import { configureClaw3D, isClaw3DEnabled } from './lib/claw3d-integration';

// Configure on startup
configureClaw3D({
  enabled: process.env.CLAW3D_ENABLED === 'true',
  endpoint: process.env.CLAW3D_ENDPOINT || 'http://localhost:3000/api/cortex/activity',
});

if (isClaw3DEnabled()) {
  console.log('[Claw3D] Integration enabled');
}
```

### Trade Execution Flow

```typescript
// 1. Strategist recommends
await notifyStrategistActivity("Recommending BUY AAPL");

// 2. Executor validates
await notifyExecutorActivity("Validating order", "BUY", "AAPL");

// 3. Executor places
await notifyExecutorActivity("Placing order", "BUY", "AAPL");

// 4. Reporter notifies user
await notifyReporterActivity("Sending trade confirmation");

// 5. Analyst updates metrics
await notifyAnalystActivity("Updating portfolio metrics");
```

### Weekly Report Flow

```typescript
// 1. Analyst gathers metrics
await notifyAnalystActivity("Gathering weekly metrics");

// 2. Strategist reviews performance
await notifyStrategistActivity("Reviewing weekly performance");

// 3. Reporter generates summary
await notifyReporterActivity("Generating weekly report", "weekly");

// 4. Reporter sends
await notifyReporterActivity("Sending weekly report to users", "weekly");
```

---

## Testing

### Manual Test

```bash
# Start Claw3D
cd /Users/atlasbuilds/clawd/cortex-fishtank
npm run dev

# In another terminal, test webhook
curl -X POST http://localhost:3000/api/cortex/activity \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": '"$(date +%s000)"',
    "agentRole": "ANALYST",
    "activityType": "analyzing",
    "description": "Testing integration"
  }'
```

### Verify in Browser

1. Open http://localhost:3000
2. Navigate to office view
3. Watch ANALYST agent turn blue (working state)
4. Check browser console for activity logs

---

## Quick Reference

| Agent | Helper Function | Common Activities |
|-------|----------------|-------------------|
| Analyst | `notifyAnalystActivity()` | Portfolio analysis, risk metrics |
| Strategist | `notifyStrategistActivity()` | Strategy generation, recommendations |
| Executor | `notifyExecutorActivity()` | Order placement, execution |
| Reporter | `notifyReporterActivity()` | Reports, notifications, emails |
| Options Strategist | `notifyOptionsStrategistActivity()` | Greeks, options analysis |
| Day Trader | `notifyDayTraderActivity()` | Intraday momentum, quick trades |
| Momentum | `notifyMomentumActivity()` | Sector rotation, relative strength |

---

**Next Step:** Add these notification calls to your agent implementations, then watch them light up in Claw3D! 🔥
