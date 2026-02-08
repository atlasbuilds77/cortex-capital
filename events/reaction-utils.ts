// Reaction utilities: cooldown management and probability checks
import { CooldownKey, CooldownRecord } from './types';

export class ReactionUtils {
  private cooldownStore: Map<string, CooldownRecord> = new Map();
  
  /**
   * Generate a unique key for cooldown tracking
   */
  private getCooldownKey(source: string, target: string, type: string): string {
    return `${source}:${target}:${type}`;
  }
  
  /**
   * Check if a reaction is on cooldown
   * Returns true if cooldown is active, false if it's okay to trigger
   */
  checkReactionCooldown(source: string, target: string, type: string): boolean {
    const key = this.getCooldownKey(source, target, type);
    const record = this.cooldownStore.get(key);
    
    if (!record) {
      return false; // No cooldown record exists
    }
    
    // Check if cooldown has expired
    if (new Date() > record.expires_at) {
      this.cooldownStore.delete(key);
      return false; // Cooldown expired
    }
    
    return true; // Cooldown is still active
  }
  
  /**
   * Set a cooldown for a reaction
   * @param source Source agent ID
   * @param target Target agent ID
   * @param type Reaction type
   * @param cooldownMinutes Cooldown duration in minutes
   */
  setReactionCooldown(source: string, target: string, type: string, cooldownMinutes: number): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
    
    const key = this.getCooldownKey(source, target, type);
    const record: CooldownRecord = {
      key: { source, target, type },
      last_triggered: now,
      expires_at: expiresAt
    };
    
    this.cooldownStore.set(key, record);
  }
  
  /**
   * Clean up expired cooldowns
   */
  cleanupExpiredCooldowns(): number {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, record] of this.cooldownStore.entries()) {
      if (now > record.expires_at) {
        this.cooldownStore.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Roll probability dice
   * @param probability Probability value between 0.0 and 1.0
   * @returns true if probability check passes
   */
  rollProbability(probability: number): boolean {
    if (probability >= 1.0) return true;
    if (probability <= 0.0) return false;
    
    return Math.random() < probability;
  }
  
  /**
   * Get active cooldowns (for debugging/monitoring)
   */
  getActiveCooldowns(): CooldownRecord[] {
    const now = new Date();
    const active: CooldownRecord[] = [];
    
    for (const record of this.cooldownStore.values()) {
      if (now <= record.expires_at) {
        active.push(record);
      }
    }
    
    return active;
  }
  
  /**
   * Clear all cooldowns (for testing/reset)
   */
  clearAllCooldowns(): void {
    this.cooldownStore.clear();
  }
}