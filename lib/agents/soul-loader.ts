import * as fs from 'fs';
import * as path from 'path';

function normalizeAgentId(agentId: string) {
  const normalized = String(agentId || '').trim().replace(/\s+/g, '_');
  return {
    upper: normalized.toUpperCase(),
    lower: normalized.toLowerCase(),
  };
}

function candidateDirs() {
  return [
    path.join(process.cwd(), 'lib', 'agents', 'SOULS'),
    path.join(process.cwd(), 'agents', 'SOULS'),
  ];
}

export function loadAgentSoul(agentId: string, maxChars?: number): string {
  const { upper, lower } = normalizeAgentId(agentId);
  const candidateFiles = [
    `${upper}.soul.md`,
    `${lower}.soul.md`,
    `${lower}.md`,
    `${upper}.md`,
  ];

  for (const dir of candidateDirs()) {
    for (const file of candidateFiles) {
      const fullPath = path.join(dir, file);
      try {
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf-8');
        return typeof maxChars === 'number' ? content.slice(0, maxChars) : content;
      } catch {
        // Keep searching other candidate paths.
      }
    }
  }

  return '';
}
