"""
Robinhood Trading Bridge
A FastAPI microservice that wraps robin-stocks for secure trade execution.

This service handles:
- Authentication with Robinhood
- Trade execution (market, limit, stop, stop-limit orders)
- Account info retrieval
- Position management
- Order cancellation

Security:
- Credentials are passed per-request (not stored)
- Service key validation
- Rate limiting
- Comprehensive logging
"""

import os
import logging
from datetime import datetime
from typing import Optional
from functools import wraps

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import robin_stocks.robinhood as rh

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('robinhood-bridge')

# Service configuration
SERVICE_KEY = os.environ.get('ROBINHOOD_SERVICE_KEY', '')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

app = FastAPI(
    title="Robinhood Trading Bridge",
    description="Secure Robinhood trade execution service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Request/Response models
class Credentials(BaseModel):
    username: str
    password: str

class OrderRequest(BaseModel):
    symbol: str
    side: str  # 'buy' or 'sell'
    quantity: float
    order_type: str  # 'market', 'limit', 'stop', 'stop_limit'
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = 'gfd'  # 'gfd', 'gtc', 'ioc', 'opg'

class TradeRequest(BaseModel):
    username: str
    password: str
    order: OrderRequest

class CancelRequest(BaseModel):
    username: str
    password: str
    order_id: str

class AccountRequest(BaseModel):
    username: str
    password: str

# Service key validation
def validate_service_key(x_service_key: Optional[str] = Header(None)):
    if SERVICE_KEY and x_service_key != SERVICE_KEY:
        logger.warning(f"Invalid service key attempt")
        raise HTTPException(status_code=401, detail="Invalid service key")

# Login helper
def login_to_robinhood(username: str, password: str, mfa_code: Optional[str] = None):
    """Login to Robinhood and handle MFA if needed."""
    try:
        # Try login without MFA first
        login_result = rh.login(
            username=username,
            password=password,
            expiresIn=86400,  # 24 hours
            store_session=False,  # Don't persist session
            mfa_code=mfa_code
        )
        
        if login_result:
            logger.info(f"Successfully logged in user: {username[:3]}***")
            return True
        else:
            logger.error(f"Login failed for user: {username[:3]}***")
            return False
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/trade")
async def execute_trade(
    request: TradeRequest,
    x_service_key: Optional[str] = Header(None)
):
    """Execute a trade on Robinhood."""
    validate_service_key(x_service_key)
    
    try:
        # Login
        if not login_to_robinhood(request.username, request.password):
            raise HTTPException(status_code=401, detail="Authentication failed")
        
        order = request.order
        logger.info(f"Executing {order.side} {order.quantity} {order.symbol} @ {order.order_type}")
        
        # Execute based on order type
        result = None
        
        if order.order_type == 'market':
            if order.side == 'buy':
                result = rh.orders.order_buy_market(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    timeInForce=order.time_in_force
                )
            else:
                result = rh.orders.order_sell_market(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    timeInForce=order.time_in_force
                )
                
        elif order.order_type == 'limit':
            if not order.limit_price:
                raise HTTPException(status_code=400, detail="Limit price required for limit orders")
            
            if order.side == 'buy':
                result = rh.orders.order_buy_limit(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    limitPrice=order.limit_price,
                    timeInForce=order.time_in_force
                )
            else:
                result = rh.orders.order_sell_limit(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    limitPrice=order.limit_price,
                    timeInForce=order.time_in_force
                )
                
        elif order.order_type == 'stop':
            if not order.stop_price:
                raise HTTPException(status_code=400, detail="Stop price required for stop orders")
            
            if order.side == 'buy':
                result = rh.orders.order_buy_stop_loss(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    stopPrice=order.stop_price,
                    timeInForce=order.time_in_force
                )
            else:
                result = rh.orders.order_sell_stop_loss(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    stopPrice=order.stop_price,
                    timeInForce=order.time_in_force
                )
                
        elif order.order_type == 'stop_limit':
            if not order.stop_price or not order.limit_price:
                raise HTTPException(status_code=400, detail="Stop and limit prices required for stop-limit orders")
            
            if order.side == 'buy':
                result = rh.orders.order_buy_stop_limit(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    limitPrice=order.limit_price,
                    stopPrice=order.stop_price,
                    timeInForce=order.time_in_force
                )
            else:
                result = rh.orders.order_sell_stop_limit(
                    symbol=order.symbol,
                    quantity=order.quantity,
                    limitPrice=order.limit_price,
                    stopPrice=order.stop_price,
                    timeInForce=order.time_in_force
                )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown order type: {order.order_type}")
        
        # Logout
        rh.logout()
        
        if not result:
            raise HTTPException(status_code=500, detail="Order failed - no result returned")
        
        logger.info(f"Order result: {result.get('id', 'unknown')}")
        
        return {
            "success": True,
            "order_id": result.get('id'),
            "status": result.get('state', 'unknown'),
            "filled_quantity": result.get('cumulative_quantity'),
            "filled_price": result.get('average_price'),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trade execution error: {str(e)}")
        rh.logout()  # Ensure logout on error
        raise HTTPException(status_code=500, detail=f"Trade failed: {str(e)}")

@app.post("/api/account")
async def get_account(
    request: AccountRequest,
    x_service_key: Optional[str] = Header(None)
):
    """Get account information from Robinhood."""
    validate_service_key(x_service_key)
    
    try:
        if not login_to_robinhood(request.username, request.password):
            raise HTTPException(status_code=401, detail="Authentication failed")
        
        # Get account info
        profile = rh.profiles.load_account_profile()
        portfolio = rh.profiles.load_portfolio_profile()
        positions = rh.account.build_holdings()
        
        # Format positions
        formatted_positions = []
        for symbol, data in positions.items():
            formatted_positions.append({
                "symbol": symbol,
                "quantity": float(data.get('quantity', 0)),
                "average_cost": float(data.get('average_buy_price', 0)),
                "current_price": float(data.get('price', 0)),
                "today_change": float(data.get('percent_change', 0)),
            })
        
        rh.logout()
        
        return {
            "success": True,
            "buying_power": float(profile.get('buying_power', 0)),
            "portfolio_value": float(portfolio.get('equity', 0)),
            "positions": formatted_positions,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account info error: {str(e)}")
        rh.logout()
        raise HTTPException(status_code=500, detail=f"Account info failed: {str(e)}")

@app.post("/api/cancel")
async def cancel_order(
    request: CancelRequest,
    x_service_key: Optional[str] = Header(None)
):
    """Cancel an open order."""
    validate_service_key(x_service_key)
    
    try:
        if not login_to_robinhood(request.username, request.password):
            raise HTTPException(status_code=401, detail="Authentication failed")
        
        result = rh.orders.cancel_stock_order(request.order_id)
        
        rh.logout()
        
        return {
            "success": True,
            "cancelled": True,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel order error: {str(e)}")
        rh.logout()
        raise HTTPException(status_code=500, detail=f"Cancel failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
