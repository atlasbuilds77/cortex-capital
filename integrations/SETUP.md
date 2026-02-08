# Bloomberg Terminal Integration - Setup Guide

**Quick start guide for integrating Bloomberg Terminal into Cortex Capital**

---

## STEP 1: Clone Bloomberg Terminal

```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company

# Clone the repo
git clone https://github.com/feremabraz/bloomberg-terminal.git

# Install dependencies
cd bloomberg-terminal
npm install
```

---

## STEP 2: Get API Keys

### Alpha Vantage (Market Data)
1. Go to: https://www.alphavantage.co/support/#api-key
2. Sign up for free API key
3. Copy key (looks like: `ABC123XYZ789`)

### Upstash Redis (Caching)
1. Go to: https://upstash.com
2. Create account
3. Create Redis database
4. Copy REST URL and Token

### OpenAI (AI Analysis) - Optional
1. Go to: https://platform.openai.com/api-keys
2. Create API key
3. Copy key

---

## STEP 3: Configure Environment

Create `.env.local` in bloomberg-terminal directory:

```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company/bloomberg-terminal

cat > .env.local << 'EOF'
# Upstash Redis (required)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Alpha Vantage (required)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# OpenAI (optional - for AI features)
OPENAI_API_KEY=sk-your_openai_key

# Allowed origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
EOF
```

---

## STEP 4: Test Bloomberg Terminal Standalone

```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company/bloomberg-terminal

# Start development server
npm run dev

# Terminal should be running at http://localhost:3000
# Open in browser to verify it works
```

---

## STEP 5: Add Database Tables

```bash
# Add market context tables to database
psql $DATABASE_URL << 'EOF'
-- Market context for proposals
CREATE TABLE IF NOT EXISTS ops_market_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES ops_trading_proposals(id),
  symbol TEXT NOT NULL,
  price DECIMAL,
  volume BIGINT,
  volatility DECIMAL,
  sentiment DECIMAL,
  news_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News events
CREATE TABLE IF NOT EXISTS ops_news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  source TEXT,
  symbols TEXT[],
  sentiment TEXT,
  impact_score DECIMAL,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_context_proposal 
  ON ops_market_context(proposal_id);
CREATE INDEX IF NOT EXISTS idx_market_context_symbol 
  ON ops_market_context(symbol);
CREATE INDEX IF NOT EXISTS idx_news_symbols 
  ON ops_news_events USING GIN(symbols);
CREATE INDEX IF NOT EXISTS idx_news_published 
  ON ops_news_events(published_at DESC);
EOF
```

---

## STEP 6: Update Cortex Capital Environment

Add to `/Users/atlasbuilds/clawd/autonomous-trading-company/.env.production`:

```bash
# Bloomberg Terminal Integration
BLOOMBERG_API_URL=http://localhost:3000
ALPHA_VANTAGE_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

---

## STEP 7: Test Integration

```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company

# Test Bloomberg Bridge
cat > test-bloomberg.ts << 'EOF'
import { getBloombergBridge } from './integrations/bloomberg-bridge';

async function test() {
  const bridge = getBloombergBridge();
  
  console.log('Testing market data...');
  const quotes = await bridge.getMarketData(['SPY', 'QQQ', 'AAPL']);
  console.log('Quotes:', quotes);
  
  console.log('\nTesting news feed...');
  const news = await bridge.getNewsFeed(5);
  console.log('News:', news);
  
  console.log('\nTesting market movers...');
  const movers = await bridge.getMarketMovers();
  console.log('Movers:', movers);
}

test().catch(console.error);
EOF

# Run test
ts-node test-bloomberg.ts
```

Expected output:
```
Testing market data...
Quotes: [ { symbol: 'SPY', price: 525.32, ... }, ... ]

Testing news feed...
News: [ { title: 'Market opens higher...', ... }, ... ]

Testing market movers...
Movers: { gainers: [...], losers: [...], mostActive: [...] }
```

---

## STEP 8: Wire to Agents (Optional - Can do later)

Update proposal service to use Bloomberg intelligence:

```typescript
// core/proposal-service.ts
import { getTerminalIntelligence } from '../integrations/terminal-intelligence';

async createProposalAndMaybeAutoApprove(...) {
  // Get Bloomberg context
  const intelligence = getTerminalIntelligence();
  const symbol = metadata.symbol || metadata.token;
  
  if (symbol) {
    // Enrich with market data
    const context = await intelligence.enrichAgentContext(agentId, symbol, { proposalId });
    
    // Validate market conditions
    const validation = await intelligence.validateMarketConditions({
      id: proposalId,
      metadata: { ...metadata, symbol },
    });
    
    if (!validation.valid) {
      return {
        success: false,
        error: `Market conditions unfavorable: ${validation.reason}`,
      };
    }
    
    // Add context to metadata
    metadata.bloombergContext = context;
  }
  
  // ... rest of proposal logic
}
```

---

## STEP 9: Add to Dashboard (Optional)

Add terminal tab to dashboard:

```typescript
// dashboard/app/page.tsx

// Add to tabs array
const tabs = [
  { id: 'office', label: '🏢 Office' },
  { id: 'terminal', label: '📊 Terminal' }, // NEW
  { id: 'feed', label: '💬 Feed' },
  // ...
];

// Add to render
{activeTab === 'terminal' && (
  <iframe 
    src="http://localhost:3000" 
    className="w-full h-full border-0"
    title="Bloomberg Terminal"
  />
)}
```

---

## VERIFICATION CHECKLIST

- [ ] Bloomberg Terminal runs standalone
- [ ] API keys configured correctly
- [ ] Database tables created
- [ ] Bloomberg Bridge can fetch quotes
- [ ] News feed working
- [ ] Market movers loading
- [ ] Volatility data available
- [ ] Terminal Intelligence validates conditions
- [ ] (Optional) Dashboard shows terminal tab
- [ ] (Optional) Agents use Bloomberg context

---

## TROUBLESHOOTING

### "API key invalid"
- Check Alpha Vantage key is correct
- Free tier: 25 requests/day limit
- Try premium key if hitting limits

### "Redis connection failed"
- Verify Upstash URL and token
- Check Redis dashboard for errors
- Try creating new database

### "No data returned"
- Bloomberg Terminal might not be running
- Check `npm run dev` in bloomberg-terminal directory
- Verify port 3000 is not in use

### "Market data stale"
- Redis TTL might be too long
- Clear Redis cache: `redis-cli FLUSHDB`
- Check Alpha Vantage API status

---

## COST ESTIMATE

### Free Tier (Testing)
- Alpha Vantage: FREE (25 req/day)
- Upstash Redis: FREE (10K commands/day)
- OpenAI: Pay-as-you-go (~$5-10/day)
**Total:** ~$150-300/month

### Production Tier
- Alpha Vantage Premium: $50/month
- Upstash Redis: ~$10/month
- OpenAI: ~$300/month
**Total:** ~$360/month

---

## NEXT STEPS

1. **Test standalone terminal** - Verify it works
2. **Wire to one agent** - Start with INTEL agent
3. **Monitor performance** - Check API usage
4. **Scale gradually** - Add more agents as confident
5. **Deploy to production** - After staging validation

---

## SUPPORT

**Bloomberg Terminal Issues:**
- GitHub: https://github.com/feremabraz/bloomberg-terminal/issues

**Cortex Capital Integration:**
- Check: `/integrations/BLOOMBERG_TERMINAL_INTEGRATION.md`
- Logs: `utils/logger.ts` output

---

**Setup time:** ~30 minutes  
**Integration time:** ~2 hours  
**Full deployment:** 48 hours  
**Status:** Ready to start ✅
