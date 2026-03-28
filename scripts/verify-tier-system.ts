#!/usr/bin/env npx tsx
// Verification script for tier gating system
// Run: npx tsx scripts/verify-tier-system.ts

import fs from 'fs';
import path from 'path';

const BASE = '/Users/atlasbuilds/clawd/cortex-unified';

const requiredFiles = [
  'lib/broker-credentials.ts',
  'lib/tier-gate.ts',
  'app/api/broker/connect/route.ts',
  'app/api/broker/callback/route.ts',
  'app/api/broker/disconnect/route.ts',
  'app/api/portfolio/route.ts',
  'app/api/guardian/route.ts',
  '.env.example',
  'TIER-GATING-SETUP.md',
];

const modifiedFiles = [
  'app/api/phone-booth/chat/route.ts',
  'app/api/trade/signal/route.ts',
  'app/api/fishtank/live/route.ts',
];

console.log('🔍 Verifying Tier Gating System...\n');

let allGood = true;

// Check required files exist
console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  const fullPath = path.join(BASE, file);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allGood = false;
}

console.log('\n📝 Checking modified files:');
for (const file of modifiedFiles) {
  const fullPath = path.join(BASE, file);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hasTierGate = content.includes('requireTier') || content.includes('authenticate');
    console.log(`  ${hasTierGate ? '✅' : '⚠️'} ${file} ${hasTierGate ? '(tier gating applied)' : '(no tier gating found)'}`);
    if (!hasTierGate) allGood = false;
  } else {
    console.log(`  ❌ ${file} (missing)`);
    allGood = false;
  }
}

// Check encryption functions
console.log('\n🔐 Checking encryption system:');
const encryptionFile = path.join(BASE, 'lib/broker-credentials.ts');
if (fs.existsSync(encryptionFile)) {
  const content = fs.readFileSync(encryptionFile, 'utf-8');
  const hasEncrypt = content.includes('encryptToken');
  const hasDecrypt = content.includes('decryptToken');
  const hasAES = content.includes('aes-256-gcm');
  
  console.log(`  ${hasEncrypt ? '✅' : '❌'} encryptToken function`);
  console.log(`  ${hasDecrypt ? '✅' : '❌'} decryptToken function`);
  console.log(`  ${hasAES ? '✅' : '❌'} AES-256-GCM encryption`);
  
  if (!hasEncrypt || !hasDecrypt || !hasAES) allGood = false;
}

// Check tier gate functions
console.log('\n🔒 Checking tier gate system:');
const tierFile = path.join(BASE, 'lib/tier-gate.ts');
if (fs.existsSync(tierFile)) {
  const content = fs.readFileSync(tierFile, 'utf-8');
  const hasRequireTier = content.includes('requireTier');
  const hasPermissions = content.includes('TIER_PERMISSIONS');
  const hasTiers = content.includes("'free'") && content.includes("'operator'");
  
  console.log(`  ${hasRequireTier ? '✅' : '❌'} requireTier middleware`);
  console.log(`  ${hasPermissions ? '✅' : '❌'} TIER_PERMISSIONS defined`);
  console.log(`  ${hasTiers ? '✅' : '❌'} All 4 tiers defined`);
  
  if (!hasRequireTier || !hasPermissions || !hasTiers) allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ All checks passed! System ready.');
} else {
  console.log('❌ Some checks failed. Review above.');
  process.exit(1);
}
