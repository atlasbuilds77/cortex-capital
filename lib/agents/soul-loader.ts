import * as fs from 'fs';
import * as path from 'path';

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive' | 'ultra_aggressive';

function normalizeAgentId(agentId: string) {
  const normalized = String(agentId || '').trim().replace(/\s+/g, '_');
  return {
    upper: normalized.toUpperCase(),
    lower: normalized.toLowerCase(),
  };
}

function candidateDirs() {
  return [
    path.join(process.cwd(), 'agents', 'souls', 'profiles'), // Profile-specific souls first
    path.join(process.cwd(), 'agents', 'souls'),             // Then base souls
    path.join(process.cwd(), 'lib', 'agents', 'SOULS'),
    path.join(process.cwd(), 'agents', 'SOULS'),
  ];
}

/**
 * Load agent soul with optional risk profile override
 * 
 * Priority:
 * 1. Profile-specific soul: ANALYST-aggressive.soul.md
 * 2. Base soul: ANALYST.soul.md
 * 
 * @param agentId - Agent identifier (e.g., "ANALYST", "STRATEGIST")
 * @param riskProfile - Optional risk profile to load profile-specific soul
 * @param maxChars - Optional character limit
 */
export function loadAgentSoul(
  agentId: string, 
  riskProfile?: RiskProfile | string,
  maxChars?: number
): string {
  const { upper, lower } = normalizeAgentId(agentId);
  
  // Build candidate files - profile-specific first, then fallback to base
  const candidateFiles: string[] = [];
  
  if (riskProfile) {
    const profile = riskProfile.toLowerCase();
    candidateFiles.push(
      `${upper}-${profile}.soul.md`,
      `${lower}-${profile}.soul.md`,
    );
  }
  
  // Always include base souls as fallback
  candidateFiles.push(
    `${upper}.soul.md`,
    `${lower}.soul.md`,
    `${lower}.md`,
    `${upper}.md`,
  );

  for (const dir of candidateDirs()) {
    for (const file of candidateFiles) {
      const fullPath = path.join(dir, file);
      try {
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf-8');
        console.log(`[SoulLoader] Loaded ${file} for ${agentId}${riskProfile ? ` (${riskProfile})` : ''}`);
        return typeof maxChars === 'number' ? content.slice(0, maxChars) : content;
      } catch {
        // Keep searching other candidate paths.
      }
    }
  }

  console.warn(`[SoulLoader] No soul found for ${agentId}`);
  return '';
}

/**
 * Check if a profile-specific soul exists for an agent
 */
export function hasProfileSoul(agentId: string, riskProfile: RiskProfile): boolean {
  const { upper } = normalizeAgentId(agentId);
  const profile = riskProfile.toLowerCase();
  
  for (const dir of candidateDirs()) {
    const fullPath = path.join(dir, `${upper}-${profile}.soul.md`);
    if (fs.existsSync(fullPath)) return true;
  }
  
  return false;
}
