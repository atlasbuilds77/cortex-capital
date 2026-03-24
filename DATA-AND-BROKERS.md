# CORTEX CAPITAL - DATA SOURCES & BROKER INTEGRATIONS

**Last Updated:** 2026-03-21  
**Status:** Research Complete - Ready for Implementation

---

## PART 1: DATA SOURCES

### 1. Real-time Quotes

| Provider | Cost | Features | Latency | Best For |
|----------|------|----------|---------|----------|
| **Tradier** | $0.10/1000 quotes (Pro plan) | Real-time quotes, options chains with Greeks/IV (via ORATS), streaming WebSocket | <100ms | Production trading, options focus |
| **Polygon.io** | $199+/month (Starter) | Real-time NBBO, aggregates, historical tick data | <50ms | High-frequency, institutional |
| **Alpha Vantage** | Free tier + $49.99/month (Premium) | Free JSON APIs, 50+ technical indicators, global markets | 1-5 min delay | Development, testing, small scale |
| **Finnhub** | Free tier + $50/month (Startup) | Real-time quotes, forex, crypto, news sentiment | <100ms | Multi-asset, news integration |
| **Massive** | Custom pricing | Ultra-low latency, institutional grade | <10ms | High-frequency trading |

**RECOMMENDATION:** Start with **Tradier** (already integrated) for production, use **Alpha Vantage** free tier for development/testing.

### 2. Options Chains

| Provider | Greeks/IV | Chains | Real-time | Cost |
|----------|-----------|--------|-----------|------|
| **Tradier** | ✅ (via ORATS) | Full chains | ✅ | Included with API |
| **ORATS** | ✅ (specialized) | Advanced analytics | ✅ | $99+/month |
| **Polygon.io** | Limited | Basic chains | ✅ | $199+/month |
| **Alpha Vantage** | ❌ | Basic chains | ❌ (delayed) | Free tier available |

**RECOMMENDATION:** **Tradier** provides sufficient options data with Greeks/IV included.

### 3. Fundamentals

| Provider | Earnings | PE Ratios | Sector Data | Financials |
|----------|----------|-----------|-------------|------------|
| **Alpha Vantage** | ✅ | ✅ | ✅ | Basic |
| **Finnhub** | ✅ | ✅ | ✅ | Detailed |
| **EODHD** | ✅ | ✅ | ✅ | Comprehensive |
| **Intrinio** | ✅ | ✅ | ✅ | Institutional |

**RECOMMENDATION:** **Alpha Vantage** for basic needs, **Finnhub** for more detailed analysis.

### 4. Technical Indicators

| Approach | Pros | Cons | Implementation |
|----------|------|------|----------------|
| **Calculate locally** | Free, customizable | Requires historical data, compute resources | Python (TA-Lib, pandas) |
| **API-based** | Real-time, maintained | Cost, rate limits | Alpha Vantage (50+ indicators) |
| **Hybrid** | Balance of cost/control | More complex | Calculate common indicators, API for complex ones |

**RECOMMENDATION:** **Hybrid approach** - Calculate RSI, MACD, moving averages locally; use API for specialized indicators.

### 5. Sector ETF Data

| Provider | ETFs Covered | Real-time | Historical | Cost |
|----------|--------------|-----------|------------|------|
| **Tradier** | ✅ (all US ETFs) | ✅ | ✅ | Included |
| **Alpha Vantage** | ✅ | ❌ (delayed) | ✅ | Free tier |
| **Polygon.io** | ✅ | ✅ | ✅ | $199+/month |

**RECOMMENDATION:** **Tradier** for real-time ETF data.

### 6. News/Sentiment

| Provider | Real-time News | Sentiment Scores | Sources | Cost |
|----------|----------------|------------------|---------|------|
| **Finnhub** | ✅ | ✅ (AI-powered) | 100+ sources | $50+/month |
| **Alpha Vantage** | ✅ | ✅ (ML-based) | Global | Premium: $49.99/month |
| **EODHD** | ✅ | ✅ | Financial portals | $19.99+/month |
| **Intrinio** | ✅ | ✅ | Institutional | $150+/month |

**RECOMMENDATION:** **Finnhub** for comprehensive news sentiment analysis.

---

## PART 2: BROKER INTEGRATIONS

