# CORTEX CAPITAL - ONBOARDING SYSTEM QUICK START

**Get up and running in 5 minutes** ⚡

---

## 1. RUN DATABASE MIGRATION

```bash
cd /Users/atlasbuilds/clawd/cortex-capital

# Review the migration first
cat migrations/005_preferences.sql

# Run it (adjust connection string)
psql $DATABASE_URL -f migrations/005_preferences.sql
```

**Expected output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
NOTICE:  Phase 4 migration completed successfully.
```

---

## 2. TEST THE SYSTEM

```bash
# Install dependencies (if not already)
npm install

# Run the onboarding test
npx tsx test-onboarding.ts
```

**Expected output:**
```
🚀 CORTEX CAPITAL - ONBOARDING SYSTEM TEST

=== STEP 1: Basic Info ===
✅ Basic info submitted

=== STEP 2: Risk Assessment ===
✅ Risk profile: aggressive

...

📊 ANALYSIS RESULTS:

RIVN ✅ APPROVED
  Quality Score: 65/100
  Market Cap: $50.0B
  Avg Volume: 5.0M shares
  Options: Available
  LEAPS: Yes
  💡 Alternatives: TSLA, F, GM, LCID

...

📊 PORTFOLIO COMPARISON

==================================================
SCOUT - $49/month
==================================================
Expected Return: 7%
Expected Volatility: 12%
...

🎉 ONBOARDING TEST COMPLETE!
```

---

## 3. VERIFY DATABASE

```bash
psql $DATABASE_URL

# Check tables exist
\dt user_custom_stocks
\dt user_exclusions
\dt onboarding_progress
\dt stock_analysis_cache
\dt portfolio_templates

# Check sample data
SELECT * FROM portfolio_templates;
```

**Should see:** 4 pre-built templates (Conservative Growth, Tech & Healthcare, etc.)

---

## 4. INTEGRATION POINTS

### A. Stock Analyzer (Real API)

Edit `lib/stock-analyzer.ts`:

```typescript
// Replace mock data with real API calls
export async function analyzeStock(symbol: string): Promise<StockAnalysis> {
  // Call Tradier API for quotes
  const quote = await tradierAPI.getQuote(symbol);
  
  // Call financial data provider for fundamentals
  const fundamentals = await financialAPI.getFundamentals(symbol);
  
  // Call Tradier for options chains
  const options = await tradierAPI.getOptionsChain(symbol);
  
  // Calculate quality score
  const quality_score = calculateQualityScore(quote, fundamentals, options);
  
  return {
    symbol,
    quality_score,
    investable: quality_score >= 40,
    fundamentals: fundamentals,
    liquidity: {
      avg_volume: quote.volume,
      bid_ask_spread: quote.ask - quote.bid,
      tradeable: true,
    },
    options: {
      available: options.length > 0,
      has_weeklies: options.some(o => isWeekly(o)),
      has_leaps: options.some(o => isLEAP(o)),
      open_interest: sumOpenInterest(options),
    },
    warnings: generateWarnings(quote, fundamentals),
    alternatives: findAlternatives(symbol),
  };
}
```

### B. Stripe Integration (Step 12)

Edit `services/onboarding-flow.ts`:

```typescript
async processPayment(stripeToken: string, tier: 'scout' | 'operator' | 'partner') {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Create customer
  const customer = await stripe.customers.create({
    email: this.progress.step_data.basic_info?.email,
    source: stripeToken,
  });
  
  // Price IDs (from Stripe dashboard)
  const priceIds = {
    scout: 'price_scout_49',
    operator: 'price_operator_99',
    partner: 'price_partner_249',
  };
  
  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceIds[tier] }],
  });
  
  return {
    success: true,
    subscription_id: subscription.id,
  };
}
```

### C. Tradier OAuth (Step 13)

Edit `services/onboarding-flow.ts`:

```typescript
async connectBroker(broker: 'tradier', authCode: string) {
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.tradier.com/v1/oauth/accesstoken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: process.env.TRADIER_CLIENT_ID,
      client_secret: process.env.TRADIER_CLIENT_SECRET,
    }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Fetch account info
  const accountResponse = await fetch('https://api.tradier.com/v1/user/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  const { profile } = await accountResponse.json();
  
  // Store encrypted credentials
  await storeCredentials(userId, broker, {
    access_token,
    account_id: profile.account.account_number,
  });
  
  return {
    success: true,
    account_id: profile.account.account_number,
  };
}
```

---

## 5. FRONTEND IMPLEMENTATION

### A. Onboarding Wizard Component

```tsx
import { OnboardingService } from './services/onboarding-flow';

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [onboarding] = useState(() => new OnboardingService(userId));
  
  return (
    <WizardContainer>
      {step === 1 && <BasicInfoStep onNext={handleBasicInfo} />}
      {step === 2 && <RiskAssessmentStep onNext={handleRiskAssessment} />}
      {step === 3 && <GoalsTimelineStep onNext={handleGoals} />}
      {step === 4 && <SectorInterestsStep onNext={handleSectors} />}
      {step === 5 && <ThemePreferencesStep onNext={handleThemes} />}
      {step === 6 && <CustomStocksStep onNext={handleCustomStocks} />}
      {step === 7 && <ExclusionsStep onNext={handleExclusions} />}
      {step === 8 && <IncomePreferencesStep onNext={handleIncome} />}
      {step === 9 && <OptionsComfortStep onNext={handleOptions} />}
      {step === 10 && <PortfolioPreviewStep onNext={handlePreview} />}
      {step === 11 && <TierSelectionStep onNext={handleTierSelection} />}
      {step === 12 && <PaymentStep onNext={handlePayment} />}
      {step === 13 && <BrokerConnectionStep onNext={handleBroker} />}
    </WizardContainer>
  );
}
```

### B. Custom Stock Picker

```tsx
import { analyzeStock } from './lib/stock-analyzer';

