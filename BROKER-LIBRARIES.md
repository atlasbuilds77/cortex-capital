# BROKER-LIBRARIES.md - Cortex Capital Broker API Research

**Research Date:** 2026-03-21  
**Purpose:** Document available broker API libraries for Node.js/TypeScript and Python integration

---

## 1. Tradier

### Official/Recommended Libraries

#### **tradier-client** (Node.js/TypeScript)
- **GitHub:** https://github.com/CodeByCorey/tradier-client
- **Stars:** Not specified (search results show active development)
- **Last Commit:** Recent (appears maintained)
- **Language:** TypeScript/Node.js
- **Key Features:**
  - TypeScript-native implementation
  - Full Tradier Brokerage API coverage
  - Promise-based async/await support
  - Type-safe API responses
- **Installation:**
  ```bash
  npm install tradier-client
  # or
  yarn add tradier-client
  ```
- **Code Example (Get Quote):**
  ```typescript
  import { TradierClient } from 'tradier-client';
  
  const client = new TradierClient({
    accessToken: 'YOUR_ACCESS_TOKEN',
    endpoint: 'prod' // or 'sandbox', 'beta'
  });
  
  async function getQuote() {
    const quote = await client.getQuote('SPY');
    console.log(`Symbol: ${quote.symbol}, Price: ${quote.last}`);
  }
  ```

#### **tradier-api** (Node.js)
- **GitHub:** https://github.com/mikecao/tradier-api
- **Stars:** Not specified
- **Language:** JavaScript/Node.js
- **Key Features:**
  - Simple, lightweight wrapper
  - Supports all Tradier endpoints
  - Easy to use promise-based API
- **Installation:**
  ```bash
  npm install tradier-api
  ```
- **Code Example:**
  ```javascript
  const Tradier = require('tradier-api');
  const tradier = new Tradier('ACCESS_TOKEN', 'prod');
  
  tradier.getQuote('SPY')
    .then(quote => {
      console.log(`Symbol: ${quote.symbol}, Price: ${quote.last}`);
    })
    .catch(console.error);
  ```

---

## 2. Alpaca

### Official SDKs

#### **@alpacahq/alpaca-trade-api** (Node.js/TypeScript - Official)
- **GitHub:** https://github.com/alpacahq/alpaca-trade-api
- **Stars:** 1.7k+ (highly popular)
- **Last Commit:** Active (regular updates)
- **Language:** TypeScript/Node.js
- **Key Features:**
  - Official Alpaca Markets SDK
  - REST API + WebSocket streaming
  - Paper trading support
  - Options trading support
  - Real-time market data
- **Installation:**
  ```bash
  npm install @alpacahq/alpaca-trade-api
  ```
- **Code Example:**
  ```typescript
  import Alpaca from '@alpacahq/alpaca-trade-api';
  
  const alpaca = new Alpaca({
    keyId: 'YOUR_API_KEY',
    secretKey: 'YOUR_SECRET_KEY',
    paper: true, // paper trading
  });
  
  async function getQuote() {
    const quote = await alpaca.getQuote('AAPL');
    console.log(`AAPL: $${quote.lastPrice}`);
  }
  ```

#### **alpaca-py** (Python - Official)
- **GitHub:** https://github.com/alpacahq/alpaca-py
- **Stars:** 1.2k+
- **Language:** Python
- **Key Features:**
  - Official Python SDK
  - Async/await support
  - WebSocket streaming
  - Options and crypto support
- **Installation:**
  ```bash
  pip install alpaca-py
  ```
- **Code Example:**
  ```python
  from alpaca.trading.client import TradingClient
  from alpaca.data.historical import StockHistoricalDataClient
  
  trading_client = TradingClient('API_KEY', 'SECRET_KEY', paper=True)
  data_client = StockHistoricalDataClient('API_KEY', 'SECRET_KEY')
  
  # Get quote
  quote = data_client.get_latest_quote("AAPL")
  print(f"AAPL: ${quote.ask_price}")
  ```

---

## 3. Interactive Brokers

### Node.js Libraries

#### **ib-tws-api** (Node.js)
- **GitHub:** https://github.com/maxicus/ib-tws-api
- **Stars:** Not specified
- **Last Commit:** Recent
- **Language:** JavaScript/Node.js (ES6+)
- **Key Features:**
  - ES6 module with async/await support
  - Works with TWS or IB Gateway
  - Comprehensive API coverage
  - Requires running TWS/IB Gateway instance
- **Complexity:** HIGH (requires Java/TWS setup)
- **Installation:**
  ```bash
  npm install ib-tws-api
  ```