### 1. Tradier (Already Integrated)

**API Availability:** ✅ Full REST API + WebSocket streaming  
**Options Trading Support:** ✅ Full options chain, Greeks/IV via ORATS  
**Commission Structure:** $0.10/contract (options), $0.01/share (stocks, min $1)  
**Paper Trading Support:** ✅ Sandbox environment available  
**OAuth Flow:** ✅ OAuth 2.0 for client connection  
**Notes:** Already implemented in Cortex Capital, provides both market data and execution.

### 2. Alpaca

**API Availability:** ✅ REST API + WebSocket, developer-first  
**Options Trading Support:** ✅ "Launching soon" (as of 2026), paper trading available  
**Commission Structure:** Commission-free for stocks/options via API  
**Paper Trading Support:** ✅ Free real-time simulation environment  
**OAuth Flow:** ✅ OAuth 2.0 with scopes  
**Notes:** Best for algorithmic trading, strong developer ecosystem, free paper trading with real-time data.

### 3. Interactive Brokers (TWS API)

**API Availability:** ✅ C++, C#, Java, Python, ActiveX, RTD, DDE  
**Options Trading Support:** ✅ Full options trading capabilities  
**Commission Structure:** Tiered: $0.65/contract (options), $0.0035/share (stocks)  
**Paper Trading Support:** ✅ Demo accounts available  
**OAuth Flow:** ❌ Requires TWS/Gateway installation, socket connection  
**Notes:** Most comprehensive professional platform, complex setup, requires running TWS/IB Gateway.

### 4. Webull

**API Availability:** ✅ OpenAPI with Java/Python SDKs  
**Options Trading Support:** ✅ Full options trading  
**Commission Structure:** $0 commission for stocks/options  
**Paper Trading Support:** ✅ Paper trading available  
**OAuth Flow:** ✅ OAuth 2.0 authentication  
**Notes:** Global rollout Q1 2026, good for retail-focused copy trading.

### 5. TD Ameritrade/Schwab

**API Availability:** ❌ TD Ameritrade API discontinued (2024)  
**Options Trading Support:** N/A  
**Commission Structure:** N/A  
**Paper Trading Support:** N/A  
**OAuth Flow:** N/A  
**Notes:** TD Ameritrade API no longer available post-Schwab merger. Schwab Trader API exists but limited documentation/access.

### 6. Robinhood

**API Availability:** ✅ Crypto Trading API only (2026)  
**Options Trading Support:** ❌ No official options API  
**Commission Structure:** $0 commission  
**Paper Trading Support:** ❌ No paper trading API  
**OAuth Flow:** ✅ OAuth 2.0 for crypto only  
**Notes:** Limited to cryptocurrency trading via API, not suitable for stock/options automation.

---

## PART 3: EXECUTION FLOW

### Client Onboarding & Trading Pipeline

```
1. CLIENT SIGNUP
   │
   ├── Website registration
   ├── KYC verification
   ├── Risk assessment questionnaire
   │
2. BROKER CONNECTION
   │
   ├── OAuth 2.0 flow to broker
   ├── Token storage (encrypted)
   ├── Account validation
   ├── Paper trading mode (optional)
   │
3. ANALYSIS ENGINE
   │
   ├── Real-time data ingestion (Tradier/Alpha Vantage)
   ├── Technical analysis (local calculation + API)
   ├── Sentiment analysis (Finnhub/Alpha Vantage)
   ├── Risk scoring per client
   │
4. RECOMMENDATION GENERATION
   │
   ├── Trade signals from Helios/Nebula algos
   ├── Position sizing based on risk profile
   ├── Entry/exit targets with stop-loss
   ├── Confidence scoring (0-100%)
   │
5. CLIENT APPROVAL
   │
   ├── Push notification (mobile/app)
   ├── Trade details + rationale
   ├── One-click approve/reject
   ├── Timeout (e.g., 5 minutes)
   │
6. EXECUTION
   │
   ├── Order routing to broker API
   ├── Real-time execution monitoring
   ├── Fill confirmation + slippage report
   ├── Portfolio update
   │
7. POST-TRADE
   │
   ├── Performance tracking
   ├── Commission reporting
   ├── Tax lot management
   └── Client reporting (daily/weekly)
```

