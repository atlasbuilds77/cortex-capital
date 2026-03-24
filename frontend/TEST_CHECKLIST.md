# Onboarding Flow Test Checklist

## Pre-Testing Setup
```bash
cd /Users/atlasbuilds/clawd/cortex-capital/frontend
npm run dev
```

Open http://localhost:3000

---

## 1. Landing Page (/)

### Visual Tests
- [ ] Animated gradient background is subtle and smooth
- [ ] Trust badges appear at top (Bank-level encryption, SEC registered, Join 1,000+ traders)
- [ ] Headline has animated gradient text
- [ ] Social proof avatars display below CTA buttons
- [ ] All 3 feature cards appear with icons
- [ ] Security footer shows 3 badges at bottom

### Animation Tests
- [ ] Page elements fade in with stagger effect
- [ ] "Start Free Trial" button scales on hover
- [ ] "Sign In" button scales on hover
- [ ] Feature cards lift slightly on hover
- [ ] Icon containers scale on hover

### Mobile Tests
- [ ] Trust badges wrap properly on small screens
- [ ] CTA buttons stack vertically on mobile
- [ ] Feature grid becomes single column
- [ ] All text remains readable

---

## 2. Onboarding Wizard (/onboarding)

### Step 1: Risk Profile
- [ ] Progress bar shows "Step 1 of 5" and "20%"
- [ ] All 5 step names visible on desktop
- [ ] Step numbers visible on mobile
- [ ] Risk assessment form works (existing component)

### Step 2: Goals
- [ ] Target icon appears in colored circle
- [ ] 4 goal cards with emojis display
- [ ] Cards highlight in primary color when selected
- [ ] Continue button disabled until selection made
- [ ] Smooth slide transition from step 1

### Step 3: Interests (Optional)
- [ ] TrendingUp icon appears
- [ ] "Optional" label in description
- [ ] 6 sector cards with emojis
- [ ] Both "Skip" and "Continue" buttons visible
- [ ] Skip button works without selection
- [ ] Continue button requires selection

### Step 4: Picks (Optional)
- [ ] Star icon appears
- [ ] "Coming soon" message displays
- [ ] "Skip for now" button works
- [ ] Smooth transition

### Step 5: Exclusions (Optional)
- [ ] Ban icon appears in red circle
- [ ] 4 exclusion cards with emojis
- [ ] Cards highlight in RED when selected
- [ ] Both "Skip" and "Complete Setup" buttons work
- [ ] Progress bar shows 100%

### Universal Wizard Tests
- [ ] Progress bar animates smoothly between steps
- [ ] "Back" button appears on steps 2-5
- [ ] Back button navigates properly with backward animation
- [ ] All transitions are smooth (no jank)
- [ ] Mobile: all buttons are easily tappable (44px min)

---

## 3. Broker Connection (/connect)

### Broker Selection Screen
- [ ] "Why we need this" explainer box appears first
- [ ] 4 broker cards display with large emojis
- [ ] "Popular" badge on Alpaca card
- [ ] Cards lift on hover
- [ ] Arrow appears and slides right on hover
- [ ] Security badges appear below brokers
- [ ] "Skip for now" link at bottom

### Connection Form (click any broker)
- [ ] Smooth slide-in transition
- [ ] "← Back" button works
- [ ] Large broker logo/emoji displays
- [ ] Form title: "Connect to {Broker}"
- [ ] Correct fields appear per broker:
  - Alpaca: API Key + API Secret
  - Tradier: API Key only
  - Robinhood: Username + Password
  - IBKR: Username + Password
- [ ] Input fields have focus rings (primary color)
- [ ] Security note appears below form
- [ ] "Authorize & Connect" button displays

### Connection Flow
- [ ] Click "Authorize & Connect"
- [ ] Button shows loading spinner + "Connecting..."
- [ ] On success: full-screen celebration appears
- [ ] Confetti animation plays (colored particles falling)
- [ ] Checkmark scales in with bounce
- [ ] "Successfully Connected!" message appears
- [ ] "Redirecting..." message fades in
- [ ] Auto-redirect after ~2 seconds

### Error Handling
- [ ] Error message animates in if connection fails
- [ ] Error is styled in danger color
- [ ] Can retry after error

---

## 4. Cross-Browser Tests
- [ ] Chrome/Edge (Chromium)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 5. Performance Tests
- [ ] No console errors
- [ ] No console warnings (except external library warnings)
- [ ] Animations are smooth (60fps)
- [ ] No layout shift on load
- [ ] Images/icons load quickly

---

## 6. Accessibility Tests
- [ ] All buttons are keyboard navigable (Tab)
- [ ] Focus indicators are visible
- [ ] Can complete full flow with keyboard only
- [ ] Screen reader friendly (semantic HTML)
- [ ] Color contrast meets WCAG AA

---

## Known Issues / Future Enhancements
- [ ] Broker logos are emoji placeholders (add real SVGs to `/public/brokers/`)
- [ ] API calls may fail (backend may not be running)
- [ ] Form validation is basic (add inline error messages)
- [ ] No loading state on page transitions
- [ ] Confetti particles are simple squares (could use shapes/svg)

---

## Files Modified/Created
1. ✅ `app/page.tsx` - Landing page with animations
2. ✅ `app/onboarding/page.tsx` - Wizard with progress/transitions
3. ✅ `app/connect/page.tsx` - Broker connection with celebration
4. ✅ `components/onboarding/progress-bar.tsx` - Progress component
5. ✅ `components/onboarding/step-transition.tsx` - Transition wrapper
6. ✅ `components/ui/confetti.tsx` - Success celebration
7. ✅ `app/globals.css` - Gradient animation keyframes

---

**Test Status:** Ready for QA ✨

If all items pass, the onboarding flow is production-ready!
