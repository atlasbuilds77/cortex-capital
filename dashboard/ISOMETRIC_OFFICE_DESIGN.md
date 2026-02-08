# Isometric Pixel Art Office - Dashboard Design

**Vision:** Interactive isometric office where 10 AI trading agents work at desks, visualizing real-time trading activity through pixel art + particle effects.

**Reference:** Pixel art isometric office with glowing data streams, atmospheric lighting, characters working

---

## Office Layout (Floor Plan)

### 10 Agent Workstations

**Layout Pattern:** Open office, clustered by function

```
         [TREES/PLANTS]
    
[SCOUT]  [INTEL]  [X-ALT]
  (execution) (research) (social)

     [ROUNDTABLE AREA]
        (ATLAS chair)

[SAGE]   [GROWTH]  [OBSERVER]
 (risk)  (analytics) (quality)

[CONTENT] [SOCIAL] [CREATIVE]
 (stories) (community) (design)

         [SERVERS]
     (data visualization)
```

### Desk Assignments (10 Agents)

1. **ATLAS (Coordinator)** - Central roundtable position
   - Elevated/prominent desk
   - Multiple monitors showing all agent activity
   - Particle streams flowing TO all other desks
   - Color: Indigo/purple glow

2. **SAGE (Risk Management)** - Zen corner
   - Minimalist desk with bonsai tree
   - Calm blue glow
   - Risk gauges floating above desk
   - Particle effects: Slow, measured pulses

3. **SCOUT (Execution)** - Fast-paced area
   - Cluttered desk, multiple screens
   - Orange/amber glow (speed/urgency)
   - Particle effects: Rapid bursts when trade executes
   - Phone ringing animation

4. **GROWTH (Analytics)** - Data zone
   - Server racks nearby
   - Purple/violet glow
   - Charts floating above desk
   - Particle effects: Data flowing FROM servers

5. **INTEL (Intelligence)** - Research corner
   - Books, plants, calm atmosphere
   - Red glow (research/investigation)
   - Particle effects: Information gathering (inward flow)

6. **OBSERVER (Quality Control)** - Watchtower position
   - Camera/lens on desk
   - Slate gray glow
   - Scanning beam particle effect
   - Elevated slightly (oversight position)

7. **X-ALT (Twitter Intelligence)** - Social corner
   - Wizard aesthetic (binary beard character)
   - Cyan/electric blue
   - Particle effects: Tweet streams flowing in
   - Mystical data magic vibe

8. **CONTENT (Content Creation)** - Creative zone
   - Rainbow creative character
   - Multicolor glow
   - Particle effects: Ideas bursting outward
   - Art supplies scattered

9. **SOCIAL (Community)** - Hub area
   - Social media head character
   - Notification bubbles floating
   - Green glow (engagement)
   - Particle effects: Messages flowing in/out

10. **CREATIVE (Design)** - Design studio
    - Rainbow creative (alternate or same as CONTENT?)
    - Artistic glow
    - Particle effects: Design elements materializing

---

## Visual Elements

### Base Environment
- **Floor:** Isometric grid tiles (dark gray/blue)
- **Walls:** Code matrix on left wall (green text flowing)
- **Plants:** Scattered throughout (life in tech)
- **Trees:** 2-3 pixel art trees for atmosphere
- **Servers:** Server racks glowing with activity

### Lighting
- **Ambient:** Dark blue/night atmosphere
- **Desk lights:** Each agent has signature color glow
- **Accent lights:** Neon strips (cyan/pink like cyberpunk)
- **Particle glow:** Data streams illuminate path

### Particle Effects (Data Visualization)

**Trade Execution (SCOUT):**
- Rapid orange particles burst from desk
- Flow to GROWTH (analytics) and ATLAS (coordinator)

**Risk Alert (SAGE):**
- Slow red pulse emanates from desk
- All agents' desks dim slightly (caution mode)

**Signal Discovery (INTEL):**
- White/cyan particles flow inward (gathering info)
- Then burst to ATLAS (sharing finding)

**Trade Complete:**
- Green particles cascade from ATLAS → all agents
- Celebration animation on relevant desks

**Data Flow (Always):**
- Constant subtle particle flow between desks
- Like a living nervous system
- Intensity increases with market activity

---

## Character States & Animations

### Idle State (No Activity)
- Character at desk, subtle breathing
- Typing occasionally
- Monitor glows softly
- Particle effects: Minimal, slow pulse

### Working State (Processing)
- Character typing rapidly
- Monitor brightness increases
- Particle effects: Active data flow
- Desk glow intensifies

### Alert State (Signal/Trade)
- Character stands or leans forward
- Attention animation (! or ?)
- Particle effects: Burst/flash
- Desk pulses with signature color

### Celebrating State (Win)
- Character raises arms or pumps fist
- Confetti particles (brief)
- Desk flashes green
- Happy animation

### Stressed State (Loss/Alert)
- Character holds head or paces
- Red particle warning
- Desk dims
- Worried animation

---

## Interaction Patterns

### Click Agent Desk
- Camera zooms to that desk
- Agent detail panel slides in (right side)
- Shows: Current task, recent activity, stats
- Agent does acknowledgment animation

### Click Roundtable (ATLAS)
- Overview mode
- All agent status bars appear
- Portfolio stats overlay
- System-wide view

### Click Server Racks
- Technical stats panel
- Database health
- API status
- Performance metrics

### Click Particle Stream
- Trace data flow path
- Highlight related desks
- Show what data is flowing

### Hover Effects
- Desk glows brighter
- Agent name appears
- Current status tooltip
- Particle effects intensify

---

