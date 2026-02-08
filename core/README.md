# Proposal Service - The Hub of Autonomous Trading Company

## Overview

The Proposal Service is the **single entry point** for ALL proposals in the system. Every path (triggers, reactions, APIs, initiative) must call `createProposalAndMaybeAutoApprove()`. No bypasses allowed.

## Architecture

```
┌─────────────────┐
│   Proposal      │
│   Service       │◄── ALL proposals enter here
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Cap Gates     │◄── Validate limits & constraints
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Policy Engine │◄── Check auto-approval rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│   Auto-Approve  │    │   Pending       │
│   & Create      │    │   Review        │
│   Mission       │    │   (Roundtable)  │
└────────┬────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Event Emitter │◄── Log all actions
└─────────────────┘
```

## Core Components

### 1. `proposal-service.ts` - Main Hub
- `createProposalAndMaybeAutoApprove()` - Single entry point
- Orchestrates the entire flow
- Provides helper methods for common proposal types

### 2. `cap-gates.ts` - Validation Gates
- `execute_trade` - Daily limit, max positions, size limits
- `close_position` - Validate position exists, not already closing
- `scale_position` - Risk limits, sufficient capital
- `analyze_signal` - Daily analysis quota
- `roundtable_conversation` - Max daily conversations

### 3. `policy-engine.ts` - Policy Management
- `getPolicy(key)` - Read from ops_policy
- `updatePolicy(key, value)` - Write to ops_policy
- `evaluateAutoApprove()` - Check if proposal auto-passes

### 4. `mission-creator.ts` - Proposal → Mission Converter
- `createMissionFromProposal()` - Turns approved proposal into mission + steps
- Determines mission type based on step kinds
- Creates appropriate payloads for each step

### 5. `event-emitter.ts` - Event Logging
- `emitProposalEvent()` - Write to ops_agent_events
- Events for creation, approval, rejection, gate checks
- Full audit trail

## Usage Examples

### Basic Proposal Creation

```typescript
import { ProposalService } from './proposal-service';

const proposalService = new ProposalService();

// Create a trade proposal
const result = await proposalService.createProposalAndMaybeAutoApprove(
  'intel',                    // agent_id
  'Buy SOL at $150',          // title
  ['execute_trade'],          // proposed_steps
  {                           // metadata
    token: 'SOL',
    entry_price: 150,
    size: 0.4,
    target: 180,
    stop_loss: 130,
    signal_type: 'KOL_accumulation'
  }
);

if (result.success) {
  if (result.auto_approved) {
    console.log(`Mission created: ${result.mission?.id}`);
    console.log(`Steps created: ${result.steps?.length}`);
  } else {
    console.log('Proposal pending roundtable review');
  }
} else {
  console.error(`Proposal rejected: ${result.error}`);
}
```

### Helper Methods

```typescript
// Trade proposal (common pattern)
const tradeResult = await proposalService.createTradeProposal(
  'atlas',
  'ETH',
  3200,
  0.5,
  3500,  // target
  3000   // stop loss
);

// Signal analysis proposal
const analysisResult = await proposalService.createSignalAnalysisProposal(
  'intel',
  'BTC',
  'volume_spike',
  0.75
);

// Roundtable proposal
const roundtableResult = await proposalService.createRoundtableProposal(
  'sage',
  'Should we increase position size limits?',
  ['atlas', 'sage', 'growth'],
  'debate'
);
```

### Cap Gate Functions

All cap gate functions are available for testing:

```typescript
const gateFunctions = proposalService.getAllCapGateFunctions();

// Test execute_trade gate
const tradeGateResult = await gateFunctions.execute_trade({
  size: 0.5,
  entry_price: 150
});

// Test analyze_signal gate  
const analysisGateResult = await gateFunctions.analyze_signal();

console.log(tradeGateResult.allowed ? 'Gate passed' : `Gate failed: ${tradeGateResult.reason}`);
```

### Policy Management

```typescript
const policyEngine = proposalService.getPolicyEngine();

// Get auto-approval policy
const autoApprovePolicy = await policyEngine.getPolicy('auto_approve');

// Update policy
await policyEngine.updatePolicy('trade_limits', {
  max_daily_trades: 10,
  max_open_positions: 4,
  max_position_size_usd: 80
});

// Check if step requires roundtable
const requiresRoundtable = await policyEngine.requiresRoundtable('execute_trade');
```

