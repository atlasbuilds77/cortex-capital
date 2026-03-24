#!/usr/bin/env python3
"""
Cortex Capital - Robinhood Integration
Uses robin_stocks for unofficial API access

IMPORTANT: This is an UNOFFICIAL API. 
- Robinhood can break it at any time
- Requires storing user credentials
- MFA handling required

Usage:
    from robinhood import RobinhoodClient
    client = RobinhoodClient(username, password, mfa_code)
    client.login()
    account = client.get_account()
"""

import os
import json
import robin_stocks.robinhood as rh
from typing import Optional, Dict, List, Any
from datetime import datetime

class RobinhoodClient:
    def __init__(self, username: str = None, password: str = None, mfa_code: str = None):
        self.username = username or os.getenv('ROBINHOOD_USERNAME')
        self.password = password or os.getenv('ROBINHOOD_PASSWORD')
        self.mfa_code = mfa_code
        self.logged_in = False
        
    def login(self, store_session: bool = True) -> bool:
        """Login to Robinhood. Returns True on success."""
        try:
            if self.mfa_code:
                rh.login(
                    self.username, 
                    self.password,
                    mfa_code=self.mfa_code,
                    store_session=store_session
                )
            else:
                # Will prompt for MFA if enabled
                rh.login(
                    self.username, 
                    self.password,
                    store_session=store_session
                )
            self.logged_in = True
            return True
        except Exception as e:
            print(f"[Robinhood] Login failed: {e}")
            return False
    
    def logout(self) -> None:
        """Logout and clear session."""
        rh.logout()
        self.logged_in = False
    
    # ==================== ACCOUNT ====================
    
    def get_account(self) -> Dict[str, Any]:
        """Get account profile and portfolio info."""
        profile = rh.profiles.load_account_profile()
        portfolio = rh.profiles.load_portfolio_profile()
        
        return {
            'account_number': profile.get('account_number'),
            'buying_power': float(profile.get('buying_power', 0)),
            'cash': float(profile.get('cash', 0)),
            'portfolio_value': float(portfolio.get('equity', 0)),
            'extended_hours_equity': float(portfolio.get('extended_hours_equity', 0)),
            'withdrawable_amount': float(portfolio.get('withdrawable_amount', 0)),
        }
    
    def get_positions(self) -> List[Dict[str, Any]]:
        """Get all open stock positions."""
        positions = rh.account.get_open_stock_positions()
        result = []
        
        for pos in positions:
            instrument_data = rh.stocks.get_instrument_by_url(pos['instrument'])
            symbol = instrument_data['symbol']
            quantity = float(pos['quantity'])
            avg_cost = float(pos['average_buy_price'])
            
            # Get current price
            quote = rh.stocks.get_latest_price(symbol)
            current_price = float(quote[0]) if quote else 0
            
            result.append({
                'symbol': symbol,
                'quantity': quantity,
                'avg_cost': avg_cost,
                'current_price': current_price,
                'market_value': quantity * current_price,
                'unrealized_pnl': (current_price - avg_cost) * quantity,
                'unrealized_pnl_pct': ((current_price / avg_cost) - 1) * 100 if avg_cost > 0 else 0,
            })
        
        return result
    
    def get_option_positions(self) -> List[Dict[str, Any]]:
        """Get all open option positions."""
        positions = rh.options.get_open_option_positions()
        result = []
        
        for pos in positions:
            chain_symbol = pos.get('chain_symbol')
            quantity = float(pos.get('quantity', 0))
            avg_cost = float(pos.get('average_price', 0)) / 100  # Convert to per-share
            
            option_data = rh.options.get_option_instrument_data_by_id(pos['option_id'])
            
            result.append({
                'symbol': chain_symbol,
                'option_type': option_data.get('type'),
                'strike_price': float(option_data.get('strike_price', 0)),
                'expiration_date': option_data.get('expiration_date'),
                'quantity': quantity,
                'avg_cost': avg_cost,
            })
        
        return result
    
    # ==================== ORDERS ====================
    
    def buy_stock(
        self, 
        symbol: str, 
        quantity: int = None, 
        amount: float = None,
        limit_price: float = None,
        time_in_force: str = 'gfd'
    ) -> Dict[str, Any]:
        """
        Buy stock. Specify either quantity or dollar amount.
        
        Args:
            symbol: Stock ticker
            quantity: Number of shares (or use amount for dollar-based)
            amount: Dollar amount to invest (fractional shares)
            limit_price: Limit price (None for market order)
            time_in_force: 'gfd' (good for day) or 'gtc' (good til cancelled)
        """
        if amount:
            # Dollar-based order (fractional shares)
            if limit_price:
                return rh.orders.order_buy_fractional_by_price(
                    symbol, amount, timeInForce=time_in_force, limitPrice=limit_price
                )
            else:
                return rh.orders.order_buy_fractional_by_price(
                    symbol, amount, timeInForce=time_in_force
                )
        else:
            # Share-based order
            if limit_price:
                return rh.orders.order_buy_limit(
                    symbol, quantity, limit_price, timeInForce=time_in_force
                )
            else:
                return rh.orders.order_buy_market(
                    symbol, quantity, timeInForce=time_in_force
                )
    
    def sell_stock(
        self, 
        symbol: str, 
        quantity: int = None, 
        amount: float = None,
        limit_price: float = None,
        time_in_force: str = 'gfd'
    ) -> Dict[str, Any]:
        """Sell stock. Specify either quantity or dollar amount."""
        if amount:
            if limit_price:
                return rh.orders.order_sell_fractional_by_price(
                    symbol, amount, timeInForce=time_in_force, limitPrice=limit_price
                )
            else:
                return rh.orders.order_sell_fractional_by_price(
                    symbol, amount, timeInForce=time_in_force
                )
        else:
            if limit_price:
                return rh.orders.order_sell_limit(
                    symbol, quantity, limit_price, timeInForce=time_in_force
                )
            else:
                return rh.orders.order_sell_market(
                    symbol, quantity, timeInForce=time_in_force
                )
    
    def buy_option(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str = 'call',
        limit_price: float = None,
        time_in_force: str = 'gfd'
    ) -> Dict[str, Any]:
        """
        Buy an option contract.
        
        Args:
            symbol: Underlying stock ticker
            quantity: Number of contracts
            expiration_date: 'YYYY-MM-DD'
            strike: Strike price
            option_type: 'call' or 'put'
            limit_price: Limit price per contract (required for options)
            time_in_force: 'gfd' or 'gtc'
        """
        if not limit_price:
            raise ValueError("Options orders require a limit price")
        
        return rh.orders.order_buy_option_limit(
            positionEffect='open',
            creditOrDebit='debit',
            price=limit_price,
            symbol=symbol,
            quantity=quantity,
            expirationDate=expiration_date,
            strike=strike,
            optionType=option_type,
            timeInForce=time_in_force
        )
    
    def sell_option(
        self,
        symbol: str,
        quantity: int,
        expiration_date: str,
        strike: float,
        option_type: str = 'call',
        limit_price: float = None,
        time_in_force: str = 'gfd'
    ) -> Dict[str, Any]:
        """Sell (close) an option position."""
        if not limit_price:
            raise ValueError("Options orders require a limit price")
        
        return rh.orders.order_sell_option_limit(
            positionEffect='close',
            creditOrDebit='credit',
            price=limit_price,
            symbol=symbol,
            quantity=quantity,
            expirationDate=expiration_date,
            strike=strike,
            optionType=option_type,
            timeInForce=time_in_force
        )
    
    def get_orders(self, status: str = None) -> List[Dict[str, Any]]:
        """Get orders. Status: 'pending', 'filled', 'cancelled', etc."""
        orders = rh.orders.get_all_stock_orders()
        
        if status:
            orders = [o for o in orders if o.get('state') == status]
        
        return orders
    
    def cancel_order(self, order_id: str) -> bool:
        """Cancel an order by ID."""
        try:
            rh.orders.cancel_stock_order(order_id)
            return True
        except Exception as e:
            print(f"[Robinhood] Cancel failed: {e}")
            return False
    
    def cancel_all_orders(self) -> int:
        """Cancel all open orders. Returns count cancelled."""
        result = rh.orders.cancel_all_stock_orders()
        return len(result) if result else 0
    
    # ==================== MARKET DATA ====================
    
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get current quote for a symbol."""
        quote = rh.stocks.get_stock_quote_by_symbol(symbol)
        
        return {
            'symbol': symbol,
            'price': float(quote.get('last_trade_price', 0)),
            'bid': float(quote.get('bid_price', 0)),
            'ask': float(quote.get('ask_price', 0)),
            'volume': int(quote.get('volume', 0)),
            'previous_close': float(quote.get('previous_close', 0)),
        }
    
    def get_quotes(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Get quotes for multiple symbols."""
        quotes = rh.stocks.get_stock_quote_by_symbol(symbols)
        
        result = []
        for quote in quotes:
            result.append({
                'symbol': quote.get('symbol'),
                'price': float(quote.get('last_trade_price', 0)),
                'bid': float(quote.get('bid_price', 0)),
                'ask': float(quote.get('ask_price', 0)),
            })
        
        return result
    
    def get_option_chain(
        self, 
        symbol: str, 
        expiration_date: str = None,
        option_type: str = None
    ) -> List[Dict[str, Any]]:
        """Get option chain for a symbol."""
        options = rh.options.find_tradable_options(
            symbol,
            expirationDate=expiration_date,
            optionType=option_type
        )
        
        return options


