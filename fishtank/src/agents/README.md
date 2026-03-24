# Cortex Capital Agents for Claw3D

This directory contains the integration layer between **Cortex Capital** (trading system) and **Claw3D** (3D office visualization).

---

## Files

### `cortex-agents.ts`
- Defines the 7 Cortex Capital agents
- Maps each agent to office desk position
- Provides conversion to `OfficeAgent` format

### `activity-feed.ts`
- Manages activity event stream
- Stores recent events (last 100)
- Provides pub/sub for real-time updates

### `cortex-bridge.ts`
- Integration bridge between Cortex Capital and Claw3D
- Maps activity events to agent status
- Provides HTTP/WebSocket/file-based integration endpoints

---

## Usage

### Initialize Bridge

```typescript
import { initCortexBridge } from '@/agents/cortex-bridge';

// In app initialization
initCortexBridge();
```

### Get Agents for Rendering

```typescript
import { getCortexOfficeAgents } from '@/agents/cortex-bridge';

const agents = getCortexOfficeAgents();
// Returns array of OfficeAgent with current status
```

### Subscribe to Activity

```typescript
import { subscribeToActivity } from '@/agents/activity-feed';

const unsubscribe = subscribeToActivity((event) => {
  console.log('Activity:', event.agentRole, event.description);
});

// Later...
unsubscribe();
```

---

## Integration

Cortex Capital sends activity events via:

1. **HTTP POST** to `/api/cortex/activity` (recommended)
2. **WebSocket** connection
3. **File-based** JSONL feed

See `/Users/atlasbuilds/clawd/FISH-TANK-INTEGRATION.md` for full details.

---

## Agent Roles

| Role | ID | Color | Desk Location |
|------|-------|-------|---------------|
| ANALYST | cortex-analyst | Blue | (5, 3) |
| STRATEGIST | cortex-strategist | Purple | (8, 3) |
| EXECUTOR | cortex-executor | Green | (5, 6) |
| REPORTER | cortex-reporter | Amber | (8, 6) |
| OPTIONS_STRATEGIST | cortex-options-strategist | Red | (11, 3) |
| DAY_TRADER | cortex-day-trader | Cyan | (11, 6) |
| MOMENTUM | cortex-momentum | Pink | (14, 4) |

---

## Testing

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/cortex/activity \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": 1711010000000,
    "agentRole": "ANALYST",
    "activityType": "analyzing",
    "description": "Testing integration"
  }'
```

---

Built by Atlas 🔥
