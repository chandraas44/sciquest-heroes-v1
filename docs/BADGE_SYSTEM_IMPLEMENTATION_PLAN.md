# Full Badge System - Implementation Plan

**Branch:** Anpu  
**Feature:** Full Badge System (Phase 4)  
**Status:** Planning  
**Date:** _______________

---

## Overview

The Full Badge System provides a complete badge awarding engine that tracks learning milestones across Comic Viewer stories, Topic Chat AI interactions, quiz performance, and learning streaks. This implementation focuses on a centralized rules engine, child-facing badge gallery, parent-facing badge management expansion, celebratory animations, and seamless integration with existing features. Following the established mock-first approach, this phase builds UI scaffolding, badge evaluation logic, and mock data fallbacks before Supabase database integration.

This system uses the same global header, footer, logout button logic, gradients, glassmorphism, and child-friendly design tokens used across the Anpu branch.

---

## Architecture & Design Principles

### Mock-First Approach
- Feature flag: `VITE_USE_BADGES_MOCKS` (default: `true`)
- All functionality works with mock data before Supabase integration
- Graceful fallback to mocks if Supabase unavailable
- Follows same pattern as Comic Viewer, Chat AI, and Parent Dashboard
- **Mock Mode Unlock Defaults**:
  - Each child should begin with at least one unlocked badge in mock mode (ensures visual richness during testing)
  - Remaining badges remain locked with progress indicators visible
  - Default unlock: "First Curious Question" badge unlocked for all mock children
  - Implementation: `mockBadgeData.json` includes default awards or `badges.js` initializes with one default award per child

### Design Token Consistency (Anpu Branch)
- **Primary Background Gradient**: `from-[#4F2EC9] to-[#9B37FF]` (deep purple to pink-violet)
- **Secondary Surfaces**: 
  - `bg-indigo-600/30`
  - `bg-purple-700/25`
  - `bg-fuchsia-500/20`
- **Glassmorphism**: `bg-white/10 backdrop-blur-xl border border-white/20`
- **Purple Glow Shadow**: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- **Typography**: `font-fredoka` for headings, `Inter` for body
- **Borders**: `rounded-3xl`, `rounded-2xl`
- **Celebration Colors**: Enhanced purple-pink gradients with glow effects
- **No Plain White**: All white surfaces replaced with glassmorphism or child-friendly colors

### Unified Badge Icon Strategy
- **Icon System**: Use emoji icons consistently across all badge displays (no SVG/emoji mixing)
- **Icon Size**: 64x64px (4rem) for gallery tiles, 128x128px (8rem) for detail modal, 128x128px (8rem) for celebration overlay
- **Icon Colors**: 
  - Unlocked badges: Full color gradient background (`bg-gradient-to-br from-purple-500 to-pink-500`)
  - Locked badges: Grayscale with reduced opacity (`opacity-40`)
- **Icon Container**: Circular container with glassmorphism and border (`rounded-full`, `bg-white/20 backdrop-blur-xl`, `border-4 border-white/30`)
- **Glow Effects**: Unlocked badges use purple glow shadow (`shadow-[0_0_30px_rgba(155,55,255,0.4)]`)
- **All badge icons must use the same visual system**: Emoji-only approach to maintain consistency with existing branch design tokens

### Global Header & Footer (Required)
- **Same header structure** as Comic Viewer, Chat, and Parent Dashboard pages
- **Same footer structure** as Comic Viewer, Chat, and Parent Dashboard pages
- **Same logout button logic** (desktop + mobile variants)
- **Navigation links**: Stories, Chat, Dashboard, Badges (for child pages)

### Badge Rules Engine Architecture
- Centralized rule definitions in `badge-rules.json`
- Extensible rule evaluation pipeline
- Support for multiple trigger types (stories, chat, quizzes, streaks)
- Atomic badge awarding to prevent duplicates
- Event logging for badge evaluation attempts

### Analytics Integration
- Lightweight placeholder functions mirroring previous phases
- Events: `badge_awarded`, `badge_viewed`, `badge_unlock_celebrated`, `badge_rules_viewed`, `badge_triggered`
- Queued to localStorage: `sqh_analytics_queue_v1` (shared queue)
- No Supabase inserts at this phase (queued only)
- **Badge Analytics Pipeline**:
  - Badge-related events appear in Parent Dashboard analytics (aggregated with other child events)
  - Badge view events (child) must be logged when badge gallery opened or badge detail modal viewed
  - Topic and Story analytics should include badge-trigger context references (e.g., `{badgeTriggered: true, badgeId: 'story-master'}`)
  - All badge events include context: `{childId, badgeId, triggerType, sourceFeature}`

---

## Navigation & Routing

