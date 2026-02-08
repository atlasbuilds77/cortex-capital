# Phaser Isometric Office - Setup Instructions

## 1. Install Phaser

```bash
cd /Users/atlasbuilds/clawd/autonomous-trading-company/dashboard
npm install phaser@3.80.1
```

## 2. Create Office Demo Page

File already created: `components/IsometricOffice.tsx`

## 3. Add to Dashboard

Create new page at `app/office/page.tsx`:

```tsx
import IsometricOffice from '../components/IsometricOffice';

export default function OfficePage() {
  return (
    <div className="w-screen h-screen bg-slate-950">
      <IsometricOffice />
    </div>
  );
}
```

## 4. Run Dashboard

```bash
npm run dev
```

Then visit: http://localhost:3000/office

## What's Built

✅ Isometric grid floor (20x15 tiles)  
✅ All 13 characters positioned exactly per layout  
✅ Color-coded desk glows (each character's signature color)  
✅ Environmental elements (trees, plants, servers, code wall)  
✅ Click interaction (click any character → burst particles)  
✅ Hover effects (character scales up, glow intensifies)  
✅ Atlas particle emitter (constant data flow)  
✅ Grid coordinate system (screen ↔ isometric conversion)  
✅ Pixel art rendering mode

## What's Next (Tonight)

1. **Character Movement**
   - Add pathfinding (EasyStar.js)
   - Walking animations (4-directional sprites)
   - Move characters between desks on events

2. **Particle System**
   - Data flow between desks
   - Trade execution particles (orange bursts)
   - Risk alerts (red pulses)
   - Success celebrations (green cascade)

3. **Real Trading Data**
   - Wire to SSE /api/events
   - Map trading events → character actions
   - Particle effects on trade signals

4. **Polish**
   - Replace circle placeholders with actual character sprites
   - Add desk sprites (monitors, keyboards)
   - Ambient particles (floating code, data streams)
   - Sound effects (optional)

## Current Features

**Click any character:**
- Pulse animation
- Particle burst in character's color
- Console log with role

**Hover any character:**
- Scale 1.2x
- Glow intensifies
- Shows interactivity

**Atlas (center):**
- Constant particle emission (data coordination)
- Brightest glow
- Center of office

## File Structure

```
dashboard/
├── components/
│   └── IsometricOffice.tsx  (Phaser game)
├── app/
│   └── office/
│       └── page.tsx  (Demo page)
├── public/
│   ├── team-avatars/  (atlas.jpg, orion.jpg, carlos.jpg)
│   └── agent-avatars/  (agent-01.jpg → agent-10.jpg/png)
└── OFFICE_LAYOUT_VISUAL.md  (Design spec)
```

## Troubleshooting

**"Module not found: phaser"**
→ Run: `npm install phaser`

**Black screen**
→ Check browser console for asset loading errors
→ Verify image paths in `/public/team-avatars/` and `/public/agent-avatars/`

**Characters not appearing**
→ Check if jpg/png extensions match files
→ Try opening image URLs directly (e.g., http://localhost:3000/team-avatars/atlas.jpg)

## Performance

- Target: 60 FPS
- Current load: Minimal (13 characters, ~300 floor tiles, 1 particle emitter)
- Canvas rendering (not WebGL yet - can upgrade if needed)
- Pixel art mode enabled (crisp rendering)

## Next Session Additions

**Easy Wins (30-60 min each):**
1. Replace character circles with actual sprite images
2. Add desk/monitor sprites
3. Connect to SSE for real-time events
4. Add one particle flow path (e.g., INTEL → ATLAS)

**Medium Complexity (1-2 hours):**
1. Pathfinding with EasyStar.js
2. Character walking between desks
3. Full particle system (all event types)

**Advanced (2+ hours):**
1. 4-directional walking sprites
2. Complex animation states
3. Camera controls
4. Mobile responsive version

---

**Ready to see it live!** 🔥

Run the install command and create the office page, then we'll see all 13 characters in the isometric office.