export function CustomStockPicker() {
  const [picks, setPicks] = useState<string[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  
  async function handleAddStock(symbol: string) {
    const analysis = await analyzeStock(symbol);
    
    setAnalyses(prev => ({ ...prev, [symbol]: analysis }));
    
    if (analysis.investable) {
      setPicks(prev => [...prev, symbol]);
    } else {
      // Show warning modal
      showWarningModal(analysis);
    }
  }
  
  return (
    <div>
      <StockAutocomplete onSelect={handleAddStock} />
      
      {picks.map(symbol => (
        <StockCard key={symbol} analysis={analyses[symbol]} />
      ))}
    </div>
  );
}

function StockCard({ analysis }) {
  const tier = getQualityTier(analysis.quality_score);
  
  return (
    <div className={`stock-card tier-${tier.tier}`}>
      <div className="header">
        <h3>{analysis.symbol}</h3>
        <QualityBadge tier={tier} score={analysis.quality_score} />
      </div>
      
      <div className="metrics">
        <Metric label="Market Cap" value={formatMarketCap(analysis.fundamentals.market_cap)} />
        <Metric label="Volume" value={formatVolume(analysis.liquidity.avg_volume)} />
        <Metric label="Options" value={analysis.options.available ? 'Yes' : 'No'} />
      </div>
      
      {analysis.warnings.length > 0 && (
        <WarningsList warnings={analysis.warnings} />
      )}
      
      {analysis.alternatives.length > 0 && (
        <Alternatives symbols={analysis.alternatives} />
      )}
    </div>
  );
}
```

### C. Portfolio Preview

```tsx
import { buildPortfolio } from './lib/portfolio-builder';

export function PortfolioPreview({ preferences }) {
  const [portfolios, setPortfolios] = useState<any>(null);
  
  useEffect(() => {
    async function loadPreviews() {
      const [scout, operator, partner] = await Promise.all([
        buildPortfolio(preferences, 'scout'),
        buildPortfolio(preferences, 'operator'),
        buildPortfolio(preferences, 'partner'),
      ]);
      
      setPortfolios({ scout, operator, partner });
    }
    
    loadPreviews();
  }, [preferences]);
  
  if (!portfolios) return <Loading />;
  
  return (
    <div className="portfolio-comparison">
      <TierCard tier="scout" portfolio={portfolios.scout} price={49} />
      <TierCard tier="operator" portfolio={portfolios.operator} price={99} />
      <TierCard tier="partner" portfolio={portfolios.partner} price={249} />
    </div>
  );
}

function TierCard({ tier, portfolio, price }) {
  return (
    <div className={`tier-card tier-${tier}`}>
      <h2>{tier.toUpperCase()}</h2>
      <div className="price">${price}/month</div>
      
      <div className="metrics">
        <Metric label="Expected Return" value={`${portfolio.expected_return}%`} />
        <Metric label="Volatility" value={`${portfolio.expected_volatility}%`} />
        <Metric label="Sharpe Ratio" value={portfolio.sharpe_ratio} />
      </div>
      
      <AllocationChart allocations={portfolio.allocations} />
      
      <button onClick={() => selectTier(tier)}>Select {tier}</button>
    </div>
  );
}
```

---

## 6. ENVIRONMENT VARIABLES

Create `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cortex_capital

# Tradier
TRADIER_API_KEY=your_key_here
TRADIER_CLIENT_ID=your_client_id
TRADIER_CLIENT_SECRET=your_client_secret
TRADIER_REDIRECT_URI=https://yourapp.com/oauth/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Financial Data Provider (e.g., Alpha Vantage)
FINANCIAL_API_KEY=your_key_here

# App
NODE_ENV=production
PORT=3000
```

---

## 7. DEPLOYMENT

```bash
# Build
npm run build

# Run migration
npm run migrate

# Start server
npm start

# Monitor logs
pm2 logs cortex-capital
```

---

## 8. MONITORING

Set up alerts for:

- [ ] Onboarding conversion rate < 30%
- [ ] Stock analysis failures > 5%
- [ ] Portfolio generation errors
- [ ] Payment failures
- [ ] Broker connection failures

---

## THAT'S IT!

Your personalized onboarding system is ready to go ⚡

**Next:** Build the frontend and start onboarding users!

---

**Questions?** Read the full docs:
- `ONBOARDING-SYSTEM.md` - Complete documentation
- `ONBOARDING-SUMMARY.md` - High-level overview