### Routes
- `/child/badges` - Child-facing badge gallery page
- `/child/badges?badgeId={id}` - Badge gallery with specific badge highlighted
- `/parent/dashboard?childId={id}` - Parent Dashboard (expanded badge section)
- Route rewrite: `/child/badges` → `/child/badges.html`

### Vite Configuration
- Add route rewrite in `vite.config.js`:
  ```javascript
  server.middlewares.use((req, res, next) => {
    // Existing rewrites...
    
    // Rewrite /child/badges to /child/badges.html
    const badgesMatch = req.url.match(/^\/child\/badges(\?.*)?$/);
    if (badgesMatch) {
      const existingQuery = badgesMatch[1] || '';
      req.url = `/child/badges.html${existingQuery}`;
      console.log(`[Vite] Rewrote /child/badges to ${req.url}`);
    }
    
    next();
  });
  ```
- Add build input: `child/badges.html` in `vite.config.js`

### Access Control
- `/child/badges` - Child-only access (placeholder check, no parent access)
- Redirect to `/stories` if unauthorized (future)
- Badge awarding triggered from Stories, Chat, and Quizzes (any authenticated child)

### Parent vs Child Access Logic
- **Access Pattern**: Use placeholder access-control pattern already used in Stories/Chat
- **Parent Access to Child Pages**: If parent navigates to `/child/badges`, redirect to `/parent/dashboard` with message
- **Child Access to Parent Pages**: If child navigates to `/parent/dashboard`, redirect to `/child/badges` with message
- **Implementation**: Placeholder role check in page initialization (mock mode: use `DEFAULT_CHILD_ID` for child, `MOCK_PARENT_ID` for parent)
- **Future**: Real auth role check from Supabase session

---

## File Structure

```
badges/
├── badges.html                 # Child-facing badge gallery page
├── badges.js                   # Badge gallery UI logic and state management
├── badge-services.js           # Badge evaluation engine and data layer
├── badge-celebration.js        # Celebratory animation component (reusable)
├── mockBadgeData.json          # Sample badge definitions and rules
└── badge-rules.json            # Badge rules engine definitions

parent/
├── dashboard.html              # (Existing - expand StudentBadgesSection)
├── dashboard.js                # (Existing - enhance badge rendering)
└── dashboard-services.js       # (Existing - enhance getChildBadges)

shared/
└── badge-celebration.js        # Reusable celebration animation (used by Stories, Chat)

stories/
├── story-viewer.js             # (Modify - trigger badge evaluation on story completion)
└── story-services.js           # (Integrate - badge evaluation hooks)

chat/
├── chat-session.js             # (Modify - trigger badge evaluation on milestones)
└── chat-services.js            # (Integrate - badge evaluation hooks)
```

### Integration Points
- `stories/story-services.js` - Story completion triggers
- `chat/chat-services.js` - Chat milestone triggers
- `parent/dashboard-services.js` - Badge data aggregation
- `vite.config.js` - Badge routes in build config + rewrite middleware
- Shared analytics queue with Comic Viewer, Chat AI, and Parent Dashboard
- Shared celebration component across Stories, Chat, and Badges pages

---

## UI Components & Layout

### Global Header (Required - Same as Anpu Branch)

**Implementation**: Identical to Comic Viewer, Chat, and Parent Dashboard pages

**Structure**:
```html
<nav class="fixed w-full z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-20">
      <!-- Logo & Brand -->
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-pink-600 rounded-3xl flex items-center justify-center border-4 border-white/30 shadow-2xl">
          <span class="text-3xl">🚀</span>
        </div>
        <a href="../index.html" class="font-fredoka text-2xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">SciQuest Heroes</a>
      </div>
      
      <!-- Navigation Links -->
      <div class="hidden lg:flex items-center space-x-6">
        <a href="../stories/index.html" class="font-fredoka text-white hover:text-purple-200 transition font-bold">Stories</a>
        <a href="../chat/index.html" class="font-fredoka text-white hover:text-purple-200 transition font-bold">Chat</a>
        <a href="../parent/dashboard.html" class="font-fredoka text-white hover:text-purple-200 transition font-bold">Dashboard</a>
        <a href="./badges.html" class="font-fredoka text-purple-200 font-bold">Badges</a>
        <button id="logoutBtn" class="font-fredoka text-white hover:text-purple-200 transition font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/10">Logout</button>
      </div>
      
      <!-- Mobile Logout Button -->
      <button id="logoutBtnMobile" class="lg:hidden font-fredoka text-white hover:text-purple-200 transition font-bold px-3 py-2 rounded-full border border-white/20 hover:bg-white/10 text-sm">Logout</button>
    </div>
  </div>
</nav>
```

