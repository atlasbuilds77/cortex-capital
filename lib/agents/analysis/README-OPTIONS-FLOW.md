# Options Flow Analysis Engine

## Overview
The Options Flow Analysis engine provides real-time detection of unusual options activity, flow sentiment analysis, and smart money detection for Cortex Capital agents.

## Modules

### 1. `options-flow.ts`
Core module for detecting unusual options activity using Tradier API.

**Key Functions:**
- `getOptionsChainFull(symbol: string)` - Fetch full options chain with Greeks
- `detectUnusualVolume(symbol: string)` - Find strikes with volume > 3x open interest
- `detectLargeBets(symbol: string)` - Find block trades > 100 contracts
- `getFlowSentiment(symbol: string)` - Calculate net call vs put flow sentiment
- `analyzeOptionsFlow(symbol: string)` - Complete flow analysis

**Example:**
```typescript
import { analyzeOptionsFlow } from './options-flow';

const analysis = await analyzeOptionsFlow('AAPL');
console.log('Unusual strikes:', analysis.unusualVolume.length);
console.log('Large bets:', analysis.largeBets.length);
console.log('Sentiment:', analysis.sentiment.sentiment);
```

### 2. `flow-signals.ts`
Convert options flow into actionable trading signals with confidence scores.

**Key Functions:**
- `analyzeFlow(symbol: string)` - Generate flow signal with confidence (0-100)
- `generateFlowSignal(symbol: string)` - Complete signal with metadata
- `analyzeMultipleFlows(symbols: string[])` - Batch analysis
- `filterSignalsByConfidence(signals[], minConfidence)` - Filter high-confidence signals
- `rankSignals(signals[])` - Rank by confidence

**Example:**
```typescript
import { analyzeFlow } from './flow-signals';

const signal = await analyzeFlow('TSLA');
if (signal.confidence > 70) {
  console.log(`High confidence ${signal.sentiment} signal detected`);
  console.log('Unusual strikes:', signal.unusualStrikes.length);
  console.log('Large bets:', signal.largeBets.length);
}
```

### 3. `smart-money-detector.ts`
Identify institutional/smart money activity patterns.

**Key Functions:**
- `detectSmartMoney(symbol: string)` - Main detection function
- `detectSweeps(symbol: string)` - Find aggressive multi-strike orders
- `detectLEAPSAccumulation(symbol: string)` - Detect long-dated options accumulation
- `detectLargeOTMBets(symbol: string)` - Find large out-of-the-money bets
- `detectHedgingActivity(symbol: string)` - Identify potential hedging patterns
- `detectSmartMoneyBatch(symbols: string[])` - Batch detection

**Example:**
```typescript
import { detectSmartMoney } from './smart-money-detector';

const smartMoney = await detectSmartMoney('NVDA');
if (smartMoney.detected) {
  console.log(`Smart money detected: ${smartMoney.type}`);
  console.log(`Confidence: ${smartMoney.confidence}%`);
  console.log('Evidence:', smartMoney.evidence);
}
```

## Integration

### Import from Index
```typescript
import { 
  analyzeFlow, 
  detectSmartMoney,
  getOptionsChainFull 
} from './analysis';

// Or use convenience exports
import { flowAnalysis, smartMoney, optionsFlow } from './analysis';
```

### Environment Variables
Ensure `TRADIER_API_KEY` is set in your environment for API access.

### Error Handling
All functions include retry logic and graceful error handling. Failed analyses return neutral/default values.

## Use Cases

1. **Unusual Activity Alerts** - Detect spikes in options volume
2. **Flow Sentiment** - Gauge market sentiment from options flow
3. **Smart Money Tracking** - Follow institutional positioning
4. **Signal Generation** - Generate high-confidence trading signals
5. **Batch Screening** - Scan multiple symbols for opportunities

## Performance Notes
- API rate limiting: Tradier allows 120 requests/minute
- Batch functions include sequential processing to respect limits
- All functions include exponential backoff retry logic
- Results are cached at the API level (Tradier's caching)

## TypeScript Support
Full TypeScript definitions included for all functions, parameters, and return types.

## Testing
Run the test file to verify exports:
```bash
cd cortex-capital
npx tsx lib/agents/analysis/test-options-flow.ts
```

## Next Steps
1. Add real-time streaming support
2. Integrate with Cortex Capital's alert system
3. Add historical flow analysis
4. Create visualization dashboard
5. Add machine learning pattern recognition