# ==================== CLI TESTING ====================

if __name__ == '__main__':
    import sys
    
    print("Robinhood Integration Test")
    print("=" * 40)
    
    # Check for credentials
    username = os.getenv('ROBINHOOD_USERNAME')
    password = os.getenv('ROBINHOOD_PASSWORD')
    
    if not username or not password:
        print("Set ROBINHOOD_USERNAME and ROBINHOOD_PASSWORD env vars")
        print("Or run: python robinhood.py <username> <password> [mfa_code]")
        sys.exit(1)
    
    mfa = sys.argv[3] if len(sys.argv) > 3 else None
    
    client = RobinhoodClient(username, password, mfa)
    
    if client.login():
        print("✅ Login successful!")
        
        account = client.get_account()
        print(f"\nAccount: {account['account_number']}")
        print(f"Cash: ${account['cash']:,.2f}")
        print(f"Portfolio: ${account['portfolio_value']:,.2f}")
        print(f"Buying Power: ${account['buying_power']:,.2f}")
        
        positions = client.get_positions()
        print(f"\nPositions: {len(positions)}")
        for pos in positions[:5]:
            print(f"  {pos['symbol']}: {pos['quantity']} @ ${pos['avg_cost']:.2f}")
        
        client.logout()
    else:
        print("❌ Login failed")