**Logout Handler** (Same as Comic Viewer/Chat/Parent Dashboard):
```javascript
const handleLogout = async () => {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
    const { supabaseConfig } = await import('../config.js');
    
    if (supabaseConfig?.url && supabaseConfig?.anonKey) {
      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  } catch (error) {
    console.log('Supabase logout skipped (mock mode)');
  }
  
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '../auth/auth.html';
};

document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);
```

### Global Footer (Required - Same as Anpu Branch)

**Implementation**: Identical to Comic Viewer, Chat, and Parent Dashboard pages

**Structure**:
```html
<footer class="bg-white/10 backdrop-blur-xl border-t border-white/20 mt-auto py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
      <!-- Logo & Brand -->
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-pink-600 rounded-2xl flex items-center justify-center border-2 border-white/30">
          <span class="text-2xl">🚀</span>
        </div>
        <span class="font-fredoka text-lg font-bold text-white">SciQuest Heroes</span>
      </div>
      
      <!-- Navigation Links -->
      <div class="flex items-center gap-6 text-white/80 text-sm font-semibold">
        <a href="../index.html" class="hover:text-white transition">Home</a>
        <a href="../stories/index.html" class="hover:text-white transition">Stories</a>
        <a href="../chat/index.html" class="hover:text-white transition">Chat</a>
        <a href="../parent/dashboard.html" class="hover:text-white transition">Dashboard</a>
        <a href="./badges.html" class="hover:text-white transition">Badges</a>
      </div>
      
      <!-- Copyright -->
      <p class="text-white/60 text-xs font-medium">© 2025 SciQuest Heroes. Safe learning for curious minds.</p>
    </div>
  </div>
</footer>
```

---

### Child-Facing Badge Gallery (`badges/badges.html`)

**Layout**:
- Fixed header (Anpu branch style)
- Hero section: "Your Curiosity Badges" (font-fredoka, 4xl-5xl, white)
- Summary card: Glassmorphism card showing "You've unlocked X of Y badges"
- Badge grid: All badges displayed (unlocked + locked)
- Badge detail modal: Opens on badge click
- Footer (Anpu branch style)

**Badge Grid**:
- Responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Mobile Responsiveness**: Grid collapses to 1-2 columns on mobile (< 768px), wraps correctly on smaller screens
- **Tap Targets**: All badge tiles meet minimum mobile tap target size (44x44px minimum, badges exceed this requirement)
- Each badge tile:
  - Large icon circle (64x64px): `w-16 h-16 rounded-full`
  - Badge name: `font-fredoka text-xl font-bold text-white mb-2`
  - Status indicator: Checkmark badge (unlocked) or lock badge (locked)
  - Unlocked: Full color gradient, purple glow
  - Locked: Grayscale/dimmed, reduced opacity (`opacity-40`)
  - Hover effect: Enhanced glow, slight scale (`hover:scale-105 transition`)
- **Badge Ordering Rules**:
  - Sort badges by: unlocked badges first → locked badges second → then by rarity (rare → uncommon → common) → then alphabetical by name
  - No random ordering allowed
  - Implementation: Sort function in `badges.js` applies this order before rendering

**Badge Tile Styling**:
- Unlocked: `bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_30px_rgba(155,55,255,0.4)]`
- Locked: `bg-white/10 opacity-40`
- Container: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- Hover: `hover:shadow-[0_0_40px_rgba(155,55,255,0.6)] transition cursor-pointer`

**Badge Detail Modal**:
- Modal overlay: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center`
- Modal card: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_0_60px_rgba(155,55,255,0.5)]`
- Large badge icon: `w-32 h-32 rounded-full` with gradient or grayscale
- Badge name: `font-fredoka text-3xl font-bold text-white mb-4`
- Badge description: `text-white/80 text-lg mb-4`
- Progress indicator (if applicable): "X of Y stories completed" with progress bar
- Hint text (if locked): `text-white/60 italic text-sm` - "Hint: [description]"
- Earned date (if unlocked): `text-white/70 text-sm` - "Earned on: [date]"
- **"How to Earn This" CTA** (if locked): Deep-link button to relevant Story or Chat page based on badge category
  - Story badges: Link to `/stories/index.html?topicTag={category}`
  - Chat badges: Link to `/chat/index.html?topicId={relatedTopicId}`
  - Quiz badges: Link to quiz feature (placeholder for future)
- Close button: X button in top-right (`absolute top-4 right-4`)
- **Back Navigation**: Modal supports ESC key to close, click outside to dismiss, maintains Anpu branch styling

**Badge Tile Behavior (Child View)**:
- **Click Action**: Clicking a badge tile must open the badge detail modal (required behavior)
- **Tile Styling**: Cursor pointer (`cursor-pointer`) indicates clickability
- **Modal Consistency**: Modal must remain consistent with Anpu branch styling (glassmorphism, purple glow, no plain white)
- **Deep Linking**: Modal "How to Earn This" CTA deep-links to relevant Story or Chat page to guide child toward earning the badge
- **Back Navigation**: Modal supports multiple dismiss methods (X button, ESC key, click outside) and maintains page state