## Cap Gates Reference

### 1. `execute_trade` Gate
- **Daily trade limit**: Default 8 trades/day (configurable)
- **Max open positions**: Default 3 positions (configurable)
- **Position size limit**: Default $60 USD per position (configurable)
- **Total portfolio exposure**: Max 2x individual position size

### 2. `close_position` Gate
- **Position exists**: Must have open position for the token
- **Not already closing**: Prevent duplicate close operations

### 3. `scale_position` Gate
- **Position exists**: Must have open position for the token
- **Size limit**: Scaled position can't exceed max position size
- **Risk limit**: Can't scale into positions down >20%

### 4. `analyze_signal` Gate
- **Daily analysis quota**: Default 20 analyses/day (configurable)

### 5. `roundtable_conversation` Gate
- **Max daily conversations**: Default 8 conversations/day (configurable)

## Auto-Approval Policy

Based on `ops_policy.auto_approve`:

```json
{
  "enabled": true,
  "allowed_step_kinds": [
    "analyze_signal",
    "monitor_position",
    "calculate_risk"
  ],
  "requires_roundtable": [
    "execute_trade",
    "close_position",
    "scale_position"
  ]
}
```

**Auto-approval rules:**
1. Policy must be enabled
2. NO steps can be in `requires_roundtable` list
3. ALL steps must be in `allowed_step_kinds` list

## Event Types

All events are written to `ops_agent_events`:

| Event Kind | Description | Tags |
|------------|-------------|------|
| `proposal_created` | Proposal created | `['creation']` |
| `proposal_auto_approved` | Auto-approved | `['auto_approval', 'success']` |
| `proposal_pending_review` | Requires roundtable | `['pending', 'roundtable_required']` |
| `proposal_rejected` | Rejected by gate | `['rejected', 'gate_failed']` |
| `cap_gate_passed` | Gate check passed | `['cap_gate', 'validation', 'success']` |
| `cap_gate_failed` | Gate check failed | `['cap_gate', 'validation', 'failure']` |
| `mission_created` | Mission created | `['mission', 'creation', 'success']` |

## Test Cases

### Edge Conditions to Test

1. **Daily limit reached**
   - Create 8 trade proposals → 9th should be rejected
   - Create 20 analysis proposals → 21st should be rejected

2. **Position limits**
   - Open 3 positions → 4th trade should be rejected
   - Try to close non-existent position → should be rejected

3. **Size limits**
   - Try $70 position when max is $60 → should be rejected
   - Try to scale position beyond max size → should be rejected

4. **Auto-approval logic**
   - `analyze_signal` proposal → should auto-approve
   - `execute_trade` proposal → should require roundtable
   - Mixed steps with any trade → should require roundtable

5. **Error handling**
   - Invalid step kind → should reject
   - Missing required metadata → gates should handle gracefully
   - Database errors → should not crash, return error result

## Integration Points

### 1. Trigger System
```typescript
// In evaluateTriggers():
const proposalService = new ProposalService();
await proposalService.createProposalAndMaybeAutoApprove(...);
```

### 2. Reaction System
```typescript
// In processReactionQueue():
await proposalService.createProposalAndMaybeAutoApprove(...);
```

### 3. Initiative Worker
```typescript
// In initiative-worker:
await proposalService.createProposalAndMaybeAutoApprove(...);
```

### 4. External APIs
```typescript
// REST endpoint handler:
app.post('/api/proposals', async (req, res) => {
  const result = await proposalService.createProposalAndMaybeAutoApprove(...);
  res.json(result);
});
```

## Critical Rules

1. **NO BYPASSES**: All proposals must go through `createProposalAndMaybeAutoApprove()`
2. **GATES BEFORE QUEUE**: All gates checked BEFORE creating queued steps
3. **ATOMIC OPERATIONS**: Proposal either fully succeeds or fully fails
4. **FULL AUDIT TRAIL**: Every action emits an event
5. **POLICY-DRIVEN**: All limits and rules configurable via ops_policy

## Next Steps

1. **Database Integration**: Replace mock DB functions with actual PostgreSQL queries
2. **Error Recovery**: Add retry logic for transient failures
3. **Metrics**: Add Prometheus metrics for monitoring
4. **Caching**: Cache policy values to reduce DB load
5. **Validation**: Add schema validation for proposal metadata

---

**Remember**: This is the most important piece of the system. Every path flows through here. Build it rock-solid. 🔥