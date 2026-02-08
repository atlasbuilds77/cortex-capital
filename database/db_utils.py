#!/usr/bin/env python3
"""
Database Helper Functions for Autonomous Trading Company
Query optimizations and common operations
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseUtils:
    """Database helper functions for common operations"""
    
    @staticmethod
    def create_proposal(db, agent_id: str, title: str, signal_type: str, 
                       entry_price: Optional[float] = None,
                       target_price: Optional[float] = None,
                       stop_loss: Optional[float] = None,
                       proposed_steps: List[Dict] = None,
                       metadata: Dict = None) -> UUID:
        """
        Create a new trading proposal with optimized insert
        """
        query = """
        INSERT INTO ops_trading_proposals 
        (agent_id, title, signal_type, entry_price, target_price, stop_loss, 
         proposed_steps, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
        RETURNING id
        """
        
        steps_json = json.dumps(proposed_steps or [])
        metadata_json = json.dumps(metadata or {})
        
        result = db.execute(query, (agent_id, title, signal_type, entry_price,
                                   target_price, stop_loss, steps_json, metadata_json))
        return result.fetchone()[0]
    
    @staticmethod
    def get_pending_proposals(db, limit: int = 10) -> List[Dict]:
        """
        Get pending proposals with optimized query
        """
        query = """
        SELECT p.*, 
               (SELECT COUNT(*) FROM ops_missions m WHERE m.proposal_id = p.id) as mission_count
        FROM ops_trading_proposals p
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
        LIMIT %s
        """
        
        result = db.execute(query, (limit,))
        return [dict(row) for row in result.fetchall()]
    
    @staticmethod
    def create_mission_from_proposal(db, proposal_id: UUID, created_by: str) -> UUID:
        """
        Create a mission from an approved proposal with transaction safety
        """
        # Start transaction
        db.execute("BEGIN")
        
        try:
            # Get proposal
            proposal_query = """
            SELECT title, agent_id, signal_type, proposed_steps
            FROM ops_trading_proposals
            WHERE id = %s AND status = 'accepted'
            FOR UPDATE
            """
            proposal = db.execute(proposal_query, (proposal_id,)).fetchone()
            
            if not proposal:
                raise ValueError("Proposal not found or not accepted")
            
            # Create mission
            mission_query = """
            INSERT INTO ops_missions 
            (title, created_by, mission_type, proposal_id, metadata)
            VALUES (%s, %s, 'entry', %s, %s::jsonb)
            RETURNING id
            """
            
            metadata = {
                "source_proposal": str(proposal_id),
                "original_agent": proposal['agent_id'],
                "signal_type": proposal['signal_type']
            }
            
            mission_id = db.execute(mission_query, (
                proposal['title'], created_by, proposal_id, json.dumps(metadata)
            )).fetchone()[0]
            
            # Create steps from proposed_steps
            steps = json.loads(proposal['proposed_steps'])
            for step in steps:
                step_query = """
                INSERT INTO ops_mission_steps 
                (mission_id, kind, payload, assigned_to)
                VALUES (%s, %s, %s::jsonb, %s)
                """
                db.execute(step_query, (
                    mission_id, step.get('kind', 'analyze'),
                    json.dumps(step.get('payload', {})),
                    step.get('assigned_to')
                ))
            
            # Update proposal status
            db.execute("""
            UPDATE ops_trading_proposals 
            SET status = 'accepted', accepted_at = NOW()
            WHERE id = %s
            """, (proposal_id,))
            
            db.execute("COMMIT")
            return mission_id
            
        except Exception as e:
            db.execute("ROLLBACK")
            logger.error(f"Failed to create mission from proposal: {e}")
            raise
    
    @staticmethod
    def get_queued_steps(db, kind: Optional[str] = None, limit: int = 5) -> List[Dict]:
        """
        Get queued steps with optimized locking for worker claiming
        """
        query = """
        SELECT s.*, m.title as mission_title, m.created_by
        FROM ops_mission_steps s
        JOIN ops_missions m ON s.mission_id = m.id
        WHERE s.status = 'queued'
        AND s.timeout_at > NOW()
        """
        
        params = []
        if kind:
            query += " AND s.kind = %s"
            params.append(kind)
        
        query += " ORDER BY s.created_at ASC LIMIT %s"
        params.append(limit)
        
        result = db.execute(query, params)
        return [dict(row) for row in result.fetchall()]
    
    @staticmethod
    def claim_step(db, step_id: UUID, assigned_to: str) -> bool:
        """
        Atomically claim a step for processing (compare-and-swap pattern)
        """
        query = """
        UPDATE ops_mission_steps 
        SET status = 'running', assigned_to = %s, started_at = NOW()
        WHERE id = %s AND status = 'queued'
        RETURNING id
        """
        
        result = db.execute(query, (assigned_to, step_id))
        return result.rowcount > 0
    
    @staticmethod
    def complete_step(db, step_id: UUID, result_data: Optional[Dict] = None, 
                     error: Optional[str] = None) -> bool:
        """
        Complete a step with result or error
        """
        query = """
        UPDATE ops_mission_steps 
        SET status = %s, 
            result = %s::jsonb, 
            error = %s,
            completed_at = NOW()
        WHERE id = %s AND status = 'running'
        RETURNING mission_id
        """
        
        status = 'failed' if error else 'succeeded'
        result_json = json.dumps(result_data) if result_data else None
        
        db_result = db.execute(query, (status, result_json, error, step_id))
        if db_result.rowcount == 0:
            return False
        
        mission_id = db_result.fetchone()[0]
        
        # Check if all steps in mission are complete
        check_query = """
        SELECT COUNT(*) as pending_count
        FROM ops_mission_steps
        WHERE mission_id = %s AND status IN ('queued', 'running')
        """
        
        pending = db.execute(check_query, (mission_id,)).fetchone()['pending_count']
        if pending == 0:
            # Update mission status
            db.execute("""
            UPDATE ops_missions 
            SET status = 'succeeded', completed_at = NOW()
            WHERE id = %s
            """, (mission_id,))
        
        return True
    
    @staticmethod
    def record_agent_event(db, agent_id: str, kind: str, title: str, 
                          summary: str, tags: List[str] = None,
                          trade_id: Optional[UUID] = None,
                          pnl: Optional[float] = None,
                          pnl_percent: Optional[float] = None,
                          metadata: Dict = None) -> UUID:
        """
        Record an agent event with optimized insert
        """
        query = """
        INSERT INTO ops_agent_events 
        (agent_id, kind, title, summary, tags, trade_id, pnl, pnl_percent, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        RETURNING id
        """
        
        result = db.execute(query, (
            agent_id, kind, title, summary, tags or [], trade_id,
            pnl, pnl_percent, json.dumps(metadata or {})
        ))
        return result.fetchone()[0]
    
    @staticmethod
    def evaluate_triggers(db, event_data: Dict) -> List[Dict]:
        """
        Evaluate triggers based on event data
        Returns matching triggers that are not on cooldown
        """
        query = """
        SELECT tr.*
        FROM ops_trigger_rules tr
        WHERE tr.enabled = true
        AND (
            tr.last_fired_at IS NULL 
            OR tr.last_fired_at < NOW() - INTERVAL '1 minute' * tr.cooldown_minutes
        )
        AND tr.trigger_event = %s
        """
        
        # Note: In production, you'd want a more sophisticated condition evaluator
        # This is a simplified version
        result = db.execute(query, (event_data.get('event_type'),))
        triggers = [dict(row) for row in result.fetchall()]
        
        matching_triggers = []
        for trigger in triggers:
            # Simple condition matching (would be more complex in production)
            conditions = json.loads(trigger['conditions'])
            if DatabaseUtils._check_conditions(event_data, conditions):
                matching_triggers.append(trigger)
        
        return matching_triggers
    
    @staticmethod
    def _check_conditions(event_data: Dict, conditions: Dict) -> bool:
        """
        Simple condition checker (would be replaced with full expression evaluator)
        """
        # This is a simplified version - production would use a proper expression engine
        for key, condition in conditions.items():
            if key in event_data:
                if isinstance(condition, dict):
                    for op, value in condition.items():
                        if op == "$gt" and event_data[key] <= value:
                            return False
                        elif op == "$lt" and event_data[key] >= value:
                            return False
                        elif op == "$eq" and event_data[key] != value:
                            return False
                elif event_data[key] != condition:
                    return False
        return True
    
    @staticmethod
    def get_agent_memories(db, agent_id: str, memory_type: Optional[str] = None,
                          min_confidence: float = 0.6, limit: int = 10) -> List[Dict]:
        """
        Get agent memories with confidence filtering
        """
        query = """
        SELECT *
        FROM ops_agent_memory
        WHERE agent_id = %s
        AND confidence >= %s
        AND promoted = true
        """
        
        params = [agent_id, min_confidence]
        
        if memory_type:
            query += " AND type = %s"
            params.append(memory_type)
        
        query += " ORDER BY confidence DESC, updated_at DESC LIMIT %s"
        params.append(limit)
        
        result = db.execute(query, params)
        return [dict(row) for row in result.fetchall()]
    
    @staticmethod
    def record_trade_outcome(db, trade_id: UUID, entry_price: float, exit_price: float,
                            pnl: float, pnl_percent: float, hold_time_seconds: Optional[int],
                            outcome_type: str, lessons_learned: List[str] = None) -> UUID:
        """
        Record trade outcome for learning
        """
        query = """
        INSERT INTO ops_trade_outcomes
        (trade_id, entry_price, exit_price, pnl, pnl_percent, 
         hold_time_seconds, outcome_type, lessons_learned)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (trade_id) DO UPDATE SET
            exit_price = EXCLUDED.exit_price,
            pnl = EXCLUDED.pnl,
            pnl_percent = EXCLUDED.pnl_percent,
            hold_time_seconds = EXCLUDED.hold_time_seconds,
            outcome_type = EXCLUDED.outcome_type,
            lessons_learned = EXCLUDED.lessons_learned
        RETURNING id
        """
        
        result = db.execute(query, (
            trade_id, entry_price, exit_price, pnl, pnl_percent,
            hold_time_seconds, outcome_type, lessons_learned or []
        ))
        return result.fetchone()[0]
    
    @staticmethod
    def get_open_positions(db) -> List[Dict]:
        """
        Get all open positions with current P&L
        """
        query = """
        SELECT *, 
               (current_price - entry_price) / entry_price * 100 as pnl_percent_calc
        FROM ops_positions
        WHERE status = 'open'
        ORDER BY opened_at DESC
        """
        
        result = db.execute(query)
        return [dict(row) for row in result.fetchall()]
    
    @staticmethod
    def update_position_price(db, position_id: UUID, current_price: float) -> bool:
        """
        Update position current price and recalculate P&L
        """
        query = """
        UPDATE ops_positions
        SET current_price = %s,
            unrealized_pnl = (size * (%s - entry_price)),
            unrealized_pnl_percent = ((%s - entry_price) / entry_price * 100),
            updated_at = NOW()
        WHERE id = %s
        RETURNING id
        """
        
        result = db.execute(query, (current_price, current_price, current_price, position_id))
        return result.rowcount > 0
    
    @staticmethod
    def get_system_stats(db) -> Dict:
        """
        Get system statistics for monitoring
        """
        stats = {}
        
        # Proposal stats
        proposal_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
        FROM ops_trading_proposals
        WHERE created_at > NOW() - INTERVAL '24 hours'
        """
        stats['proposals'] = dict(db.execute(proposal_query).fetchone())
        
        # Mission stats
        mission_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
            COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM ops_missions
        WHERE created_at > NOW() - INTERVAL '24 hours'
        """
        stats['missions'] = dict(db.execute(mission_query).fetchone())
        
        # Step stats
        step_query = """
        SELECT 
            kind,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
            COUNT(CASE WHEN status = 'running' THEN 1 END) as running
        FROM ops_mission_steps
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY kind
        """
        stats['steps'] = [dict(row) for row in db.execute(step_query).fetchall()]
        
        # Position stats
        position_query = """
        SELECT 
            COUNT(*) as total_open,
            COALESCE(SUM(unrealized_pnl), 0) as total_unrealized_pnl,
            COALESCE(AVG(unrealized_pnl_percent), 0) as avg_pnl_percent
        FROM ops_positions
        WHERE status = 'open'
        """
        stats['positions'] = dict(db.execute(position_query).fetchone())
        
        return stats
    
    @staticmethod
    def cleanup_stale_data(db, days_to_keep: int = 30):
        """
        Clean up old data while keeping essential records
        """
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        # Archive and delete old events (keep high-impact events longer)
        events_query = """
        DELETE FROM ops_agent_events
        WHERE created_at < %s
        AND NOT (tags && ARRAY['big_win', 'big_loss', 'system_alert'])
        """
        db.execute(events_query, (cutoff_date,))
        
        # Archive old action runs (keep failures for debugging)
        action_runs_query = """
        DELETE FROM ops_action_runs
        WHERE created_at < %s
        AND status = 'success'
        """
        db.execute(action_runs_query, (cutoff_date,))
        
        logger.info(f"Cleaned up data older than {cutoff_date}")


# Example usage
if __name__ == "__main__":
    # This would be replaced with actual database connection
    class MockDB:
        def execute(self, query, params=None):
            print(f"Query: {query}")
            print(f"Params: {params}")
            return self
        
        def fetchone(self):
            return {'id': 'mock-uuid'}
        
        def fetchall(self):
            return []
        
        @property
        def rowcount(self):
            return 1
    
    db = MockDB()
    utils = DatabaseUtils()
    
    # Example: Create a proposal
    proposal_id = utils.create_proposal(
        db=db,
        agent_id="intel",
        title="BTC accumulation signal",
        signal_type="KOL_accumulation",
        entry_price=45000.50,
        target_price=48000.00,
        stop_loss=44000.00,
        proposed_steps=[
            {"kind": "analyze", "assigned_to": "sage"},
            {"kind": "execute_trade", "assigned_to": "scout"}
        ]
    )
    
    print(f"Created proposal: {proposal_id}")