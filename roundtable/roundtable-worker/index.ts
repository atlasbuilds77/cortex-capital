/**
 * Roundtable Worker
 * 
 * Polls ops_roundtable_queue every 30 seconds
 * Claims pending conversations atomically
 * Executes orchestration
 * Marks succeeded/failed
 */

import { ConversationOrchestrator, ConversationSession } from '../orchestrator';
import { OrchestratorConfig } from '../orchestrator';

export interface RoundtableQueueEntry {
  id: string;
  format: string;
  participants?: string[];
  topic?: string;
  status: 'pending' | 'claimed' | 'running' | 'succeeded' | 'failed';
  claimed_by?: string;
  claimed_at?: number;
  created_at: number;
  metadata?: any;
}

export interface WorkerConfig {
  workerId: string;
  pollIntervalMs: number;
  maxConcurrentConversations: number;
  db: {
    getPendingConversations: () => Promise<RoundtableQueueEntry[]>;
    claimConversation: (id: string, workerId: string) => Promise<boolean>;
    updateConversationStatus: (id: string, status: RoundtableQueueEntry['status'], result?: any) => Promise<void>;
  };
  orchestratorConfig: OrchestratorConfig;
}

export class RoundtableWorker {
  private config: WorkerConfig;
  private orchestrator: ConversationOrchestrator;
  private isRunning: boolean = false;
  private activeConversations: Map<string, Promise<void>> = new Map();
  
  constructor(config: WorkerConfig) {
    this.config = config;
    this.orchestrator = new ConversationOrchestrator(config.orchestratorConfig);
  }
  
  async start(): Promise<void> {
    console.log(`Starting roundtable worker ${this.config.workerId}`);
    this.isRunning = true;
    
    // Start polling loop
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
      } catch (error) {
        console.error('Error in poll cycle:', error);
      }
      
      // Wait for next poll
      await this.delay(this.config.pollIntervalMs);
    }
  }
  
  stop(): void {
    console.log(`Stopping roundtable worker ${this.config.workerId}`);
    this.isRunning = false;
  }
  
  private async pollAndProcess(): Promise<void> {
    // Check if we can handle more conversations
    if (this.activeConversations.size >= this.config.maxConcurrentConversations) {
      console.log(`At capacity (${this.activeConversations.size}/${this.config.maxConcurrentConversations}), skipping poll`);
      return;
    }
    
    // Get pending conversations
    const pending = await this.config.db.getPendingConversations();
    console.log(`Found ${pending.length} pending conversations`);
    
    // Try to claim and process each one
    for (const queueEntry of pending) {
      if (this.activeConversations.size >= this.config.maxConcurrentConversations) {
        break; // At capacity
      }
      
      // Try to claim atomically
      const claimed = await this.config.db.claimConversation(queueEntry.id, this.config.workerId);
      if (!claimed) {
        console.log(`Failed to claim conversation ${queueEntry.id}, likely claimed by another worker`);
        continue;
      }
      
      console.log(`Claimed conversation ${queueEntry.id}`);
      
      // Process the conversation
      const processingPromise = this.processConversation(queueEntry)
        .finally(() => {
          // Clean up when done
          this.activeConversations.delete(queueEntry.id);
        });
      
      this.activeConversations.set(queueEntry.id, processingPromise);
    }
  }
  
  private async processConversation(queueEntry: RoundtableQueueEntry): Promise<void> {
    console.log(`Processing conversation ${queueEntry.id} (format: ${queueEntry.format})`);
    
    try {
      // Update status to running
      await this.config.db.updateConversationStatus(queueEntry.id, 'running');
      
      // Convert queue entry to session
      const session: ConversationSession = {
        id: queueEntry.id,
        format: queueEntry.format,
        participants: queueEntry.participants || [],
        topic: queueEntry.topic || '',
        history: [],
        status: 'pending',
        createdAt: queueEntry.created_at,
        metadata: {
          maxTurns: 0,
          temperature: 0.6,
          isFormal: false
        }
      };
      
      // Execute orchestration
      const result = await this.orchestrator.orchestrateConversation(session);
      
      // Mark as succeeded
      await this.config.db.updateConversationStatus(
        queueEntry.id,
        'succeeded',
        {
          history: result.history,
          completedAt: result.completedAt,
          turnCount: result.history.length,
          participants: result.participants,
          topic: result.topic
        }
      );
      
      console.log(`Conversation ${queueEntry.id} completed successfully`);
      
    } catch (error) {
      console.error(`Failed to process conversation ${queueEntry.id}:`, error);
      
      // Mark as failed
      await this.config.db.updateConversationStatus(
        queueEntry.id,
        'failed',
        {
          error: error instanceof Error ? error.message : String(error),
          failedAt: Date.now()
        }
      );
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Circuit breaker pattern
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    
    recordSuccess(): void {
      this.failures = 0;
      this.isOpen = false;
    },
    
    recordFailure(): void {
      this.failures++;
      this.lastFailure = Date.now();
      
      // Open circuit after 3 consecutive failures
      if (this.failures >= 3) {
        this.isOpen = true;
        console.warn('Circuit breaker opened after 3 consecutive failures');
        
        // Auto-reset after 5 minutes
        setTimeout(() => {
          this.isOpen = false;
          this.failures = 0;
          console.log('Circuit breaker auto-reset after 5 minutes');
        }, 5 * 60 * 1000);
      }
    },
    
    canProceed(): boolean {
      if (this.isOpen) {
        // Check if enough time has passed for half-open state
        const timeSinceFailure = Date.now() - this.lastFailure;
        if (timeSinceFailure > 2 * 60 * 1000) { // 2 minutes
          this.isOpen = false;
          return true;
        }
        return false;
      }
      return true;
    }
  };
}