---

### Parent Dashboard Badge Section (Expansion)

**Location**: `parent/dashboard.html` - `<StudentBadgesSection />`

**Current Implementation**: Already renders badges with unlock/lock states

**Enhancements**:
- Make badge tiles clickable: Opens badge detail modal
- Badge detail modal: Shows full badge information, progress, earned date
- Badge breakdown: Enhanced summary "X unlocked, Y locked" with visual indicators
- Filter buttons (optional): "All", "Unlocked", "Locked" tabs
- Badge progress indicators: Show progress toward locked badges (e.g., "3 of 5 stories")
- Admin controls stub: "View all badge rules" button (placeholder alert for now)

**Badge Tile Enhancements**:
- Add click handler to existing badge tiles in `renderBadges()`
- On click: Open badge detail modal with full badge information
- Show progress indicator for locked badges: `{progress.current} of {progress.required}`

---

### Celebratory Animation Component (`shared/badge-celebration.js`)

**Reusable Component**: `BadgeCelebration`

**Export Functions**:
- `showBadgeCelebration(badgeId, badgeName, badgeIcon)` - Main function to trigger celebration
- `createConfetti()` - Helper to create confetti particles
- `createCelebrationOverlay(badgeId, badgeName, badgeIcon)` - Creates overlay DOM

**Features**:
- Confetti animation (CSS-based particles with random colors)
- Badge popup overlay with glow effect
- Sound effect placeholder (optional, muted by default)
- Auto-dismiss after 5 seconds
- "View Badge" button linking to badge gallery
- Manual dismiss: X button or click outside

**Animation Sequence**:
1. Trigger: Badge unlocked event detected
2. Overlay appears: Semi-transparent backdrop with blur
3. Badge icon animates: Scale from 0.5 to 1.2, then settle at 1.0 (CSS keyframes)
4. Confetti bursts: Colorful particles fall from top (20-30 particles, purple/pink/gold)
5. Glow pulse: Purple-pink glow pulses 3 times around badge icon
6. Text appears: "Badge Unlocked!" (font-fredoka, 4xl, white)
7. Badge name displays: Below icon (font-fredoka, 2xl, white)
8. "View Badge" button: Purple-pink gradient button linking to `/child/badges?badgeId={id}`
9. Auto-dismiss: After 5 seconds or manual close

**Badge Celebration Flow Rules**:
- **Page Context**: Child remains on the Story/Chat page when badge unlocks (celebration overlay appears over current page)
- **Navigation**: "View Badge" button links directly to `/child/badges?badgeId={id}` (opens in same tab or new tab, depending on implementation preference - recommend same tab)
- **Multiple Badge Queue**: If multiple badges unlock simultaneously, celebrations must queue (not overlap)
  - Queue implementation: Store badges in array, show one at a time
  - Maximum 1 celebration visible at a time
  - Each celebration auto-dismisses after 5 seconds before next one appears
  - Queue order: First badge unlocked appears first, subsequent badges follow in order
- **Celebration State**: Track active celebration overlay to prevent multiple overlays from stacking
- **Mobile Responsiveness**: Celebration modal must be responsive and safe-area-aware (use `safe-area-inset-*` CSS properties for iOS)
- **Progress Indicators**: Progress indicators and badge rows must wrap correctly on smaller screens

**Styling**:
- Overlay: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center`
- Celebration card: `bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_60px_rgba(155,55,255,0.8)] rounded-3xl p-8 text-center`
- Icon container: `w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl border-4 border-white/30 mx-auto mb-4 flex items-center justify-center`
- Text: `font-fredoka text-4xl font-bold text-white mb-2`
- Badge name: `font-fredoka text-2xl font-bold text-white mb-6`
- Confetti: CSS animation with `@keyframes confetti-fall` (random colors, random delays)

**Usage**:
```javascript
import { showBadgeCelebration } from '../shared/badge-celebration.js';

