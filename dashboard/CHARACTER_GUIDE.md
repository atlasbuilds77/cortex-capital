# Character Assets - Cortex Capital Dashboard

**Saved:** Feb 7, 2026 23:53 PST  
**Purpose:** Visual identity for team members and AI agents

---

## Team Avatars (Founders)

Location: `/public/team-avatars/`

### atlas.jpg (92KB)
**Visual:** Tactical titan in full combat gear, holding ⚡ lightning bolt, holographic data screen
**Style:** Pixel art, blue/electric theme
**Represents:** Atlas (AI Coordinator) - The strategic operator, data-driven, execution-focused

### orion.jpg (62KB)
**Visual:** Creative builder in hoodie, holding laptop, glowing orb on wrist, tattoos visible
**Style:** Pixel art, warm/neutral tones
**Represents:** Orion/Hunter (Founder) - The creative visionary, builder, architect

### carlos.jpg (52KB)
**Visual:** Casual confident pose, phone out, chain necklace, relaxed stance
**Style:** More photorealistic pixel art
**Represents:** Carlos (Co-founder) - War Machine, the connector, business strategist

---

## Agent Avatars (AI Personalities)

Location: `/public/agent-avatars/`

### agent-01.jpg (41KB)
**Visual:** Steve Jobs-style figure holding floppy disk
**Suggested Role:** SAGE (Risk Management) - Classic wisdom, measured approach

### agent-02.png (379KB)
**Visual:** Monitor head typing at keyboard
**Suggested Role:** ATLAS (Coordinator) - Always working, data-focused

### agent-03.jpg (76KB)
**Visual:** UFO robot holding data blocks
**Suggested Role:** INTEL (Intelligence) - Alien tech, scanning everything

### agent-04.jpg (64KB)
**Visual:** Stressed trader on phone
**Suggested Role:** SCOUT (Execution) - In the trenches, fast-paced

### agent-05.jpg (95KB)
**Visual:** Zen hacker meditating
**Suggested Role:** SAGE (Risk Management) - Calm under pressure, balanced

### agent-06.jpg (76KB)
**Visual:** Social media head with notification icons
**Suggested Role:** SOCIAL (Community) - Always connected, engagement-focused

### agent-07.jpg (106KB)
**Visual:** Server strongman lifting servers
**Suggested Role:** GROWTH (Analytics) - Heavy data processing, infrastructure

### agent-08.png (319KB)
**Visual:** Camera lens head (observer)
**Suggested Role:** OBSERVER (Quality Control) - Watches everything, sees patterns

### agent-09.jpg (89KB)
**Visual:** Wizard hacker with binary beard
**Suggested Role:** X-ALT (Twitter Intelligence) - Mystical, data magic

### agent-10.jpg (64KB)
**Visual:** Rainbow creative (artist/designer)
**Suggested Role:** CREATIVE (Design) - Colorful, expressive, artistic

---

## Cortex Capital Agent Roster

For reference, the 10 agents in the system:

1. **ATLAS** - Coordinator (monitor head or tactical titan)
2. **SAGE** - Risk Management (zen hacker or Steve Jobs wisdom)
3. **SCOUT** - Execution (stressed trader or UFO robot)
4. **GROWTH** - Analytics (server strongman)
5. **INTEL** - Intelligence (UFO robot or wizard)
6. **OBSERVER** - Quality Control (camera lens head)
7. **X-ALT** - Twitter Intelligence (wizard hacker)
8. **CONTENT** - Content Creation (rainbow creative)
9. **SOCIAL** - Community Management (social media head)
10. **CREATIVE** - Design (rainbow creative)

---

## Implementation Ideas

### Team Page
- Hero section with all 3 founders
- Atlas + Orion + Carlos with bios
- "The team behind Cortex Capital"

### Agent Dashboard
- Replace emoji avatars with pixel art characters
- Each agent card shows its character
- Animated on hover/active state

### About Section
- Team intro with avatars
- "Human + AI partnership" narrative
- Visual storytelling

### Brand Materials
- Social media profiles
- Marketing graphics
- Pitch decks

### Status Indicators
- Agent character + status badge
- Active = glowing border
- Idle = dimmed
- Working = animated

---

## Technical Notes

**Formats:** Mix of JPG (most) and PNG (2 files: agent-02, agent-08)  
**Sizes:** 41KB - 379KB (all web-optimized)  
**Style:** Consistent pixel art aesthetic  
**Theme:** Tech/hacker/trading fusion

**Next.js Usage:**
```tsx
import Image from 'next/image'

<Image 
  src="/team-avatars/atlas.jpg" 
  alt="Atlas - AI Coordinator"
  width={200} 
  height={200}
/>
```

---

**Status:** All assets saved and catalogued  
**Ready for:** Dashboard integration whenever Orion gives direction  
**Potential:** Team page, agent personalities, brand identity, marketing
