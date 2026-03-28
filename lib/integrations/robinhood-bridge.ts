// Cortex Capital - Robinhood Bridge
// TypeScript wrapper that calls Python robin_stocks
// 
// IMPORTANT: Unofficial API - can break at any time

import { spawn } from 'child_process';
import path from 'path';

const PYTHON_PATH = path.join(__dirname, '..', '.venv', 'bin', 'python3');
const SCRIPT_PATH = path.join(__dirname, 'robinhood.py');

interface RobinhoodAccount {
  account_number: string;
  buying_power: number;
  cash: number;
  portfolio_value: number;
}

interface RobinhoodPosition {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

interface RobinhoodOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  status: string;
}

// Execute Python script and parse JSON output
async function executePython(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn(PYTHON_PATH, ['-c', code]);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`Python error: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });
  });
}

export class RobinhoodBridge {
  private username: string;
  private password: string;
  private mfaCode?: string;
  
  constructor(username?: string, password?: string, mfaCode?: string) {
    this.username = username || process.env.ROBINHOOD_USERNAME || '';
    this.password = password || process.env.ROBINHOOD_PASSWORD || '';
    this.mfaCode = mfaCode;
  }
  
  private async runCommand(command: string): Promise<any> {
    const code = `
import json
import os
import sys
sys.path.insert(0, '${path.dirname(SCRIPT_PATH)}')
from robinhood import RobinhoodClient

os.environ['ROBINHOOD_USERNAME'] = '${this.username}'
os.environ['ROBINHOOD_PASSWORD'] = '${this.password}'

client = RobinhoodClient()
${this.mfaCode ? `client.mfa_code = '${this.mfaCode}'` : ''}

try:
    client.login(store_session=True)
    result = ${command}
    print(json.dumps(result))
    client.logout()
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
    
    return executePython(code);
  }
  
  async getAccount(): Promise<RobinhoodAccount> {
    return this.runCommand('client.get_account()');
  }
  
  async getPositions(): Promise<RobinhoodPosition[]> {
    return this.runCommand('client.get_positions()');
  }
  
  async getQuote(symbol: string): Promise<{ symbol: string; price: number }> {
    return this.runCommand(`client.get_quote('${symbol}')`);
  }
  
  async buyStock(
    symbol: string, 
    quantity?: number, 
    amount?: number,
    limitPrice?: number
  ): Promise<RobinhoodOrder> {
    const args = [];
    if (quantity) args.push(`quantity=${quantity}`);
    if (amount) args.push(`amount=${amount}`);
    if (limitPrice) args.push(`limit_price=${limitPrice}`);
    
    return this.runCommand(`client.buy_stock('${symbol}', ${args.join(', ')})`);
  }
  
  async sellStock(
    symbol: string, 
    quantity?: number, 
    amount?: number,
    limitPrice?: number
  ): Promise<RobinhoodOrder> {
    const args = [];
    if (quantity) args.push(`quantity=${quantity}`);
    if (amount) args.push(`amount=${amount}`);
    if (limitPrice) args.push(`limit_price=${limitPrice}`);
    
    return this.runCommand(`client.sell_stock('${symbol}', ${args.join(', ')})`);
  }
  
  async buyOption(
    symbol: string,
    quantity: number,
    expirationDate: string,
    strike: number,
    optionType: 'call' | 'put',
    limitPrice: number
  ): Promise<RobinhoodOrder> {
    return this.runCommand(`client.buy_option('${symbol}', ${quantity}, '${expirationDate}', ${strike}, '${optionType}', ${limitPrice})`);
  }
  
  async sellOption(
    symbol: string,
    quantity: number,
    expirationDate: string,
    strike: number,
    optionType: 'call' | 'put',
    limitPrice: number
  ): Promise<RobinhoodOrder> {
    return this.runCommand(`client.sell_option('${symbol}', ${quantity}, '${expirationDate}', ${strike}, '${optionType}', ${limitPrice})`);
  }
  
  async getOrders(status?: string): Promise<RobinhoodOrder[]> {
    if (status) {
      return this.runCommand(`client.get_orders('${status}')`);
    }
    return this.runCommand('client.get_orders()');
  }
  
  async cancelOrder(orderId: string): Promise<boolean> {
    return this.runCommand(`client.cancel_order('${orderId}')`);
  }
  
  async cancelAllOrders(): Promise<number> {
    return this.runCommand('client.cancel_all_orders()');
  }
}

// Check if configured
export function isConfigured(): boolean {
  return !!(process.env.ROBINHOOD_USERNAME && process.env.ROBINHOOD_PASSWORD);
}

export default RobinhoodBridge;
