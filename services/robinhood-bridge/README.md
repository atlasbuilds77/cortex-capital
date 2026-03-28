# Robinhood Trading Bridge

A FastAPI microservice that wraps robin-stocks for secure trade execution.

## Setup

```bash
cd services/robinhood-bridge
pip install -r requirements.txt

# Set environment variables
export ROBINHOOD_SERVICE_KEY="your-secure-key"
export PORT=8080

# Run
python server.py
```

## Environment Variables

- `ROBINHOOD_SERVICE_KEY` - Secure key for service-to-service auth
- `PORT` - Server port (default: 8080)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Endpoints

### POST /api/trade
Execute a trade on Robinhood.

**Request:**
```json
{
  "username": "user@email.com",
  "password": "...",
  "order": {
    "symbol": "AAPL",
    "side": "buy",
    "quantity": 1,
    "order_type": "market",
    "time_in_force": "gfd"
  }
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "abc123",
  "status": "filled",
  "filled_quantity": 1,
  "filled_price": 150.25
}
```

### POST /api/account
Get account information.

### POST /api/cancel
Cancel an open order.

## Security Notes

- Credentials are passed per-request and NOT stored
- Use service key for internal authentication
- Always use HTTPS in production
- Robin-stocks sessions are not persisted