// Trigger celebration when badge awarded
showBadgeCelebration('first-curious-question', 'First Curious Question', '💭');
```

---

## Badge Rules Engine Architecture

### Rule Definition Format (`badge-rules.json`)

```json
{
  "rules": [
    {
      "id": "first-curious-question",
      "badgeId": "first-curious-question",
      "trigger": {
        "type": "chat_message",
        "conditions": {
          "count": 1,
          "role": "user"
        }
      },
      "evaluation": {
        "type": "count",
        "source": "chat_messages",
        "filter": { "role": "user" },
        "threshold": 1
      },
      "priority": 1,
      "description": "Triggered when user sends first chat message"
    },
    {
      "id": "story-master",
      "badgeId": "story-master",
      "trigger": {
        "type": "story_completed",
        "conditions": {}
      },
      "evaluation": {
        "type": "count",
        "source": "story_progress",
        "filter": { "completed": true },
        "threshold": 5
      },
      "priority": 2,
      "description": "Triggered when 5 stories completed"
    },
    {
      "id": "quiz-hero",
      "badgeId": "quiz-hero",
      "trigger": {
        "type": "quiz_completed",
        "conditions": {
          "score": { "gte": 80 }
        }
      },
      "evaluation": {
        "type": "max_score",
        "source": "quiz_attempts",
        "threshold": 80
      },
      "priority": 2,
      "description": "Triggered when quiz score >= 80%"
    },
    {
      "id": "streak-star",
      "badgeId": "streak-star",
      "trigger": {
        "type": "daily_activity",
        "conditions": {}
      },
      "evaluation": {
        "type": "streak",
        "source": "all_activities",
        "threshold": 7,
        "unit": "days"
      },
      "priority": 3,
      "description": "Triggered when 7-day streak achieved"
    }
  ]
}
```

### Rule Evaluation Pipeline

**Functions** (in `badges/badge-services.js`):

#### `evaluateBadgeRules(childId, triggerType, triggerData)`
- Main entry point for badge evaluation
- Loads badge rules from `badge-rules.json` (mock) or Supabase (future)
- Filters rules by trigger type
- Evaluates each rule in priority order
- Returns array of newly awarded badges: `Array<{badgeId, awardedAt, context}>`
- Prevents duplicate awards (checks existing awards first)
- **Multi-trigger Edge Cases**:
  - Badge awards occurring from multiple triggers (e.g., story + chat) must be evaluated in order of rule priority
  - Avoid duplicate context entries (merge context objects if same badge triggered multiple ways)
  - Ensure atomicity for multi-trigger situations (all-or-nothing badge awarding per evaluation cycle)
  - Context object includes all trigger sources: `{triggers: ['story_completed', 'chat_message'], ...triggerData}`
  - Duplicate prevention: Check badge award status before each evaluation, skip if already awarded

#### `evaluateRule(rule, childId, context)`
- Evaluates single badge rule
- Checks if badge already awarded (from localStorage or Supabase)
- Loads required data based on rule source (`chat_messages`, `story_progress`, `quiz_attempts`, `all_activities`)
- Applies evaluation logic:
  - `count`: Counts items matching filter
  - `max_score`: Checks maximum score >= threshold
  - `streak`: Calculates consecutive days with activity
- Returns: `{awarded: boolean, badgeId: string, progress?: {current, required}}`

#### `awardBadge(childId, badgeId, context)`
- Atomically awards badge to child
- Saves to localStorage: `sqh_badge_awards_v1`
- Format: `{childId: [{badgeId, awardedAt, context}]}`
- Queues Supabase insert if available
- Triggers celebration animation via `showBadgeCelebration()`
- Logs analytics event: `badge_awarded`
- Returns award object: `{badgeId, awardedAt, context}`

#### `getChildBadges(childId)`
- Returns all badges for child with unlock status
- Source: localStorage cache (`sqh_badge_awards_v1`) or Supabase
- Includes: `badgeId, unlocked, awardedAt, progress` (if applicable)
- Merges badge catalog with award status

#### `getBadgeProgress(childId, badgeId)`
- Returns progress toward locked badge
- Example: `{current: 3, required: 5, percentage: 60}` for "3 of 5 stories completed"
- Used for progress indicators in UI
- Calculates from rule evaluation data

---

## Data Flow & Mock Behavior

### Badge Services Functions

#### `loadBadgeCatalog()`
- Returns array of all badge definitions
- Uses Supabase `badges` table if available
- Fallback to `mockBadgeData.json` if Supabase unavailable
- Returns: `Array<{id, name, description, icon, hint, category, rarity}>`
- Caches result in component state

#### `loadBadgeRules()`
- Returns array of badge rule definitions
- Uses Supabase `badge_rules` table if available
- Fallback to `badge-rules.json` if Supabase unavailable
- Returns: `Array<{id, badgeId, trigger, evaluation, priority, description}>`
- Sorted by priority (lower number = evaluated first)

#### `getBadgeAwards(childId)`
- Returns array of badges awarded to child
- Source: localStorage (`sqh_badge_awards_v1`) or Supabase `badge_awards` table
- Format: `Array<{badgeId, awardedAt, context}>`
- Cached in component state for performance

#### `checkBadgeAwards(childId, badgeId)`
- Checks if specific badge is already awarded
- Prevents duplicate awards
- Returns: `boolean`

#### `saveBadgeAward(childId, badgeId, context)`
- Saves badge award to localStorage
- Format: `sqh_badge_awards_v1 = {childId: [{badgeId, awardedAt, context}]}`
- Appends to existing awards array for child
- Future: Queues Supabase insert if available

#### `logBadgeEvent(eventType, payload)`
- Queues badge analytics events
- Events: `badge_awarded`, `badge_viewed`, `badge_unlock_celebrated`, `badge_rules_viewed`, `badge_triggered`
- Queued to shared analytics queue: `sqh_analytics_queue_v1`
- Format: `{event_name, event_data, timestamp, source: 'badge_system'}`

---

## Mock Data Structure

### `badges/mockBadgeData.json`

```json
{
  "badges": [
    {
      "id": "first-curious-question",
      "name": "First Curious Question",
      "description": "Ask your first question in chat",
      "icon": "💭",
      "hint": "Ask 1 question in chat",
      "category": "chat",
      "rarity": "common"
    },
    {
      "id": "photosynthesis-explorer",
      "name": "Photosynthesis Explorer",
      "description": "Complete all stories about photosynthesis",
      "icon": "🌱",
      "hint": "Complete your first science story about plants",
      "category": "stories",
      "rarity": "common"
    },
    {
      "id": "quiz-hero",
      "name": "Quiz Hero",
      "description": "Score 80% or higher on any quiz",
      "icon": "🏆",
      "hint": "Score 80%+ on a quiz",
      "category": "quizzes",
      "rarity": "uncommon"
    },
    {
      "id": "story-master",
      "name": "Story Master",
      "description": "Complete 5 stories",
      "icon": "📚",
      "hint": "Complete 5 stories",
      "category": "stories",
      "rarity": "rare"
    },
    {
      "id": "streak-star",
      "name": "Streak Star",
      "description": "Maintain a 7-day learning streak",
      "icon": "⭐",
      "hint": "Learn for 7 days in a row",
      "category": "streaks",
      "rarity": "rare"
    }
  ]
}
```

### `badges/badge-rules.json`

See "Badge Rules Engine Architecture" section above for format.

### Mock Mode Default Badge Awards

**Format** (in `mockBadgeData.json` or initialization logic):
```json
{
  "defaultAwards": {
    "child-akhil": ["first-curious-question"],
    "child-maya": ["first-curious-question"],
    "child-ryan": ["first-curious-question"]
  }
}
```

**Behavior**:
- On badge gallery load, check if child has any awards
- If no awards exist, initialize with default awards from mock data
- Ensures at least one unlocked badge visible for visual richness during testing

---

## Integration Points

### Comic Viewer Integration (`stories/story-viewer.js`)

**Modifications**:
- Import badge evaluation: `import { evaluateBadgeRules } from '../badges/badge-services.js'`
- Import celebration: `import { showBadgeCelebration } from '../shared/badge-celebration.js'`
- On story completion (last panel reached):
  ```javascript
  const newBadges = await evaluateBadgeRules(
    DEFAULT_CHILD_ID, 
    'story_completed', 
    { storyId, topicTag: story.topicTag }
  );
  
  // Show celebration for each new badge
  for (const badge of newBadges) {
    const badgeDef = await getBadgeById(badge.badgeId);
    showBadgeCelebration(badge.badgeId, badgeDef.name, badgeDef.icon);
  }
  ```
- On first story started: Check for "First Story" badge (if rule exists)
- Update badge cache after award

**Trigger Points**:
- Story completed (last panel reached) - Triggers "Story Master" (5 stories) and topic-specific badges
- First story started - Triggers "First Story" badge (if rule exists)
- X stories completed - Triggers milestone badges

### Chat AI Integration (`chat/chat-session.js`)

**Modifications**:
- Import badge evaluation: `import { evaluateBadgeRules } from '../badges/badge-services.js'`
- Import celebration: `import { showBadgeCelebration } from '../shared/badge-celebration.js'`
- On first message sent:
  ```javascript
  const newBadges = await evaluateBadgeRules(
    DEFAULT_CHILD_ID,
    'chat_message',
    { topicId: state.topicId, messageCount: state.messages.filter(m => m.role === 'user').length }
  );
  
  // Show celebration for each new badge
  for (const badge of newBadges) {
    const badgeDef = await getBadgeById(badge.badgeId);
    showBadgeCelebration(badge.badgeId, badgeDef.name, badgeDef.icon);
  }
  ```
- On X messages sent: Check for milestone badges (if rules exist)
- On topic explored: Check for topic-specific badges

**Trigger Points**:
- First chat message (First Curious Question badge)
- X chat messages sent (Milestone badges, if rules exist)
- Multiple topics explored (Explorer badges, if rules exist)

### Quiz Integration (Future - Placeholder)

**Modifications** (for future quiz feature):
- On quiz completion: Call `evaluateBadgeRules(childId, 'quiz_completed', {score, topicId})`
- Check for Quiz Hero badge (score >= 80%)
- Display celebration overlay if badge awarded

**Trigger Points**:
- Quiz score >= 80% (Quiz Hero badge)
- X quizzes completed (Milestone badges, if rules exist)
- Perfect score 100% (Perfect Score badge, if rule exists)

### Parent Dashboard Integration (`parent/dashboard.js`)

**Modifications**:
- Enhance `renderBadges()` to make badges clickable
- Add badge detail modal function: `showBadgeDetailModal(badgeId)`
- On badge tile click: Open modal with full badge information
- Show progress indicators for locked badges: `{progress.current} of {progress.required}`
- Update badge summary when child switches
- Badge detail modal: Same styling as child-facing modal

---

## State Management

### Badge Cache (`sqh_badge_awards_v1`)

**Format**:
```javascript
{
  "child-akhil": [
    {
      "badgeId": "first-curious-question",
      "awardedAt": "2025-01-15T10:30:00Z",
      "context": {
        "trigger": "chat_message",
        "sourceId": "chat_session_123",
        "topicId": "moon-physics"
      }
    },
    {
      "badgeId": "story-master",
      "awardedAt": "2025-01-20T14:00:00Z",
      "context": {
        "trigger": "story_completed",
        "storyId": "mystery-moon",
        "topicTag": "Space Science"
      }
    }
  ],
  "child-maya": [
    {
      "badgeId": "first-curious-question",
      "awardedAt": "2025-01-14T09:15:00Z",
      "context": {
        "trigger": "chat_message",
        "sourceId": "chat_session_456",
        "topicId": "solar-system"
      }
    }
  ]
}
```

### Badge Catalog Cache
- Cached in component state after first load
- Refreshed on page navigation (optional)
- Source: `mockBadgeData.json` or Supabase `badges` table

### Badge Rules Cache
- Cached in service layer after first load
- Loaded once per session
- Source: `badge-rules.json` or Supabase `badge_rules` table

### Celebration State
- Tracks active celebration overlay
- Prevents multiple overlays from stacking
- Auto-dismisses after 5 seconds
- Manual dismiss: X button or click outside

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_USE_BADGES_MOCKS` | `'true'` | Enable/disable mock mode |
| `VITE_EDGE_ANALYTICS_URL` | `''` | Optional edge function for analytics |
| `VITE_SUPABASE_URL` | - | Supabase project URL (future) |
| `VITE_SUPABASE_ANON_KEY` | - | Supabase anonymous key (future) |

