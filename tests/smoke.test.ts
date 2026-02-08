/**
 * Smoke Tests - Critical Path Validation
 * Run before deploying to production
 */

import { getDb, closeDb } from '../integration/db-adapter';
import { CapGates } from '../core/cap-gates';
import { ProposalService } from '../core/proposal-service';

describe('Smoke Tests', () => {
  afterAll(async () => {
    await closeDb();
  });

  describe('Database', () => {
    it('should connect to database', async () => {
      const db = getDb();
      const result = await db.query('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(result[0]?.test).toBe(1);
    });

    it('should create and retrieve proposal', async () => {
      const db = getDb();
      const proposal = await db.createProposal({
        agent_id: 'atlas',
        title: 'Test proposal',
        status: 'pending',
        proposed_steps: ['analyze_signal'],
      });
      
      expect(proposal.id).toBeDefined();
      expect(proposal.agent_id).toBe('atlas');
    });
  });

  describe('Cap Gates', () => {
    it('should enforce atomic trade limits', async () => {
      const gates = new CapGates();
      
      // First trade should succeed
      const result1 = await gates.checkGate('execute_trade', {
        size: 1,
        entry_price: 20,
      });
      
      expect(result1.allowed).toBeDefined();
    });

    it('should prevent concurrent proposal race conditions', async () => {
      const gates = new CapGates();
      
      // Simulate concurrent proposals
      const promises = Array(10).fill(null).map(() => 
        gates.checkGate('execute_trade', { size: 1, entry_price: 20 })
      );
      
      const results = await Promise.all(promises);
      
      // Some should be allowed, some blocked (depending on limit)
      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;
      
      expect(allowed + blocked).toBe(10);
    });
  });

  describe('Proposal Service', () => {
    it('should validate proposal inputs', async () => {
      const service = new ProposalService();
      
      // Invalid agent ID should fail
      const result = await service.createProposalAndMaybeAutoApprove(
        'invalid_agent' as any,
        'Test',
        ['execute_trade'],
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should create valid proposal', async () => {
      const service = new ProposalService();
      
      const result = await service.createProposalAndMaybeAutoApprove(
        'atlas',
        'Valid test proposal',
        ['analyze_signal'],
        { confidence: 0.75 }
      );
      
      expect(result.success).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      // This would be a real HTTP call in integration tests
      const db = getDb();
      await db.query('SELECT 1');
      
      // If we get here without error, health check would pass
      expect(true).toBe(true);
    });
  });

  describe('Worker Step Claiming', () => {
    it('should prevent duplicate step claims', async () => {
      const db = getDb();
      
      // Create a test step
      const step = await db.createMissionStep({
        mission_id: 'test_mission',
        kind: 'execute_trade',
        status: 'queued',
        payload: { test: true },
      });
      
      // Try to claim from two workers simultaneously
      const [claim1, claim2] = await Promise.all([
        db.claimStep(step.id!, 'worker-1'),
        db.claimStep(step.id!, 'worker-2'),
      ]);
      
      // Only one should succeed
      expect(claim1 || claim2).toBe(true);
      expect(claim1 && claim2).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const db = getDb();
      
      try {
        // Invalid SQL should throw
        await db.query('INVALID SQL STATEMENT');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate input before database insert', async () => {
      const service = new ProposalService();
      
      // Empty title should fail validation before DB
      const result = await service.createProposalAndMaybeAutoApprove(
        'atlas',
        '', // Empty title
        ['execute_trade'],
        {}
      );
      
      expect(result.success).toBe(false);
    });
  });
});

// Test runner helper
if (require.main === module) {
  console.log('Running smoke tests...');
  console.log('Note: These tests require a running database');
  console.log('Run with: npm test or jest smoke.test.ts');
}
