/**
 * ROBINHOOD INTEGRATION
 * Uses robin_stocks Python library via child_process
 * 
 * Install: pip3 install robin-stocks
 * Docs: https://robin-stocks.readthedocs.io/
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface RobinhoodConfig {
  username: string;
  password: string;
  mfa_code?: string;
}

export interface RobinhoodPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface RobinhoodBalance {
  cash: number;
  portfolioValue: number;
  buyingPower: number;
}

/**
 * Login to Robinhood using robin_stocks
 */
export async function robinhoodLogin(config: RobinhoodConfig): Promise<{ success: boolean; error?: string }> {
  const pythonScript = `
import robin_stocks.robinhood as r
import json
import sys

try:
    login = r.login('${config.username}', '${config.password}')
    print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
    sys.exit(1)
`;

  try {
    const { stdout, stderr } = await execAsync(`python3 -c '${pythonScript}'`);
    if (stderr) {
      console.error('Robinhood login stderr:', stderr);
    }
    const result = JSON.parse(stdout.trim());
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get account info
 */
export async function robinhoodGetAccount(username: string, password: string): Promise<any> {
  const pythonScript = `
import robin_stocks.robinhood as r
import json

r.login('${username}', '${password}')
profile = r.load_account_profile()
portfolio = r.build_holdings()

print(json.dumps({
    "profile": profile,
    "portfolio": portfolio
}))
`;

  try {
    const { stdout } = await execAsync(`python3 -c '${pythonScript}'`);
    const data = JSON.parse(stdout.trim());
    return data;
  } catch (error: any) {
    throw new Error(`Failed to get Robinhood account: ${error.message}`);
  }
}

/**
 * Get positions
 */
export async function robinhoodGetPositions(
  username: string,
  password: string
): Promise<{ positions: RobinhoodPosition[]; balance: RobinhoodBalance }> {
  const pythonScript = `
import robin_stocks.robinhood as r
import json

r.login('${username}', '${password}')

# Get holdings
holdings = r.build_holdings()

# Get profile for cash/portfolio value
profile = r.load_account_profile()

positions = []
for symbol, data in holdings.items():
    positions.append({
        "symbol": symbol,
        "quantity": float(data["quantity"]),
        "avgPrice": float(data["average_buy_price"]),
        "currentPrice": float(data["price"]),
        "marketValue": float(data["equity"]),
        "unrealizedPnL": float(data["equity"]) - (float(data["quantity"]) * float(data["average_buy_price"])),
        "unrealizedPnLPct": (float(data["percent_change"]) if data.get("percent_change") else 0)
    })

balance = {
    "cash": float(profile.get("cash", 0)),
    "portfolioValue": float(profile.get("portfolio_value", 0)) if profile.get("portfolio_value") else 0,
    "buyingPower": float(profile.get("buying_power", 0)) if profile.get("buying_power") else 0
}

print(json.dumps({
    "positions": positions,
    "balance": balance
}))
`;

  try {
    const { stdout } = await execAsync(`python3 -c '${pythonScript}'`);
    const data = JSON.parse(stdout.trim());
    return data;
  } catch (error: any) {
    throw new Error(`Failed to get Robinhood positions: ${error.message}`);
  }
}

/**
 * Place order
 */
export async function robinhoodPlaceOrder(
  username: string,
  password: string,
  order: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    type?: 'market' | 'limit';
    price?: number;
  }
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const orderType = order.type || 'market';
  const priceParam = order.price ? `, limitPrice=${order.price}` : '';

  const pythonScript = `
import robin_stocks.robinhood as r
import json

r.login('${username}', '${password}')

try:
    if '${order.side}' == 'buy':
        result = r.order_${orderType}_buy('${order.symbol}', ${order.quantity}${priceParam})
    else:
        result = r.order_${orderType}_sell('${order.symbol}', ${order.quantity}${priceParam})
    
    print(json.dumps({
        "success": True,
        "orderId": result.get("id"),
        "order": result
    }))
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
`;

  try {
    const { stdout } = await execAsync(`python3 -c '${pythonScript}'`);
    const data = JSON.parse(stdout.trim());
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get current quote
 */
export async function robinhoodGetQuote(
  username: string,
  password: string,
  symbol: string
): Promise<any> {
  const pythonScript = `
import robin_stocks.robinhood as r
import json

r.login('${username}', '${password}')
quote = r.get_latest_price('${symbol}')

print(json.dumps({
    "symbol": '${symbol}',
    "price": float(quote[0]) if quote else 0
}))
`;

  try {
    const { stdout } = await execAsync(`python3 -c '${pythonScript}'`);
    const data = JSON.parse(stdout.trim());
    return data;
  } catch (error: any) {
    throw new Error(`Failed to get quote: ${error.message}`);
  }
}

export default {
  login: robinhoodLogin,
  getAccount: robinhoodGetAccount,
  getPositions: robinhoodGetPositions,
  placeOrder: robinhoodPlaceOrder,
  getQuote: robinhoodGetQuote,
};