---

## Future Database Integration

### Supabase Tables (Planned)
- `badges` - Badge catalog (id, name, description, icon, hint, category, rarity, created_at)
- `badge_rules` - Badge rule definitions (id, badge_id, trigger_type, trigger_conditions, evaluation_logic, priority, created_at)
- `badge_awards` - Badge awards (id, user_id, badge_id, awarded_at, context JSON, created_at)
- Helper function: `award_badge(user_id, badge_id, context)` - Atomic badge awarding

### Edge Functions (Planned)
- Badge evaluation edge function (evaluates rules on trigger events)
- Badge awarding edge function (atomic badge issuance)
- Badge progress calculation function (calculates progress toward locked badges)

**Note**: Database integration will be consolidated in a dedicated "Database Finalization Phase" after all UI flows are completed.

---

## Testing Checklist Summary

### Navigation Tests
- [ ] Child can navigate to `/child/badges`
- [ ] Badge gallery displays all badges
- [ ] Badge detail modal opens on click
- [ ] Celebration overlay appears on badge unlock
- [ ] "View Badge" button links to gallery
- [ ] Parent Dashboard badge section enhanced
- [ ] Badge link in header navigation works

### Functional Tests
- [ ] Badge rules evaluate correctly
- [ ] Badge awards persist across page refreshes
- [ ] Celebration animation plays on unlock
- [ ] Duplicate awards prevented
- [ ] Badge progress indicators update correctly
- [ ] Mock data loads correctly
- [ ] Badge detail modal shows correct information
- [ ] Celebration overlay auto-dismisses after 5 seconds