## Real-Time Data Integration

### Trading Events → Visual Effects

**New Signal Discovered:**
1. INTEL desk glows + particle burst
2. Particle stream flows to ATLAS
3. ATLAS desk processes (glow)
4. If approved → flows to SCOUT
5. SCOUT executes (orange burst)

**Trade Executed:**
1. SCOUT desk orange flash
2. Particle flows to GROWTH (logging)
3. GROWTH updates analytics
4. Result flows back to ATLAS

**Risk Alert Triggered:**
1. SAGE desk red pulse
2. Warning particles radiate outward
3. All desks receive alert (dim glow)
4. ATLAS desk shows decision

**Portfolio Update:**
1. Green (profit) or red (loss) cascade
2. Flows from ATLAS to all desks
3. Brief celebration or concern animations
4. Returns to normal state

### Market Hours Visualization
- **Pre-market:** Desks dimly lit, agents preparing
- **Market open:** Full activity, particles flowing
- **Power hour:** Intensity increases, faster animations
- **Market close:** Agents wind down, particle flow slows
- **After hours:** Minimal activity, cleanup animations

---

## Camera & Navigation

### Default View
- Isometric angle (45°)
- All 10 desks visible
- Zoomed out enough to see whole office
- Static (no auto-movement)

### Interaction Modes
1. **Click desk:** Smooth zoom to that agent
2. **Click roundtable:** Zoom to overview
3. **Manual pan:** Drag to move camera (optional)
4. **Zoom controls:** Mouse wheel or buttons

### Suggested Layout
- **Primary view:** Full office (default)
- **Detail views:** Individual agent focus
- **Stats overlay:** Floating panels (don't block view)

---

## Technical Components (React)

### Main Components
```
<IsometricOffice>
  <OfficeFloor />
  <EnvironmentDecorations /> {/* trees, servers, plants */}
  <AgentDesk id="atlas" position={[x,y]} state="working" />
  <AgentDesk id="sage" position={[x,y]} state="idle" />
  {/* ... 8 more desks */}
  <ParticleSystem streams={dataFlows} />
  <Camera position={cameraPos} />
  <InteractionLayer onDeskClick={handleClick} />
</IsometricOffice>
```

### Agent Desk Component
```tsx
<AgentDesk>
  <DeskSprite /> {/* furniture */}
  <MonitorSprite state={agentState} />
  <CharacterSprite 
    character={agentCharacter}
    animation={currentAnimation}
    state={agentState}
  />
  <DeskGlow color={agentColor} intensity={activityLevel} />
  <StatusIndicator />
</AgentDesk>
```

### Particle System
```tsx
<ParticleSystem>
  <DataStream from="intel" to="atlas" active={true} />
  <DataStream from="atlas" to="scout" active={tradeSignal} />
  <AmbientParticles density={marketActivity} />
  <EventParticles event="trade_complete" />
</ParticleSystem>
```

---

## Color Palette (Agent Signatures)

- **ATLAS:** Indigo #6366f1 (leader)
- **SAGE:** Emerald #10b981 (calm/risk)
- **SCOUT:** Amber #f59e0b (speed/execution)
- **GROWTH:** Violet #8b5cf6 (analytics)
- **INTEL:** Red #ef4444 (research)
- **OBSERVER:** Slate #94a3b8 (monitoring)
- **X-ALT:** Cyan #06b6d4 (social/wizard)
- **CONTENT:** Rainbow gradient (creative)
- **SOCIAL:** Green #22c55e (engagement)
- **CREATIVE:** Pink/Purple #ec4899 (design)

---

## Performance Budget

### Target Specs
- **60 FPS:** Smooth animation always
- **10 agents:** Each with 3-5 animation states
- **100+ particles:** Simultaneously active
- **Real-time updates:** Every 1-2 seconds from API
- **Mobile:** Responsive (simplified view)

### Optimization Strategies
1. Sprite sheet animations (not individual images)
2. Object pooling for particles
3. Culling off-screen elements
4. Canvas rendering (not DOM)
5. RequestAnimationFrame for smooth updates
6. Debounce API calls
7. Progressive enhancement (reduce particles on slow devices)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up isometric grid system
- Create base office layout (static)
- Place 10 desk sprites
- Basic camera controls

### Phase 2: Characters (Week 1-2)
- Integrate agent character sprites
- Implement idle animations
- State system (idle/working/alert)
- Click interaction (desk selection)

### Phase 3: Particles (Week 2)
- Particle system foundation
- Basic data flow streams
- Event-based particles (trade/alert)
- Performance optimization

### Phase 4: Real Data (Week 2-3)
- Wire to trading APIs
- Map events → visual effects
- Agent activity based on system state
- Real-time updates

### Phase 5: Polish (Week 3)
- Lighting effects
- Environmental details
- Sound design (optional)
- Mobile optimization
- Performance tuning

---

## Questions to Answer

1. **Static or explorable?** Fixed camera or allow panning?
2. **Agent characters:** Use the 10 we have or create isometric versions?
3. **Desk design:** All same or unique per agent?
4. **Data panels:** Overlay on office or separate view?
5. **Mobile experience:** Simplified 2D view or keep isometric?

---

## Next Steps

1. **Research findings:** Wait for framework recommendations
2. **Prototype:** Build single desk + character in chosen framework
3. **Iterate:** Get feedback, refine aesthetic
4. **Scale:** Add all 10 desks + particles
5. **Integrate:** Wire to real trading data

---

**This is going to be LEGENDARY** 🔥

A trading dashboard that's also a living, breathing pixel art office. Nothing like this exists. This IS the signature style.
