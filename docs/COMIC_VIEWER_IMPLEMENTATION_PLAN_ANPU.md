# Comic Viewer with Panel Navigation - Implementation Plan

**Branch:** Anpu  
**Feature:** Comic Viewer with Panel Navigation (Phase 1)  
**Status:** Implemented (Mock Mode)  
**Date:** _______________

---

## Overview

The Comic Viewer feature provides an interactive, panel-by-panel reading experience for science-themed comic stories. Children can navigate through story panels, view narrations, access glossary terms, and seamlessly transition to topic-specific chat conversations. This implementation focuses on UI scaffolding, mock data flow, progress tracking, and deep linking to the Chat AI feature. Database integration will be consolidated in a future phase.

This feature uses the same global header, footer, logout button logic, gradients, glassmorphism, and child-friendly design tokens used across the Anpu branch.

---

## Architecture & Design Principles

### Mock-First Approach
- Feature flag: `VITE_USE_STORY_MOCKS` (default: `true`)
- All functionality works with mock data before Supabase integration
- Graceful fallback to mocks if Supabase unavailable
- Follows same pattern as Topic Chat AI and Parent Dashboard

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
- **Panel Cards**: Glassmorphism with purple glow, no plain white
- **No Plain White**: All white surfaces replaced with glassmorphism or child-friendly colors

### Global Header & Footer (Required)
- **Same header structure** as Chat and Parent Dashboard pages
- **Same footer structure** as Chat and Parent Dashboard pages
- **Same logout button logic** (desktop + mobile variants)
- **Navigation links**: Stories, Chat, Dashboard (highlighted when on stories)

### Analytics Integration
- Lightweight placeholder functions for event logging
- Events: `story_viewer_opened`, `panel_viewed`, `story_completed`, `glossary_opened`, `chat_cta_clicked`
- Queued to localStorage: `sqh_analytics_queue_v1` (shared queue)
- No Supabase inserts at this phase (queued only)

---

## Navigation & Routing

### Routes
- `/stories` or `/stories/index.html` - Story listing page
- `/stories/story.html?storyId={id}` - Story detail page
- `/stories/{storyId}/read?panel={n}` - Comic panel viewer (clean URL format)
- Route rewrite: `/stories/{storyId}/read` → `/stories/reader.html?storyId={storyId}&panel={n}`

### Vite Configuration
- Route rewrite in `vite.config.js`:
  ```javascript
  server.middlewares.use((req, res, next) => {
    const match = req.url.match(/^\/stories\/([^/]+)\/read(\?.*)?$/);
    if (match) {
      const storyId = match[1];
      const existingQuery = match[2] || '';
      const params = new URLSearchParams(existingQuery.replace('?', ''));
      params.set('storyId', storyId);
      req.url = `/stories/reader.html?${params.toString()}`;
    }
    next();
  });
  ```
- Build inputs: `stories/index.html`, `stories/story.html`, `stories/reader.html`

### Navigation Flow
1. Landing page → `/stories/index.html` (Story List)
2. Story card → `/stories/story.html?storyId={id}` (Story Detail)
3. "Start Story" → `/stories/{storyId}/read?panel=0` (Comic Viewer - first panel)
4. "Resume Story" → `/stories/{storyId}/read?panel={lastPanel}` (Comic Viewer - last viewed)
5. Panel CTA → `/chat/index.html?topicId={topicId}&storyRef={storyId}&panelId={panelId}` (Chat with context)

### Query Parameters
- `story.html?storyId={id}` - Required: `storyId`
- `reader.html?storyId={id}&panel={n}` - Required: `storyId`, Optional: `panel` (default: 0 or last viewed)
- Clean URL format: `/stories/{storyId}/read?panel={n}` (updated via `history.replaceState`)

---

## File Structure

```
stories/
├── index.html              # Story listing page
├── story.html              # Story detail page
├── reader.html             # Comic panel viewer
├── stories-list.js         # List page UI logic
├── story-detail.js         # Detail page UI logic
├── story-viewer.js         # Panel viewer UI logic
├── story-services.js       # Data layer: mock/Supabase data, progress, analytics
└── mockStories.json        # Sample stories, panels, glossary terms
```

### Integration Points
- `chat/chat-session.js` - Receives context from Comic Viewer CTA
- `vite.config.js` - Story routes in build config + rewrite middleware
- Shared analytics queue with Chat AI and Parent Dashboard
- `index.html` - Landing page links to `/stories`

---

## UI Components & Layout

### Global Header (Required - Same as Anpu Branch)

**Implementation**: Identical to Chat and Parent Dashboard pages

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
        <a href="./index.html" class="font-fredoka text-purple-200 font-bold">Stories</a>
        <a href="../chat/index.html" class="font-fredoka text-white hover:text-purple-200 transition font-bold">Chat</a>
        <a href="../parent/dashboard.html" class="font-fredoka text-white hover:text-purple-200 transition font-bold">Dashboard</a>
        <button id="logoutBtn" class="font-fredoka text-white hover:text-purple-200 transition font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/10">Logout</button>
      </div>
      
      <!-- Mobile Logout Button -->
      <button id="logoutBtnMobile" class="lg:hidden font-fredoka text-white hover:text-purple-200 transition font-bold px-3 py-2 rounded-full border border-white/20 hover:bg-white/10 text-sm">Logout</button>
    </div>
  </div>