### Integration Tests
- [ ] Story completion triggers badge evaluation
- [ ] Chat milestones trigger badge evaluation
- [ ] Badge celebration appears in Comic Viewer
- [ ] Badge celebration appears in Chat
- [ ] Parent Dashboard reflects badge updates
- [ ] Badge gallery updates when badge awarded

### Design Consistency Tests
- [ ] Background gradient matches Anpu branch
- [ ] Glassmorphism cards present
- [ ] Purple glow shadows on cards
- [ ] No plain white backgrounds
- [ ] Header/footer consistent across pages
- [ ] Typography (font-fredoka, Inter) correct
- [ ] Celebration animation matches design tokens

### Edge Cases
- [ ] Multiple badges unlocked simultaneously (queue implementation)
- [ ] Badge rules with complex conditions
- [ ] Badge progress calculation for locked badges
- [ ] Celebration overlay dismissal (auto + manual)
- [ ] Badge cache invalidation on new award
- [ ] Badge evaluation with missing data
- [ ] Badge gallery with no badges unlocked (default unlock in mock mode)
- [ ] Badge detail modal with locked badge
- [ ] Multi-trigger badge evaluation (same badge from multiple sources)
- [ ] Badge ordering rules applied correctly (unlocked → locked → rarity → alphabetical)

