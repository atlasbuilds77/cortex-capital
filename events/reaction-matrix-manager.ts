// Reaction matrix manager: loads patterns from ops_policy and matches events
import { Event, ReactionPattern, ReactionMatrix } from './types';

export class ReactionMatrixManager {
  private db: any; // Database connection - to be injected
  private matrix: ReactionMatrix | null = null;
  private lastLoaded: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  
  constructor(db: any) {
    this.db = db;
  }
  
  /**
   * Load reaction matrix from ops_policy table
   */
  async loadReactionMatrix(): Promise<ReactionMatrix> {
    // Check cache first
    if (this.matrix && this.lastLoaded) {
      const cacheAge = Date.now() - this.lastLoaded.getTime();
      if (cacheAge < this.CACHE_TTL) {
        return this.matrix;
      }
    }
    
    try {
      // Load from ops_policy where key = 'reaction_matrix'
      const result = await this.db('ops_policy')
        .where({ key: 'reaction_matrix' })
        .first();
      
      if (!result) {
        // Return default matrix if not found in DB
        console.warn('No reaction matrix found in ops_policy, using default');
        this.matrix = this.getDefaultMatrix();
      } else {
        // Parse JSON value from ops_policy
        this.matrix = JSON.parse(result.value) as ReactionMatrix;
      }
      
      this.lastLoaded = new Date();
      console.log(`✅ Reaction matrix loaded with ${this.matrix.patterns.length} patterns`);
      return this.matrix;
    } catch (error) {
      console.error('Failed to load reaction matrix:', error);
      // Fall back to default matrix
      this.matrix = this.getDefaultMatrix();
      return this.matrix;
    }
  }
  
  /**
   * Get the default reaction matrix from ARCHITECTURE.md
   */
  private getDefaultMatrix(): ReactionMatrix {
    return {
      patterns: [
        {
          source: "*",
          tags: ["trade", "big_loss"],
          target: "sage",
          type: "diagnose",
          probability: 1.0,
          cooldown: 60
        },
        {
          source: "intel",
          tags: ["signal", "high_confidence"],
          target: "atlas",
          type: "evaluate",
          probability: 0.8,
          cooldown: 30
        },
        {
          source: "scout",
          tags: ["trade", "executed"],
          target: "growth",
          type: "analyze",
          probability: 0.3,
          cooldown: 120
        },
        {
          source: "sage",
          tags: ["risk", "warning"],
          target: "atlas",
          type: "review",
          probability: 1.0,
          cooldown: 15
        },
        {
          source: "growth",
          tags: ["insight", "pattern"],
          target: "atlas",
          type: "propose_strategy",
          probability: 0.6,
          cooldown: 180
        },
        {
          source: "observer",
          tags: ["error", "rule_violation"],
          target: "atlas",
          type: "alert",
          probability: 1.0,
          cooldown: 5
        }
      ]
    };
  }
  
  /**
   * Match an event against reaction patterns
   * @param event The event to match
   * @returns Array of matching patterns
   */
  matchEvent(event: Event, patterns?: ReactionPattern[]): ReactionPattern[] {
    const matrix = patterns || this.matrix?.patterns;
    if (!matrix) {
      console.warn('No reaction matrix loaded');
      return [];
    }
    
    const matches: ReactionPattern[] = [];
    
    for (const pattern of matrix) {
      if (this.doesEventMatchPattern(event, pattern)) {
        matches.push(pattern);
      }
    }
    
    return matches;
  }
  
  /**
   * Check if an event matches a specific pattern
   */
  private doesEventMatchPattern(event: Event, pattern: ReactionPattern): boolean {
    // Check source (wildcard "*" matches any source)
    if (pattern.source !== "*" && pattern.source !== event.agent_id) {
      return false;
    }
    
    // Check tags - all pattern tags must be present in event tags
    for (const requiredTag of pattern.tags) {
      if (!event.tags.includes(requiredTag)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get all patterns for a specific target agent
   */
  getPatternsForTarget(targetAgent: string): ReactionPattern[] {
    if (!this.matrix) return [];
    
    return this.matrix.patterns.filter(pattern => pattern.target === targetAgent);
  }
  
  /**
   * Get all patterns from a specific source agent
   */
  getPatternsFromSource(sourceAgent: string): ReactionPattern[] {
    if (!this.matrix) return [];
    
    return this.matrix.patterns.filter(pattern => 
      pattern.source === sourceAgent || pattern.source === "*"
    );
  }
  
  /**
   * Add a new pattern to the matrix (and optionally save to DB)
   */
  async addPattern(pattern: ReactionPattern, saveToDb: boolean = false): Promise<void> {
    if (!this.matrix) {
      await this.loadReactionMatrix();
    }
    
    this.matrix!.patterns.push(pattern);
    
    if (saveToDb) {
      await this.saveMatrixToDb();
    }
  }
  
  /**
   * Remove a pattern from the matrix (and optionally save to DB)
   */
  async removePattern(patternIndex: number, saveToDb: boolean = false): Promise<void> {
    if (!this.matrix || patternIndex < 0 || patternIndex >= this.matrix.patterns.length) {
      throw new Error('Invalid pattern index');
    }
    
    this.matrix.patterns.splice(patternIndex, 1);
    
    if (saveToDb) {
      await this.saveMatrixToDb();
    }
  }
  
  /**
   * Save the current matrix to ops_policy table
   */
  private async saveMatrixToDb(): Promise<void> {
    try {
      const matrixJson = JSON.stringify(this.matrix);
      
      // Upsert into ops_policy
      await this.db('ops_policy')
        .insert({
          key: 'reaction_matrix',
          value: matrixJson,
          updated_at: new Date()
        })
        .onConflict('key')
        .merge(['value', 'updated_at']);
      
      console.log('✅ Reaction matrix saved to database');
    } catch (error) {
      console.error('Failed to save reaction matrix:', error);
      throw error;
    }
  }
  
  /**
   * Get the current matrix (loads if not already loaded)
   */
  async getMatrix(): Promise<ReactionMatrix> {
    if (!this.matrix) {
      await this.loadReactionMatrix();
    }
    return this.matrix!;
  }
}