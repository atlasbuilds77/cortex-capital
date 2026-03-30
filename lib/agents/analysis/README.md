# Cortex Capital Technical Analysis Engine

A comprehensive technical analysis library for Cortex Capital trading agents, providing RSI, MACD, Ichimoku Cloud, Bollinger Bands, sector momentum analysis, and automated signal generation.

## Features

### 1. Technical Indicators (`technical-indicators.ts`)
- **RSI (Relative Strength Index)**: 14-period RSI with oversold/overbought signals
- **MACD (Moving Average Convergence Divergence)**: 12/26/9 period MACD with bullish/bearish crossovers
- **Ichimoku Cloud**: Complete Ichimoku Kinko Hyo system with cloud direction analysis
- **Bollinger Bands**: 20-period bands with 2 standard deviations, %B calculation
- **All indicators return**: Signal type, confidence score (0-100), and actionable insights

### 2. Sector Momentum Analysis (`sector-momentum.ts`)
- **10 Major Sectors**: XLK (Tech), XLF (Financials), XLE (Energy), XLV (Healthcare), XLY (Consumer), XLI (Industrials), XLB (Materials), XLU (Utilities), XLRE (Real Estate), XLC (Communications)
- **Relative Strength**: 1-week, 1-month, 3-month performance vs SPY benchmark
- **Momentum Scoring**: Composite score (0-100) with trend classification
- **Ranking & Comparison**: Top/bottom performers, sector rotation analysis

### 3. Signal Generator (`signal-generator.ts`)
- **Multi-Indicator Confirmation**: Combines RSI, MACD, Ichimoku, Bollinger Bands
- **Actionable Signals**: BUY/SELL/HOLD with confidence scores
- **Risk Management**: Stop-loss, take-profit, risk level classification
- **Batch Processing**: Analyze multiple symbols, filter by confidence, rank signals
- **Validation**: Risk parameter validation for institutional compliance

## Installation & Setup

### Prerequisites
- Tradier API key (set as `TRADIER_TOKEN` environment variable)
- Node.js with TypeScript support
- Existing Cortex Capital project structure

### Environment Variables
```bash
TRADIER_TOKEN=your_tradier_api_key_here
TRADIER_BASE_URL=https://api.tradier.com  # or sandbox URL
```

## Usage Examples

### Basic Technical Analysis
```typescript
import { getRSI, getMACD, getIchimoku, getBollinger } from './technical-indicators';

// Get individual indicators
const rsi = await getRSI('AAPL');
const macd = await getMACD('AAPL');
const ichimoku = await getIchimoku('AAPL');
const bollinger = await getBollinger('AAPL');

// Or get all at once
import { calculateAllIndicators } from './technical-indicators';
const allIndicators = await calculateAllIndicators('AAPL');
```

### Sector Analysis
```typescript
import { getSectorMomentum, getTopSectors, getSectorPerformanceSummary } from './sector-momentum';

// Get all sector rankings
const sectors = await getSectorMomentum();

// Get top 3 performing sectors
const topSectors = await getTopSectors(3);

// Get performance summary
const summary = await getSectorPerformanceSummary();
```

### Signal Generation
```typescript
import { generateSignal, generateSignalsForSymbols, rankSignals } from './signal-generator';

// Generate signal for single symbol
const signal = await generateSignal('AAPL');
console.log(`Action: ${signal.signal.action}, Confidence: ${signal.signal.confidence}%`);

// Generate signals for multiple symbols
const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
const signals = await generateSignalsForSymbols(symbols);

// Rank signals by confidence and confirmations
const ranked = rankSignals(signals);
```

### Advanced: Focused Analysis
```typescript
import { generateSignalWithFocus } from './signal-generator';

// RSI-focused analysis (gives more weight to RSI signals)
const rsiFocused = await generateSignalWithFocus('AAPL', 'rsi');

// Sector-focused analysis
const sectorFocused = await generateSignalWithFocus('XLK', 'sector');
```

## API Reference

### Technical Indicators
- `calculateRSI(prices: number[], period = 14): RSIResult`
- `calculateMACD(prices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDResult`
- `calculateIchimoku(prices: PriceData[], conversionPeriod = 9, basePeriod = 26, leadingSpanBPeriod = 52): IchimokuResult`
- `getBollingerBands(prices: number[], period = 20, stdDev = 2): BollingerBandsResult`
- `calculateAllIndicators(symbol: string): Promise<AllIndicatorsResult>`