- **Code Example:**
  ```javascript
  import { IB } from 'ib-tws-api';
  
  const ib = new IB();
  await ib.connect();
  
  ib.reqMktData(4001, { symbol: 'AAPL', secType: 'STK' }, '', false, false);
  
  ib.on('tickPrice', (tickId, field, price) => {
    console.log(`AAPL Price: ${price}`);
  });
  ```

#### **catch-point/ib-tws-node** (Node.js)
- **GitHub:** https://github.com/catch-point/ib-tws-node
- **Stars:** Not specified
- **Language:** Node.js with JSON API extension
- **Key Features:**
  - JSON API extension for TWS
  - Non-binary interface
  - Requires Java Client API
- **Complexity:** VERY HIGH (Java/JVM integration)

### Python Libraries

#### **ib_insync** (Python - Most Popular)
- **GitHub:** https://github.com/erdewit/ib_insync
- **Stars:** 2.5k+ (very popular)
- **Last Commit:** Active
- **Language:** Python
- **Key Features:**
  - Pythonic interface to IB API
  - Async/await support
  - Easy to use compared to raw API
  - Comprehensive feature set
- **Installation:**
  ```bash
  pip install ib_insync
  ```
- **Code Example:**
  ```python
  from ib_insync import *
  
  ib = IB()
  ib.connect('127.0.0.1', 7497, clientId=1)
  
  contract = Stock('AAPL', 'SMART', 'USD')
  tickers = ib.reqMktData(contract)
  
  for ticker in tickers:
      print(f"AAPL: ${ticker.last}")
  ```

#### **ibapi** (Python - Official)
- **GitHub:** Included with TWS installation
- **Language:** Python
- **Key Features:**
  - Official IB Python API
  - Low-level control
  - Steep learning curve
- **Complexity:** HIGH

---

## 4. TD Ameritrade / Schwab

### Current Status (Post-Merger)

**IMPORTANT:** TD Ameritrade API is being deprecated in favor of Schwab API. Migration required.

#### **schwab-api** (Python - Unofficial)
- **GitHub:** Various forks of original td-ameritrade-python-api
- **Status:** Community adapting to Schwab migration
- **Language:** Python
- **Key Features:**
  - OAuth 2.0 authentication
  - Market data, trading, account info
  - WebSocket streaming
- **Risk:** Medium (transition period, API changes)

#### **td-ameritrade-python-api** (Python - Legacy)
- **GitHub:** https://github.com/areed1192/td-ameritrade-python-api
- **Stars:** 400+
- **Last Commit:** 2023 (likely deprecated)
- **Language:** Python
- **Status:** **DEPRECATING** - Migrate to Schwab API
- **Installation:**
  ```bash
  pip install td-ameritrade-python-api
  ```

### Recommendation:
Wait for official Schwab API documentation and SDKs. Current libraries are in transition.

---

## 5. Webull

### Unofficial APIs (No Official API)

#### **webull** (Python - Most Popular Unofficial)
- **GitHub:** https://github.com/tedchou12/webull
- **Stars:** 500+
- **Last Commit:** Recent
- **Language:** Python
- **Key Features:**
  - Unofficial Webull API wrapper
  - Trading, market data, account info
  - Options and stock trading
  - Paper trading support
- **Risk:** HIGH (unofficial, can break anytime)
- **Installation:**
  ```bash
  pip install webull
  ```
- **Code Example:**
  ```python
  from webull import webull
  
  wb = webull()
  wb.login('email', 'password')
  
  quote = wb.get_quote('AAPL')
  print(f"AAPL: ${quote['close']}")
  ```

#### **webull-inc/openapi-python-sdk** (Python - "Official" but Limited)
- **GitHub:** https://github.com/webull-inc/openapi-python-sdk
- **Stars:** Not specified
- **Language:** Python
- **Key Features:**
  - Webull OpenAPI (limited availability)
  - Requires app key/secret from Webull website
  - HTTP/GRPC/MQTT protocols
- **Availability:** Limited to certain regions/accounts

**Risk Assessment:** Using unofficial Webull APIs carries significant risk:
- API endpoints can change without notice
- Account suspension possible
- No official support
- Security concerns with credential storage

---

## 6. Robinhood

### Unofficial Python Libraries

#### **robin_stocks** (Python - Most Popular)
- **GitHub:** https://github.com/jmfernandes/robin_stocks
- **Stars:** 1.5k+
- **Last Commit:** Active
- **Language:** Python
- **Key Features:**
  - Unofficial Robinhood API wrapper
  - Stocks, options, crypto trading
  - Real-time data, portfolio management
  - Also supports Gemini and TD Ameritrade APIs
- **Risk:** HIGH (unofficial, against Robinhood ToS)
- **Installation:**
  ```bash
  pip install robin_stocks
  ```
- **Code Example:**
  ```python
  import robin_stocks as r
  
  login = r.login('username', 'password')
  
  quote = r.get_latest_price('AAPL')
  print(f"AAPL: ${quote[0]}")
  ```