// Example database adapter (to be implemented based on actual database)
export class ExampleDatabaseAdapter {
  constructor() {
    // Initialize database connection
  }
  
  async getPendingConversations(): Promise<RoundtableQueueEntry[]> {
    // Implement actual database query
    // SELECT * FROM ops_roundtable_queue WHERE status = 'pending' ORDER BY created_at LIMIT 10
    return [];
  }
  
  async claimConversation(id: string, workerId: string): Promise<boolean> {
    // Implement atomic claim
    // UPDATE ops_roundtable_queue 
    // SET status = 'claimed', claimed_by = $1, claimed_at = NOW()
    // WHERE id = $2 AND status = 'pending'
    // RETURNING id
    return true;
  }
  
  async updateConversationStatus(
    id: string, 
    status: RoundtableQueueEntry['status'], 
    result?: any
  ): Promise<void> {
    // Implement status update
    // UPDATE ops_roundtable_queue 
    // SET status = $1, result = $2, updated_at = NOW()
    // WHERE id = $3
  }
}

// Main entry point
if (require.main === module) {
  const config: WorkerConfig = {
    workerId: `worker_${process.pid}_${Date.now()}`,
    pollIntervalMs: 30000, // 30 seconds
    maxConcurrentConversations: 3,
    db: new ExampleDatabaseAdapter(),
    orchestratorConfig: {
      maxResponseLength: 120,
      minTurnDelayMs: 3000,
      maxTurnDelayMs: 8000,
      llmProvider: async (prompt: string, temperature: number) => {
        // Implement actual LLM call
        return "Mock response";
      },
      memoryProvider: async (agentId: string, topic: string) => {
        // Implement memory retrieval
        return [];
      },
      relationshipProvider: async () => {
        // Implement relationship retrieval
        return {};
      },
      relationshipUpdater: async (updates: any[]) => {
        // Implement relationship updates
      },
      memoryDistiller: async (conversation: ConversationSession) => {
        // Implement memory distillation
      },
      eventEmitter: async (event: string, data: any) => {
        // Implement event emission
      }
    }
  };
  
  const worker = new RoundtableWorker(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    worker.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    worker.stop();
    process.exit(0);
  });
  
  // Start the worker
  worker.start().catch(error => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}