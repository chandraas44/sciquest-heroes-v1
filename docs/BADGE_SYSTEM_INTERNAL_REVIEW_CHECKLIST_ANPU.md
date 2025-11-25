# Badge System - Internal Review Checklist

**Branch:** Anpu  
**Feature:** Full Badge System (Phase 4)  
**Review Date:** _______________  
**Reviewer:** _______________  
**Status:** ☐ In Progress  ☐ Complete  ☐ Needs Revision

---

## Quick Setup

| Task | Status | Notes |
|------|--------|-------|
| Dev server running (`npm run dev`) | ☐ | Port: 3000 |
| Browser DevTools open (F12) | ☐ | Check Console tab |
| localStorage cleared (optional) | ☐ | Fresh test state |
| Feature flag `VITE_USE_BADGES_MOCKS=true` | ☐ | Default: enabled |

---

## 1. Navigation & Pages

### 1.1 Child Badge Gallery Page
| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/child/badges` | ☐ | Should show badge grid |
| Vite rewrite works: `/child/badges` → `badges.html` | ☐ | URL rewrites correctly |
| Header visible with logo + nav links | ☐ | Stories, Chat, Dashboard, Badges, Logout |
| Footer visible with links | ☐ | Consistent across pages |
| Page title displays: "Your Curiosity Badges" | ☐ | Large font-fredoka heading |
| Summary card shows unlocked/total count | ☐ | "You've unlocked X of Y badges!" |
| Badge grid displays (responsive) | ☐ | 1 col mobile, 2-3 cols desktop |

**URL Check:** `http://localhost:3000/child/badges`

---

### 1.2 Badge Detail Modal
| Check | Status | Notes |
|-------|--------|-------|
| Click badge tile → modal opens | ☐ | Modal appears with backdrop |
| Modal shows badge icon (large, 128x128px) | ☐ | Circular container with gradient |
| Badge name displays (font-fredoka, large) | ☐ | White text, bold |
| Badge description displays | ☐ | White/80 text |
| Status indicator (✓ unlocked / 🔒 locked) | ☐ | Top-right corner |
| Progress bar shows (for locked badges) | ☐ | Purple-pink gradient, percentage |
| "How to Earn" CTA button (for locked) | ☐ | Links to Stories/Chat pages |
| Close button (×) works | ☐ | Closes modal |
| Click outside modal → closes | ☐ | Backdrop click dismisses |
| ESC key → closes | ☐ | Keyboard navigation works |

**Deep Link Check:** `http://localhost:3000/child/badges?badgeId=first-curious-question`

---

### 1.3 Access Control (Placeholder)
| Check | Status | Notes |
|-------|--------|-------|
| Parent navigates to `/child/badges` → redirect | ☐ | Should redirect to `/parent/dashboard` (future) |
| Child navigates to `/parent/dashboard` → redirect | ☐ | Should redirect to `/child/badges` (future) |
| Mock mode: all access allowed | ☐ | No restrictions in mock mode |

---

## 2. Badge Gallery Functionality

### 2.1 Badge Display
| Check | Status | Notes |
|-------|--------|-------|
| Badges sorted correctly | ☐ | Unlocked → Locked → Rarity → Alphabetical |
| Unlocked badges show full color gradient | ☐ | `bg-gradient-to-br from-purple-500 to-pink-500` |
| Locked badges show grayscale/opacity | ☐ | `opacity-40`, reduced brightness |
| Badge icon size: 64x64px (4rem) | ☐ | Consistent across tiles |
| Badge name displays (centered) | ☐ | Font-fredoka, bold |
| Unlocked: "Earned: X ago" text | ☐ | Relative time format |
| Locked: "Hint: ..." text | ☐ | Italic, white/60 |
| Status badge (✓/🔒) visible | ☐ | Top-right corner, circular |

---

### 2.2 Badge Ordering Rules
| Check | Status | Notes |
|-------|--------|-------|
| Unlocked badges appear first | ☐ | Before locked badges |
| Locked badges appear after unlocked | ☐ | Grouped together |
| Within same status, sorted by rarity | ☐ | Rare → Uncommon → Common |
| Within same rarity, sorted alphabetically | ☐ | By badge name A-Z |

---

### 2.3 Error States
| Check | Status | Notes |
|-------|--------|-------|
| Badge gallery load failure → error state | ☐ | Message: "Unable to load badges..." |
| Retry button works | ☐ | Reloads badge gallery |
| Empty state shown if no badges | ☐ | Friendly message with 🏆 icon |
| Badge modal failure → error toast | ☐ | "Unable to show badge details..." |

---

## 3. Badge Evaluation & Awards

### 3.1 Story Completion Triggers
| Check | Status | Notes |
|-------|--------|-------|
| Complete a story (last panel) | ☐ | Navigate to `/stories/{storyId}/read` |
| Story completion triggers badge evaluation | ☐ | Check console for evaluation logs |
| "Story Master" badge evaluates | ☐ | 5 stories completed |
| "Photosynthesis Explorer" evaluates | ☐ | Photosynthesis story completed |
| Celebration appears if badge awarded | ☐ | Overlay with confetti |

---