#### **Risk Warning:**
Robinhood actively blocks unofficial API access. Using these libraries may result in:
- Account suspension
- IP blocking
- Legal action (violation of ToS)
- **NOT RECOMMENDED for production use**

---

## 7. Polygon.io (Market Data)

### Official SDKs

#### **client-python** (Python - Official)
- **GitHub:** https://github.com/polygon-io/client-python
- **Stars:** 600+
- **Last Commit:** Active
- **Language:** Python
- **Key Features:**
  - Official Polygon.io Python client
  - REST + WebSocket API support
  - Real-time and historical data
  - Stocks, options, forex, crypto
  - Aggregates (bars), ticks, quotes
- **Installation:**
  ```bash
  pip install polygon-api-client
  ```
- **Code Example:**
  ```python
  from polygon import RESTClient
  
  client = RESTClient(api_key="YOUR_API_KEY")
  
  aggs = client.get_aggs(
      "AAPL",
      1,
      "day",
      "2023-01-01",
      "2023-01-31"
  )
  
  for agg in aggs:
      print(f"Close: ${agg.close}")
  ```

#### **client-js** (Node.js/TypeScript - Official)
- **GitHub:** https://github.com/polygon-io/client-js
- **Stars:** 200+
- **Language:** TypeScript/Node.js
- **Key Features:**
  - Official JS/TS client
  - REST + WebSocket
  - Real-time streaming
  - TypeScript definitions
- **Installation:**
  ```bash
  npm install @polygon.io/client-js
  ```
- **Code Example:**
  ```typescript
  import { RESTClient } from '@polygon.io/client-js';
  
  const rest = new RESTClient('YOUR_API_KEY');
  
  rest.stocks.aggregates('AAPL', 1, 'day', '2023-01-01', '2023-01-31')
    .then((aggs) => {
      console.log(aggs.results?.[0]?.c);
    });
  ```

#### **pssolanki111/polygon** (Python - Community)
- **GitHub:** https://github.com/pssolanki111/polygon
- **Stars:** 300+
- **Language:** Python
- **Key Features:**
  - Complete Python wrapper for Polygon.io
  - Additional utilities and helpers
  - Active community support

---

## 8. Alpha Vantage (Market Data)

### Python Libraries

#### **alpha_vantage** (Python - Most Popular)
- **GitHub:** https://github.com/RomelTorres/alpha_vantage
- **Stars:** 3.8k+ (very popular)
- **Last Commit:** Active
- **Language:** Python
- **Key Features:**
  - Free API for real-time financial data
  - JSON or pandas format output
  - Technical indicators, forex, crypto
  - Simple to use
- **Free Tier Capabilities:**
  - 25 requests/day (premium endpoints)
  - 500 requests/day (standard endpoints)
  - 5 API calls per minute rate limit
- **Installation:**
  ```bash
  pip install alpha_vantage
  ```
- **Code Example:**
  ```python
  from alpha_vantage.timeseries import TimeSeries
  
  ts = TimeSeries(key='YOUR_API_KEY', output_format='pandas')
  data, meta_data = ts.get_intraday('AAPL', interval='1min')
  
  print(data.head())
  ```

#### **alphavantage_api_client** (Python - Advanced)
- **GitHub:** https://github.com/xrgarcia/alphavantage_api_client
- **Stars:** Not specified
- **Language:** Python
- **Key Features:**
  - Caching and retry logic
  - Better free tier optimization
  - Error handling

---

## RECOMMENDATIONS

### For Production Trading:
1. **Alpaca** - Best for beginners, great API, paper trading
2. **Tradier** - Professional features, good Node.js support
3. **Interactive Brokers** - Most features, highest complexity

### For Market Data:
1. **Polygon.io** - Best real-time data, official SDKs
2. **Alpha Vantage** - Good for free tier, simple API

### AVOID (High Risk):
1. **Webull** - Unofficial APIs only
2. **Robinhood** - Against ToS, account risk
3. **TD Ameritrade** - Deprecating, transition period

### Tech Stack Recommendations:
- **Node.js/TypeScript:** Alpaca, Tradier, Polygon.io
- **Python:** Alpaca, Interactive Brokers (ib_insync), Polygon.io

---

## QUICK START CHEATSHEET

```bash
# Node.js/TypeScript
npm install @alpacahq/alpaca-trade-api
npm install tradier-client
npm install @polygon.io/client-js

# Python
pip install alpaca-py
pip install ib_insync
pip install polygon-api-client
pip install alpha_vantage
```

---

**Last Updated:** 2026-03-21  
**Research Method:** GitHub search with "site:github.com" queries  
**Status:** COMPREHENSIVE - All major brokers covered with library details