### Error-State Behavior

**Friendly Error States** (following empty-state pattern from Stories and Chat):
- **Badge Gallery Load Failure**:
  - Display: Glassmorphism card with error message
  - Message: "Unable to load badges right now. Please try again later."
  - Icon: 🏆 emoji with reduced opacity
  - Retry button: Purple-pink gradient button to reload page
  - Styling: Matches Anpu branch error states (`bg-white/10 backdrop-blur-xl border border-white/20`)

- **Badge Rules Load Failure**:
  - Log warning to console
  - Fallback: Use default badge rules from `badge-rules.json` (hardcoded fallback)
  - Display: Silent failure (badges still display, evaluation may be limited)
  - Analytics: Log `badge_rules_load_failed` event

- **Badge Modal Failure**:
  - Display: Error toast/notification in modal position
  - Message: "Unable to show badge details. Please try again."
  - Auto-dismiss: After 3 seconds or manual close
  - Styling: Amber/yellow error banner (`bg-amber-100/90 text-amber-900`)

- **Empty State** (No Badges):
  - Display: Friendly message with icon
  - Message: "No badges are available yet. Start exploring to earn your first badge! 🏆"
  - Styling: Glassmorphism card with centered content (`bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center`)

### Performance Tests
- [ ] Badge rules evaluation is fast (< 100ms)
- [ ] Badge gallery loads quickly (< 1 second)
- [ ] Celebration animation doesn't lag
- [ ] Badge cache reduces redundant evaluations

---

## Quick Reference URLs

| Page | URL |
|------|-----|
| Child Badge Gallery | `http://localhost:3000/child/badges` |
| Badge Detail | `http://localhost:3000/child/badges?badgeId=first-curious-question` |
| Parent Dashboard (with Badges) | `http://localhost:3000/parent/dashboard?childId=child-akhil` |

---

## Completion Status

| Item | Status |
|------|--------|
| Badge rules engine architecture | ⏳ Planned |
| Badge evaluation pipeline | ⏳ Planned |
| Child-facing badge gallery | ⏳ Planned |
| Badge detail modal | ⏳ Planned |
| Celebratory animation component | ⏳ Planned |
| Parent Dashboard badge expansion | ⏳ Planned |
| Story completion badge triggers | ⏳ Planned |
| Chat milestone badge triggers | ⏳ Planned |
| Mock data pipeline + Supabase fallback | ⏳ Planned |
| Badge cache persistence | ⏳ Planned |
| Analytics integration | ⏳ Planned |
| Header/footer/logout consistency | ⏳ Planned |
| Design tokens (gradients, glassmorphism) | ⏳ Planned |
| Vite route rewrite for `/child/badges` | ⏳ Planned |
| Supabase tables/edge functions provisioned | ⏳ Future phase |

---

## Files to Create/Modify

### New Files
- `badges/badges.html` - Child-facing badge gallery page
- `badges/badges.js` - Badge gallery UI logic and state management
- `badges/badge-services.js` - Badge evaluation engine and data layer
- `badges/badge-celebration.js` - Celebratory animation component (badge-specific)
- `badges/mockBadgeData.json` - Sample badge definitions
- `badges/badge-rules.json` - Badge rules engine definitions
- `shared/badge-celebration.js` - Reusable celebration component (used by Stories, Chat)

### Modified Files
- `vite.config.js` - Add route rewrite and build input for `/child/badges`
- `parent/dashboard.js` - Enhance `renderBadges()` with click handlers and detail modal
- `parent/dashboard-services.js` - Enhance `getChildBadges()` with progress calculation
- `stories/story-viewer.js` - Add badge evaluation triggers on story completion
- `stories/story-services.js` - Add badge evaluation hooks (optional)
- `chat/chat-session.js` - Add badge evaluation triggers on chat milestones
- `chat/chat-services.js` - Add badge evaluation hooks (optional)

---

**End of Implementation Plan**