### Sector Momentum
- `getSectorMomentum(): Promise<SectorMomentum[]>`
- `getTopSectors(count = 3): Promise<SectorMomentum[]>`
- `getBottomSectors(count = 3): Promise<SectorMomentum[]>`
- `getSectorPerformanceSummary(): Promise<PerformanceSummary>`
- `compareSectors(symbol1: string, symbol2: string): Promise<SectorComparison>`

### Signal Generator
- `generateSignal(symbol: string): Promise<SignalAnalysis>`
- `generateSignalWithFocus(symbol: string, focus: IndicatorFocus): Promise<SignalAnalysis>`
- `generateSignalsForSymbols(symbols: string[]): Promise<Record<string, SignalAnalysis>>`
- `filterSignalsByConfidence(signals: Record<string, SignalAnalysis>, minConfidence = 60)`
- `rankSignals(signals: Record<string, SignalAnalysis>): RankedSignal[]`
- `validateSignal(signal: TradingSignal, riskParams: RiskParameters): ValidationResult`

## Integration with Cortex Capital Agents

### Example: Trading Agent Integration
```typescript
import { generateSignal } from './signal-generator';
import { validateSignal } from './signal-generator';

class TradingAgent {
  async analyzeSymbol(symbol: string) {
    // Generate signal
    const analysis = await generateSignal(symbol);
    
    // Validate against risk parameters
    const riskParams = {
      maxRiskPerTrade: 2,
      maxPositionSize: 10000,
      minConfidence: 65,
      allowedTimeFrames: ['swing', 'position']
    };
    
    const validation = validateSignal(analysis.signal, riskParams);
    
    if (validation.valid && analysis.signal.confidence >= 70) {
      // Execute trade logic
      return this.executeTrade(analysis.signal);
    }
    
    return { action: 'HOLD', reason: 'Signal not strong enough' };
  }
}
```

### Example: Portfolio Manager Integration
```typescript
import { getSectorMomentum } from './sector-momentum';
import { generateSignalsForSymbols } from './signal-generator';

class PortfolioManager {
  async rebalancePortfolio() {
    // Get sector momentum to identify strong sectors
    const sectors = await getSectorMomentum();
    const topSectors = sectors.slice(0, 3);
    
    // Generate signals for top sector ETFs
    const sectorSymbols = topSectors.map(s => s.symbol);
    const signals = await generateSignalsForSymbols(sectorSymbols);
    
    // Allocate to strongest signals
    const ranked = rankSignals(signals);
    return this.reallocateBasedOnSignals(ranked);
  }
}
```

## Testing

Run the test suite:
```typescript
import { runAllTests } from './test-analysis';
await runAllTests();
```

Or run individual tests:
```typescript
import { testTechnicalIndicators, testSectorMomentum, testSignalGenerator } from './test-analysis';
await testTechnicalIndicators();
await testSectorMomentum();
await testSignalGenerator();
```

## Production Notes

### Rate Limiting
- Tradier API: 120 requests/minute
- Implement caching for historical data
- Batch requests when possible

### Error Handling
- All functions include try-catch error handling
- Failed analyses return HOLD signals with 0% confidence
- Network errors are retried with exponential backoff

### Performance Optimization
- Historical data is mocked for demonstration
- In production, integrate with dedicated historical data provider
- Consider implementing WebSocket connections for real-time updates

### Risk Management
- Always validate signals against risk parameters
- Use confidence scores for position sizing
- Implement stop-loss and take-profit levels
- Monitor sector correlations to avoid over-concentration

## Future Enhancements

1. **Real Historical Data**: Integrate with Polygon.io, Alpha Vantage, or Yahoo Finance
2. **Additional Indicators**: Add Stochastic, ADX, Parabolic SAR, Fibonacci retracements
3. **Machine Learning**: Train models on indicator combinations for improved signal accuracy
4. **Backtesting Framework**: Historical performance testing of signal strategies
5. **Options Analysis**: Integrate with options chain data for multi-leg strategies
6. **Sentiment Analysis**: Combine with news sentiment and social media data

## License

Part of Cortex Capital trading platform. For internal use only.