</nav>
```

### Global Footer (Required - Same as Anpu Branch)

**Implementation**: Identical to Chat and Parent Dashboard pages

---

### Story List Page (`stories/index.html`)

**Layout**:
- Fixed header (Anpu branch style)
- Hero section: "Choose Your Comic Journey"
- Story cards grid (2-3 columns responsive)
- Footer (Anpu branch style)

**Story Card**:
- Background: `bg-gradient-to-br from-indigo-700/40 to-fuchsia-600/40`
- Cover image: Top section (h-48)
- Topic tag pill: Top-left overlay
- Title: Font-fredoka, large, white
- Summary: Text-white/80, line-clamp-3
- Metadata: Reading level, estimated time
- Progress card: Shows "Not started", "Panel X of Y", or "Completed"
- "Continue" button: Purple-pink gradient

---

### Story Detail Page (`stories/story.html`)

**Layout**:
- Fixed header (Anpu branch style)
- Story cover image: Large hero image
- Story metadata: Title, topic, reading level, estimated time
- Summary: Full story description
- Panel preview: First 4 panels (if available)
- Action buttons:
  - "Start Story" - Purple-pink gradient
  - "Resume Story" - Shows only if progress exists
  - "Launch Topic Chat" - Links to chat lobby with story context
- Footer (Anpu branch style)

---

### Comic Panel Viewer (`stories/reader.html`)

**Layout**:
- Fixed header (Anpu branch style)
- Back button: "← Stories" (returns to list)
- Story title: Displays in header
- Panel content area:
  - **Panel Image**: Large, centered
  - **Panel Tag**: Small text (e.g., "Panel 1")
  - **Narration**: Story text below image
  - **Glossary Terms**: Pills below narration (if available)
  - **Chat CTA**: Button to launch topic chat
- Navigation controls:
  - "Previous Panel" button (disabled on first panel)
  - "Next Panel" button (disabled on last panel)
  - Progress dots: Clickable dots for each panel
- Panel counter: "Panel X of Y"
- Glossary dialog: Modal with term definitions
- Footer (Anpu branch style)

**Panel Card Styling**:
- Container: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl`
- Purple glow: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- No plain white backgrounds

**Glossary Terms**:
- Displayed as pills below narration
- Clickable to open glossary dialog
- Styling: `bg-purple-600/30 text-purple-100 border border-purple-400/50`

**Progress Dots**:
- Small dots representing each panel
- Active dot: Full opacity, larger size
- Inactive dots: Reduced opacity
- Clickable to jump to panel

---

## Data Flow & Mock Behavior

### Story Services Functions

#### `getStoryList()`
- Returns array of all available stories
- Uses Supabase `stories` table if available
- Fallback to `mockStories.json` if Supabase unavailable
- Returns: `Array<{id, title, coverUrl, topicTag, readingLevel, estimatedTime, summary}>`

#### `getStoryById(storyId)`
- Returns single story with full metadata
- Includes panels array if available
- Returns: `{id, title, coverUrl, topicTag, readingLevel, estimatedTime, summary, panels: [...]}`

#### `getPanelsForStory(storyId)`
- Returns panels array for a story
- Source: `panels` JSON column or `mockStories.json`
- Returns: `Array<{panelId, imageUrl, narration, glossaryTerms, chatTopicId, ctaLabel}>`

#### `getStoryProgressSummary(storyId)`
- Returns progress state for a story
- Source: localStorage (`sqh_story_progress_v1`) or Supabase `story_progress` table
- Returns: `{storyId, lastPanelIndex, completedAt, lastViewedAt}` or `null`

#### `saveStoryProgress(storyId, lastPanelIndex, completed)`
- Saves progress to localStorage
- Queues Supabase upsert if available
- Updates: `sqh_story_progress_v1` (localStorage key)

#### `logAnalyticsEvent(eventName, eventData)`
- Queues analytics events to localStorage
- Key: `sqh_analytics_queue_v1` (shared with Chat AI, Parent Dashboard)
- Events: `story_viewer_opened`, `panel_viewed`, `story_completed`, `glossary_opened`, `chat_cta_clicked`
- Future: Edge function POST or Supabase insert

---

## Mock Data Structure

### `mockStories.json`

```json
{
  "stories": [
    {
      "id": "mystery-moon",
      "title": "Mystery on the Moon",
      "coverUrl": "../images/chlorophotosynthesis.png",
      "topicTag": "Space Science",
      "readingLevel": "Ages 7-9",
      "estimatedTime": "6 min",
      "summary": "Join Luna and her robot friend Nova...",
      "panels": [
        {
          "panelId": "panel-01",
          "imageUrl": "../images/chlorophotosynthesis.png",
          "narration": "Luna's moon rover screeched to a stop...",
          "glossaryTerms": ["crater", "lunar dust"],
          "chatTopicId": "moon-physics",
          "ctaLabel": "Ask Nova why the crater glows"
        }
      ]
    }
  ]
}
```