### OAuth Implementation Flow

```
Client → Cortex Capital → Broker OAuth → Redirect → Token Exchange → Secure Storage

1. Client initiates connection from Cortex dashboard
2. Redirect to broker OAuth authorization page
3. Client authenticates with broker credentials
4. Broker redirects back with authorization code
5. Cortex exchanges code for access/refresh tokens
6. Tokens stored encrypted with client-specific key
7. Periodic token refresh (automated)
8. Revocation capability (client-initiated)
```

### Risk Management Integration

```
Pre-Trade:
├── Position size limits (per client)
├── Daily loss limits
├── Sector concentration limits
├── Maximum options exposure

Real-time:
├── Margin monitoring
├── Portfolio stress testing
├── Correlation analysis
├── Market condition adjustments

Post-Trade:
├── Performance attribution
├── Risk-adjusted returns
├── Drawdown analysis
├── Strategy optimization
```

---

## IMPLEMENTATION PRIORITIES

### Phase 1 (Week 1-2): Foundation
1. **Tradier integration** (already done) - enhance with full options support
2. **Alpha Vantage** free tier for development/testing
3. **Basic OAuth flow** prototype with Alpaca (simplest implementation)

### Phase 2 (Week 3-4): Core Features
1. **Finnhub integration** for news sentiment
2. **Local technical indicator calculation** (TA-Lib)
3. **Client approval workflow** (notification + one-click)
4. **Paper trading mode** with Alpaca

### Phase 3 (Week 5-6): Scaling
1. **Multi-broker support** (Alpaca + Webull)
2. **Advanced risk management**
3. **Performance analytics dashboard**
4. **Automated reporting**

### Phase 4 (Week 7-8): Optimization
1. **Interactive Brokers integration** (professional clients)
2. **High-frequency data optimization**
3. **Machine learning signal enhancement**
4. **API rate limit management**

---

## COST STRUCTURE

### Monthly Data Costs (Estimated)
- **Tradier Pro:** $100/month (10M quotes + options data)
- **Finnhub Startup:** $50/month (news sentiment + basic data)
- **Alpha Vantage Premium:** $49.99/month (backup + indicators)
- **Total:** ~$200/month for production data

### Broker Commission Models
- **Tradier:** $0.10/contract, $0.01/share (min $1)
- **Alpaca:** Commission-free via API
- **Webull:** Commission-free
- **IBKR:** $0.65/contract, $0.0035/share

**RECOMMENDATION:** Start clients on **Alpaca** (commission-free), offer **Tradier** for advanced options traders.

---

## SECURITY CONSIDERATIONS

### Critical Requirements
1. **Token encryption** at rest (AES-256)
2. **Secure key management** (HSM or cloud KMS)
3. **API rate limiting** per client
4. **Audit logging** of all trades/actions
5. **SOC 2 compliance** for financial data

### OAuth Security
- Short-lived access tokens (1 hour)
- Secure refresh token storage
- Token revocation endpoints
- IP whitelisting for API calls
- Webhook validation for broker notifications

---

## MONITORING & ALERTS

### System Health
- API uptime monitoring (Pingdom/UptimeRobot)
- Rate limit tracking (90% threshold alerts)
- Data latency monitoring (<100ms target)
- Error rate tracking (<1% target)

### Trading Operations
- Order execution time (<500ms)
- Fill rate monitoring (>95% target)
- Slippage tracking (vs. expected price)
- Failed order alerts (immediate notification)

### Financial Monitoring
- Daily P&L per client
- Risk limit breaches (immediate)
- Margin utilization (>80% alert)
- Concentration warnings (>20% single position)

---

## NEXT STEPS

1. **Immediate:** Document current Tradier integration in codebase
2. **Week 1:** Implement Alpha Vantage free tier for development
3. **Week 2:** Build OAuth prototype with Alpaca paper trading
4. **Week 3:** Integrate Finnhub for news sentiment analysis
5. **Week 4:** Develop client approval workflow MVP

**Key Decision:** Focus on **Alpaca + Tradier** as primary brokers, with **Alpha Vantage + Finnhub** for data. This provides commission-free trading for clients while maintaining professional options capabilities.

---

*Document generated by Cortex Capital Research Team - 2026-03-21*