### 3.2 Chat Message Triggers
| Check | Status | Notes |
|-------|--------|-------|
| Send first chat message | ☐ | Navigate to `/chat/index.html?topicId=...` |
| First message triggers badge evaluation | ☐ | Check console for evaluation logs |
| "First Curious Question" badge evaluates | ☐ | 1 user message sent |
| Celebration appears if badge awarded | ☐ | Overlay with confetti |

---

### 3.3 Badge Celebration Flow
| Check | Status | Notes |
|-------|--------|-------|
| Celebration overlay appears on current page | ☐ | Child remains on Story/Chat page |
| Confetti animation plays | ☐ | Colored particles fall |
| Badge icon displays (large, 128x128px) | ☐ | Bounce animation |
| "Badge Unlocked!" title displays | ☐ | Font-fredoka, white |
| Badge name displays | ☐ | Large, bold |
| "View Badge" button links correctly | ☐ | `/child/badges?badgeId={id}` |
| Celebration auto-dismisses after 5 seconds | ☐ | Or manual close (× or ESC) |
| Multiple celebrations queue (not overlap) | ☐ | One at a time, max 1 visible |

---

## 4. Parent Dashboard Integration

### 4.1 Badge Section Display
| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/parent/dashboard?childId=child-akhil` | ☐ | Select child from left column |
| Badges section displays | ☐ | "Curiosity Badges" heading |
| Summary shows: "{Name} has unlocked X of Y..." | ☐ | Dynamic count |
| Badge tiles display horizontally | ☐ | Scroll on mobile, wrap on desktop |
| Badge tiles match child gallery styling | ☐ | Same icon, status indicators |

---

### 4.2 Badge Detail Modal (Parent View)
| Check | Status | Notes |
|-------|--------|-------|
| Click badge tile → modal opens | ☐ | Same modal as child view |
| Shows child's unlock status | ☐ | Unlocked/Locked indicator |
| Progress bar shows (for locked badges) | ☐ | Current/required values |
| "View all badge rules" button | ☐ | Placeholder logic (alert) |

---

## 5. Badge Rules Engine

### 5.1 Evaluation Logic
| Check | Status | Notes |
|-------|--------|-------|
| Badge rules load from `badge-rules.json` | ☐ | Check console for load logs |
| Rules evaluate in priority order | ☐ | Priority 1 → 2 → 3 |
| Already-awarded badges skipped | ☐ | No duplicate awards |
| Atomic badge awarding | ☐ | Single source of truth |

---

### 5.2 Mock Mode Behavior
| Check | Status | Notes |
|-------|--------|-------|
| Default awards initialize on load | ☐ | At least 1 badge unlocked per child |
| Badge awards persist in localStorage | ☐ | `sqh_badge_awards_v1` key |
| Awards persist across page refreshes | ☐ | Reload page → badges still unlocked |
| Mock data falls back gracefully | ☐ | If Supabase unavailable |

---

## 6. Design Consistency

### 6.1 Visual Styling
| Check | Status | Notes |
|-------|--------|-------|
| Background gradient matches Anpu branch | ☐ | `from-[#4F2EC9] to-[#9B37FF]` |
| Glassmorphism cards present | ☐ | `bg-white/10 backdrop-blur-xl` |
| Purple glow shadows on cards | ☐ | `shadow-[0_0_30px_rgba(155,55,255,0.25)]` |
| No plain white backgrounds | ☐ | All surfaces use gradients/glass |
| Header/footer consistent | ☐ | Same across all badge pages |
| Typography correct | ☐ | Font-fredoka for headings, Inter for body |
| Badge icons use emoji (consistent) | ☐ | No SVG/emoji mixing |

---

### 6.2 Mobile Responsiveness
| Check | Status | Notes |
|-------|--------|-------|
| Badge grid collapses to 1-2 columns | ☐ | On mobile (< 768px) |
| Celebration modal responsive | ☐ | Safe-area-aware, full width on mobile |
| Badge tiles wrap correctly | ☐ | No horizontal overflow |
| All tap targets meet minimum size | ☐ | 44x44px minimum (accessibility) |
| Modal close button accessible | ☐ | Large enough to tap easily |

---

## 7. Analytics & Logging

### 7.1 Event Logging
| Check | Status | Notes |
|-------|--------|-------|
| Badge gallery viewed → event logged | ☐ | Check console for `badge_gallery_viewed` |
| Badge detail viewed → event logged | ☐ | Check console for `badge_viewed` |
| Badge awarded → event logged | ☐ | Check console for `badge_awarded` |
| Events queued in localStorage | ☐ | `sqh_analytics_queue_v1` key |
| Analytics includes badge context | ☐ | Badge ID, trigger type, source feature |

---

## 8. Integration Points

### 8.1 Story Integration
| Check | Status | Notes |
|-------|--------|-------|
| Story completion triggers badge evaluation | ☐ | Last panel → evaluation runs |
| Badge celebration appears in Story Reader | ☐ | Overlay on story page |
| "View Badge" links to badge gallery | ☐ | Deep link with `badgeId` param |

---

### 8.2 Chat Integration
| Check | Status | Notes |
|-------|--------|-------|
| Chat message triggers badge evaluation | ☐ | After transcript saved |
| Badge celebration appears in Chat Session | ☐ | Overlay on chat page |
| "View Badge" links to badge gallery | ☐ | Deep link with `badgeId` param |

---

### 8.3 Parent Dashboard Integration
| Check | Status | Notes |
|-------|--------|-------|
| Badge updates reflect in Parent Dashboard | ☐ | Refresh → new badges appear |
| Badge click opens detail modal | ☐ | Same modal as child view |
| Badge progress calculates correctly | ☐ | Shows current/required for locked |

---

## 9. Edge Cases & Error Handling

### 9.1 Multi-Trigger Scenarios
| Check | Status | Notes |
|-------|--------|-------|
| Multiple badges unlock simultaneously | ☐ | Celebrations queue (not overlap) |
| Same badge triggered from multiple sources | ☐ | Duplicate awards prevented |
| Badge evaluation with missing data | ☐ | Graceful fallback, no errors |

---

### 9.2 Badge Cache & State
| Check | Status | Notes |
|-------|--------|-------|
| Badge cache invalidates on new award | ☐ | New badges appear immediately |
| Badge progress updates correctly | ☐ | Progress bar reflects current state |
| Badge state persists across sessions | ☐ | localStorage maintained |

---

## 10. Performance

| Check | Status | Notes |
|-------|--------|-------|
| Badge gallery loads quickly (< 1 second) | ☐ | No lag on initial load |
| Badge rules evaluation fast (< 100ms) | ☐ | No blocking on evaluation |
| Celebration animation smooth | ☐ | No jank or lag |
| Badge cache reduces redundant evaluations | ☐ | Cached results used when possible |

---

## Quick Reference URLs

| Page | URL |
|------|-----|
| Child Badge Gallery | `http://localhost:3000/child/badges` |
| Badge Detail (Deep Link) | `http://localhost:3000/child/badges?badgeId=first-curious-question` |
| Parent Dashboard (with Badges) | `http://localhost:3000/parent/dashboard?childId=child-akhil` |
| Story Reader (Trigger Test) | `http://localhost:3000/stories/mystery-moon/read` |
| Chat Session (Trigger Test) | `http://localhost:3000/chat/index.html?topicId=moon-physics` |

---

## Files to Check

### New Files
- `badges/badges.html` - Child badge gallery page
- `badges/badges.js` - Badge gallery UI logic
- `badges/badge-services.js` - Badge evaluation engine
- `badges/mockBadgeData.json` - Mock badge definitions
- `badges/badge-rules.json` - Badge rules definitions
- `shared/badge-celebration.js` - Celebration animation component

### Modified Files
- `vite.config.js` - Route rewrite for `/child/badges`
- `parent/dashboard.js` - Badge click handlers + modal
- `parent/dashboard-services.js` - Badge integration
- `stories/story-viewer.js` - Badge evaluation trigger
- `chat/chat-session.js` - Badge evaluation trigger

---

## Test Scenarios

### Scenario 1: First Badge Unlock (Chat)
1. Navigate to `/chat/index.html?topicId=moon-physics`
2. Send first chat message
3. **Expected:** "First Curious Question" badge celebration appears
4. Click "View Badge" → navigates to `/child/badges?badgeId=first-curious-question`
5. **Expected:** Badge detail modal opens with unlocked status

### Scenario 2: Story Completion Badge
1. Navigate to `/stories/mystery-moon/read`
2. Complete story (click through all panels)
3. **Expected:** Badge evaluation runs on completion
4. If 5th story completed: "Story Master" celebration appears
5. Check Parent Dashboard → badge should appear in badges section

### Scenario 3: Badge Gallery Navigation
1. Navigate to `/child/badges`
2. **Expected:** Badges sorted (unlocked first, then locked)
3. Click unlocked badge → modal opens with "Earned on" date
4. Click locked badge → modal opens with progress bar + "How to Earn" button
5. Click "How to Earn" → navigates to Stories/Chat page

### Scenario 4: Multiple Badge Queue
1. Complete a story that unlocks multiple badges
2. **Expected:** Celebrations queue, appear one at a time
3. Each celebration auto-dismisses after 5 seconds
4. Maximum 1 celebration visible at a time

---

## Completion Checklist

| Item | Status | Notes |
|------|--------|-------|
| Badge gallery page (`/child/badges`) | ☐ | |
| Badge detail modal with progress | ☐ | |
| Badge celebration animation | ☐ | |
| Badge evaluation engine | ☐ | |
| Story completion badge triggers | ☐ | |
| Chat message badge triggers | ☐ | |
| Parent Dashboard badge integration | ☐ | |
| Badge ordering (unlocked → locked → rarity → alphabetical) | ☐ | |
| Error states (gallery, rules, modal) | ☐ | |
| Mobile responsiveness | ☐ | |
| Access control (parent/child redirects) | ☐ | |
| Analytics event logging | ☐ | |
| Mock mode with default awards | ☐ | |
| Design consistency (Anpu branch tokens) | ☐ | |
| Logout button on all pages | ☐ | |

---

**End of Review Checklist**



