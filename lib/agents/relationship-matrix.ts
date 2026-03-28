import * as fs from 'fs';
import * as path from 'path';

export enum AgentType {
  ANALYST = 'ANALYST',
  STRATEGIST = 'STRATEGIST',
  DAY_TRADER = 'DAY_TRADER',
  MOMENTUM = 'MOMENTUM',
  RISK = 'RISK',
  EXECUTOR = 'EXECUTOR',
  REPORTER = 'REPORTER'
}

export enum RelationshipLabel {
  RIVALS = 'Rivals',
  TENSE = 'Tense',
  CORDIAL = 'Cordial',
  ALLIES = 'Allies',
  PARTNERS = 'Partners'
}

export enum RelationshipEvent {
  TRADE_SUCCESS = 'Trade success together',
  TRADE_FAILURE = 'Trade failure together',
  CONSTRUCTIVE_CHALLENGE = 'Agent challenges another constructively',
  IGNORED_ADVICE_LOSS = 'Agent ignores another\'s advice leading to loss',
  WINNING_COLLABORATION = 'Collaboration on winning trade'
}

interface RelationshipData {
  score: number;
  interactions: InteractionLog[];
}

interface InteractionLog {
  timestamp: string;
  delta: number;
  reason: string;
  previousScore: number;
  newScore: number;
}

interface RelationshipShift {
  agentA: AgentType;
  agentB: AgentType;
  timestamp: string;
  delta: number;
  reason: string;
  previousScore: number;
  newScore: number;
  previousLabel: RelationshipLabel;
  newLabel: RelationshipLabel;
}

interface MatrixState {
  relationships: Record<string, RelationshipData>;
  lastUpdated: string;
}

export class RelationshipMatrix {
  private static instance: RelationshipMatrix;
  private dataPath: string;
  private relationships: Map<string, RelationshipData>;
  private recentShifts: RelationshipShift[];
  
  // Relationship evolution rules
  private readonly EVOLUTION_RULES = {
    [RelationshipEvent.TRADE_SUCCESS]: 3,
    [RelationshipEvent.TRADE_FAILURE]: -2,
    [RelationshipEvent.CONSTRUCTIVE_CHALLENGE]: 1,
    [RelationshipEvent.IGNORED_ADVICE_LOSS]: -5,
    [RelationshipEvent.WINNING_COLLABORATION]: 5
  };

  private constructor() {
    this.dataPath = path.join(__dirname, 'data', 'relationships.json');
    this.relationships = new Map();
    this.recentShifts = [];
    this.initialize();
  }

  public static getInstance(): RelationshipMatrix {
    if (!RelationshipMatrix.instance) {
      RelationshipMatrix.instance = new RelationshipMatrix();
    }
    return RelationshipMatrix.instance;
  }

  private initialize(): void {
    // Load existing data or create default
    if (fs.existsSync(this.dataPath)) {
      this.load();
    } else {
      this.initializeDefaults();
      this.save();
    }
  }