**Panel Structure**:
- `panelId`: Unique identifier (e.g., "panel-01")
- `imageUrl`: Path to panel image
- `narration`: Story text for the panel
- `glossaryTerms`: Array of term strings
- `chatTopicId`: Topic ID for chat CTA (matches chat topics)
- `ctaLabel`: Text for chat CTA button

---

## State Management

### Progress Persistence
- **Storage Key**: `sqh_story_progress_v1`
- **Format**: `{storyId: {lastPanelIndex, completedAt, lastViewedAt}}`
- **Location**: localStorage (immediate), Supabase (queued)
- **Updates**: On panel navigation, on story completion

### Analytics Queue
- **Storage Key**: `sqh_analytics_queue_v1` (shared with Chat AI, Parent Dashboard)
- **Format**: `Array<{event_name, event_data, timestamp, source}>`
- **Source**: `'comic_viewer'`
- **Events**:
  - `story_viewer_opened` - When viewer loads
  - `panel_viewed` - When panel displayed
  - `story_completed` - When last panel reached
  - `glossary_opened` - When glossary dialog opened
  - `chat_cta_clicked` - When chat CTA button clicked

---

## Integration with Chat AI

### Deep Link Flow
1. User clicks "Ask the AI about this panel" in Comic Viewer
2. Navigates to: `/chat/index.html?topicId={panel.chatTopicId}&storyRef={storyId}&panelId={panel.panelId}`
3. Chat page reads params and:
   - Pre-selects topic (`topicId`)
   - Shows context badge: "From: [Story Name] - Panel [N]"
   - Allows user to return to exact panel via context badge click

### Context Preservation
- Story reference: `storyRef` query param
- Panel reference: `panelId` query param
- Story title: Loaded from story metadata for context badge display

---

## Environment Variables

- `VITE_USE_STORY_MOCKS` (default: `'true'`) - Enable/disable mock mode
- `VITE_SUPABASE_URL` (optional) - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` (optional) - Supabase anon key
- `VITE_EDGE_ANALYTICS_URL` (optional) - Edge function URL for analytics

---

## Future Database Integration

### Supabase Tables (Planned)
- `stories` - Story metadata and panels JSON column
- `story_progress` - User progress tracking (`user_id`, `story_id`, `last_panel_index`, `completed_at`)
- `analytics_events` - Event logging (shared with Chat AI, Parent Dashboard)

### Edge Functions (Planned)
- Analytics logging edge function
- Progress sync edge function

**Note**: Database integration will be consolidated in a dedicated "Database Finalization Phase" after all UI flows are completed.

---

## Testing Checklist Summary

### Navigation Tests
- [ ] Landing page → Story list
- [ ] Story list → Story detail
- [ ] Story detail → Comic viewer (Start Story)
- [ ] Story detail → Comic viewer (Resume Story)
- [ ] Panel navigation (Next/Previous)
- [ ] Progress dots navigation
- [ ] Glossary dialog open/close
- [ ] Chat CTA deep link

### Functional Tests
- [ ] Mock data loads correctly
- [ ] Progress persists across page refreshes
- [ ] Panel state updates URL correctly
- [ ] Clean URL format (`/stories/{storyId}/read`) works
- [ ] Analytics events queue to localStorage
- [ ] Logout button clears storage

### Design Consistency Tests
- [ ] Background gradient matches Anpu branch
- [ ] Glassmorphism cards present
- [ ] Purple glow shadows on cards
- [ ] No plain white backgrounds
- [ ] Header/footer consistent across pages
- [ ] Typography (font-fredoka, Inter) correct

---

## Quick Reference URLs

| Page | URL |
|------|-----|
| Story List | `http://localhost:3000/stories/index.html` |
| Story Detail | `http://localhost:3000/stories/story.html?storyId=mystery-moon` |
| Comic Viewer (Start) | `http://localhost:3000/stories/mystery-moon/read?panel=0` |
| Comic Viewer (Panel 3) | `http://localhost:3000/stories/mystery-moon/read?panel=3` |

---

## Completion Status

| Item | Status |
|------|--------|
| Routes + Vite inputs for stories | ✅ |
| Story list/detail/reader UIs with Tailwind styling | ✅ |
| Mock data pipeline + Supabase fallback | ✅ |
| Local progress persistence + resume flow | ✅ |
| Analytics helper with offline queueing | ✅ |
| CTA links to chat with context | ✅ |
| Clean URL format (`/stories/{storyId}/read`) | ✅ |
| Glossary dialog and terms display | ✅ |
| Progress dots navigation | ✅ |
| Panel navigation (Next/Previous) | ✅ |
| Header/footer/logout consistency | ✅ |
| Design tokens (gradients, glassmorphism) | ✅ |
| Supabase tables/edge functions provisioned | ⏳ Future phase |

---

**End of Implementation Plan**