  private initializeDefaults(): void {
    const agents = Object.values(AgentType);
    
    // Create all pair combinations
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const key = this.getKey(agents[i], agents[j]);
        this.relationships.set(key, {
          score: 50, // Neutral starting point
          interactions: []
        });
      }
    }
  }

  private getKey(agentA: AgentType, agentB: AgentType): string {
    // Ensure consistent ordering for bidirectional relationships
    return [agentA, agentB].sort().join('::');
  }

  private getLabel(score: number): RelationshipLabel {
    if (score <= 20) return RelationshipLabel.RIVALS;
    if (score <= 40) return RelationshipLabel.TENSE;
    if (score <= 60) return RelationshipLabel.CORDIAL;
    if (score <= 80) return RelationshipLabel.ALLIES;
    return RelationshipLabel.PARTNERS;
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  public getRelationship(agentA: AgentType, agentB: AgentType): {
    score: number;
    label: RelationshipLabel;
    interactions: InteractionLog[];
  } {
    const key = this.getKey(agentA, agentB);
    const data = this.relationships.get(key);
    
    if (!data) {
      throw new Error(`No relationship found between ${agentA} and ${agentB}`);
    }

    return {
      score: data.score,
      label: this.getLabel(data.score),
      interactions: [...data.interactions] // Return copy
    };
  }

  public updateRelationship(
    agentA: AgentType,
    agentB: AgentType,
    delta: number,
    reason: string
  ): void {
    const key = this.getKey(agentA, agentB);
    const data = this.relationships.get(key);
    
    if (!data) {
      throw new Error(`No relationship found between ${agentA} and ${agentB}`);
    }

    const previousScore = data.score;
    const previousLabel = this.getLabel(previousScore);
    const newScore = this.clampScore(previousScore + delta);
    const newLabel = this.getLabel(newScore);

    // Log the interaction
    const interaction: InteractionLog = {
      timestamp: new Date().toISOString(),
      delta,
      reason,
      previousScore,
      newScore
    };

    data.score = newScore;
    data.interactions.push(interaction);

    // Track as a shift for recent changes
    this.recentShifts.push({
      agentA,
      agentB,
      timestamp: interaction.timestamp,
      delta,
      reason,
      previousScore,
      newScore,
      previousLabel,
      newLabel
    });

    // Keep only last 100 shifts in memory
    if (this.recentShifts.length > 100) {
      this.recentShifts.shift();
    }

    this.save();
  }

  public applyEvolutionRule(
    agentA: AgentType,
    agentB: AgentType,
    event: RelationshipEvent
  ): void {
    const delta = this.EVOLUTION_RULES[event];
    this.updateRelationship(agentA, agentB, delta, event);
  }

  public getMatrix(): Record<string, {
    agentA: AgentType;
    agentB: AgentType;
    score: number;
    label: RelationshipLabel;
    interactionCount: number;
  }> {
    const matrix: Record<string, any> = {};
    
    for (const [key, data] of this.relationships.entries()) {
      const [agentA, agentB] = key.split('::') as [AgentType, AgentType];
      matrix[key] = {
        agentA,
        agentB,
        score: data.score,
        label: this.getLabel(data.score),
        interactionCount: data.interactions.length
      };
    }

    return matrix;
  }

  public getRecentShifts(limit: number = 10): RelationshipShift[] {
    return this.recentShifts
      .slice(-limit)
      .reverse(); // Most recent first
  }

  private save(): void {
    const state: MatrixState = {
      relationships: Object.fromEntries(this.relationships),
      lastUpdated: new Date().toISOString()
    };

    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.dataPath, JSON.stringify(state, null, 2));
  }

  private load(): void {
    const raw = fs.readFileSync(this.dataPath, 'utf-8');
    const state: MatrixState = JSON.parse(raw);
    
    this.relationships = new Map(Object.entries(state.relationships));
    
    // Rebuild recent shifts from last 100 interactions across all relationships
    const allInteractions: Array<{
      key: string;
      interaction: InteractionLog;
    }> = [];

    for (const [key, data] of this.relationships.entries()) {
      data.interactions.forEach(interaction => {
        allInteractions.push({ key, interaction });
      });
    }

    // Sort by timestamp and take last 100
    allInteractions
      .sort((a, b) => 
        new Date(a.interaction.timestamp).getTime() - 
        new Date(b.interaction.timestamp).getTime()
      )
      .slice(-100)
      .forEach(({ key, interaction }) => {
        const [agentA, agentB] = key.split('::') as [AgentType, AgentType];
        this.recentShifts.push({
          agentA,
          agentB,
          timestamp: interaction.timestamp,
          delta: interaction.delta,
          reason: interaction.reason,
          previousScore: interaction.previousScore,
          newScore: interaction.newScore,
          previousLabel: this.getLabel(interaction.previousScore),
          newLabel: this.getLabel(interaction.newScore)
        });
      });
  }

  // Utility method to get all relationships for a specific agent
  public getAgentRelationships(agent: AgentType): Array<{
    partner: AgentType;
    score: number;
    label: RelationshipLabel;
  }> {
    const results: Array<{
      partner: AgentType;
      score: number;
      label: RelationshipLabel;
    }> = [];

    for (const [key, data] of this.relationships.entries()) {
      const [agentA, agentB] = key.split('::') as [AgentType, AgentType];
      
      if (agentA === agent) {
        results.push({
          partner: agentB,
          score: data.score,
          label: this.getLabel(data.score)
        });
      } else if (agentB === agent) {
        results.push({
          partner: agentA,
          score: data.score,
          label: this.getLabel(data.score)
        });
      }
    }

    return results.sort((a, b) => b.score - a.score); // Highest scores first
  }

  // Reset all relationships to neutral (for testing or fresh start)
  public resetAll(): void {
    for (const data of this.relationships.values()) {
      data.score = 50;
      data.interactions = [];
    }
    this.recentShifts = [];
    this.save();
  }
}

// Export singleton instance
export const relationshipMatrix = RelationshipMatrix.getInstance();
