# Topic Chat AI with Safe Replies - Implementation Plan

**Branch:** Anpu  
**Feature:** Topic Chat AI with Safe Replies  
**Status:** Implemented (Mock Mode)  
**Date:** _______________

---

## Overview

The Topic Chat AI feature provides a safe, educational chat interface where children can ask questions about science topics. This implementation focuses on UI scaffolding, mock data flow, and deep linking from the Comic Viewer. Database integration will be consolidated in a future phase.

---

## Architecture & Design Principles

### Mock-First Approach
- Feature flag: `VITE_USE_CHAT_MOCKS` (default: `true`)
- All functionality works with mock data before Supabase integration
- Graceful fallback to mocks if Supabase unavailable
- Follows same pattern as Comic Viewer (`VITE_USE_STORY_MOCKS`)

### Design Token Consistency
- **Primary Background Gradient**: `from-[#4F2EC9] to-[#9B37FF]` (deep purple to pink-violet)
- **Secondary Surfaces**: 
  - `bg-indigo-600/30`
  - `bg-purple-700/25`
  - `bg-fuchsia-500/20`
- **Glassmorphism**: `bg-white/10 backdrop-blur-xl border border-white/20`
- **Purple Glow Shadow**: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- **Typography**: `font-fredoka` for headings, `Inter` for body
- **Borders**: `rounded-3xl`, `rounded-2xl`
- **Safety Banner**: Amber/yellow (`bg-amber-100/90 text-amber-900`)
- **No Plain White**: All white surfaces replaced with glassmorphism or child-friendly colors

### Analytics Integration
- Lightweight placeholder functions mirroring Comic Viewer
- Events: `chat_started`, `message_sent`, `quick_prompt_used`, `chat_session_ended`, `escalation_clicked`
- Queued to localStorage: `sqh_analytics_queue_v1` (shared with Comic Viewer)
- No Supabase inserts at this phase (queued only)

---

## File Structure

```
chat/
├── index.html              # Main chat interface (lobby + session)
├── chat-session.js         # UI logic, message handling, state management
├── chat-services.js       # Data layer: mock responses, topics, transcripts
└── mockChatData.json       # Sample topics, response patterns, quick prompts
```

### Integration Points
- `stories/story-viewer.js` - CTA button passes context to chat
- `vite.config.js` - Chat route registered in build config
- Shared analytics queue with Comic Viewer

---

## Navigation & Routing

### Routes
- `/chat` or `/chat/index.html` - Chat lobby (topic picker)
- `/chat/index.html?topicId={id}` - Active chat session
- `/chat/index.html?topicId={id}&storyRef={storyId}&panelId={panelId}` - Chat with story context

### Access Control
- Child-only routes (placeholder check, no parent access)
- Redirect to `/stories` if unauthorized (future)

### Deep Link Flow
1. User clicks "Ask the AI about this panel" in Comic Viewer
2. Navigates to: `/chat/index.html?topicId={panel.chatTopicId}&storyRef={storyId}&panelId={panel.panelId}`
3. Chat page reads params and:
   - Pre-selects topic
   - Shows context badge: "From: [Story Name] - Panel [N]"
   - Pre-fills quick prompts related to topic

---

## UI Components

### Chat Lobby (No topicId)
- **TopicPicker Grid**: 2-3 column responsive grid
- **Topic Cards**: 
  - Background: `bg-gradient-to-br from-indigo-700/40 to-fuchsia-600/40`
  - Icon: Inside `bg-white/20` circle with padding
  - Shadow: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
  - No plain white backgrounds
- **Recent Topics**: From localStorage (future enhancement)

### Chat Session (With topicId)
- **ChatHeader**: Topic name, back button, context badge (with fixed header navigation)
- **SafetyBanner**: Always visible, educational tone indicator (`bg-amber-100/90`)
- **ChatWindow**: 
  - Glassmorphism: `bg-white/10 backdrop-blur-xl border border-white/20`
  - Purple glow: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
  - Message bubble stack (user right, AI left)
- **QuickPrompts**: Row of pre-written safe questions (`bg-white/10 border border-white/20`)
- **MessageInput**: Textarea with glassmorphism (`bg-white/10 border border-white/20`)
- **EscalationCTA**: "Ask a parent or teacher" button (`bg-indigo-600/30`)
- **Fixed Header/Footer**: Consistent navigation across all pages

### Message Bubbles
- **User**: Right-aligned, purple gradient (`from-purple-500 to-pink-500`), white text, bold, `rounded-3xl`
- **AI**: Left-aligned, soft lavender (`bg-[#E8D9FF] border-2 border-[#C8AFFF]`), dark text, `rounded-3xl`
- **Loading**: Animated purple dots with "Thinking..." text in lavender bubble
- **No Plain White**: AI bubbles use lavender instead of white

---

## Data Flow & Mock Behavior

### Chat Services Functions

#### `getTopicCatalog()`
- Returns array of topics from `mockChatData.json`
- Future: Supabase `topics` table query
- Fallback to mocks if Supabase fails

#### `getTopicById(topicId)`
- Returns single topic metadata
- Includes: `id`, `name`, `description`, `icon`, `quickPrompts`
- Future: Supabase query with `enabled=true` filter

#### `sendMessage(topicId, message, context)`
- Applies safety filter (placeholder: always safe)
- Pattern matches against mock responses
- Simulates 1-2 second delay
- Returns AI response object

#### `applySafetyFilter(message)`
- Placeholder: always returns `{safe: true}`
- Future: Real safety check via Supabase RPC or edge function
- Logs filter attempts for future implementation

#### `saveTranscript(sessionId, transcript)`
- Saves to localStorage: `sqh_chat_transcripts_v1`
- Format: `{sessionId: {topicId, messages, context, childId, createdAt, updatedAt}}`
- Future: Supabase `chat_sessions` table upsert

#### `loadTranscript(sessionId)`
- Restores previous conversation from localStorage
- Returns transcript object or `null`

#### `generateSessionId()`
- Creates unique session ID: `chat_{timestamp}_{random}`
- Used for transcript persistence

#### `logChatEvent(eventType, payload)`
- Queues event to shared analytics queue
- Events prefixed with `chat_` (e.g., `chat_started`)
- Future: Edge function or Supabase insert

---

## Mock Data Structure

### `mockChatData.json`

```json
{
  "topics": [
    {
      "id": "moon-physics",
      "name": "Moon & Gravity",
      "description": "Learn about the moon and how gravity works",
      "icon": "🌙",
      "quickPrompts": ["Why does the moon change shape?", "How far away is the moon?"]
    }
  ],
  "responses": {
    "moon-physics": {
      "patterns": {
        "how far|distance": "The moon is about 238,900 miles away! 🌙",
        "why|shape|phase": "The moon changes shape because of how sunlight hits it. 🌓"
      },
      "default": "That's a great question about the moon! What else would you like to know? 🌙"
    }
  }
}
```

### Response Pattern Matching
- Case-insensitive regex matching
- First match wins
- Falls back to `default` response
- Educational, age-appropriate language
- Encouraging tone with emoji

---

## State Management

### Chat Session State
```javascript
{
  topicId: string,
  topic: object,
  messages: Array<{
    role: 'user' | 'ai',
    content: string,
    timestamp: string,
    safetyFlagged?: boolean
  }>,
  isLoading: boolean,
  context: {
    storyRef?: string,
    panelId?: string
  },
  sessionId: string,
  storyTitle?: string
}
```

### Persistence
- Transcripts: `localStorage.getItem('sqh_chat_transcripts_v1')`
- Analytics: `localStorage.getItem('sqh_analytics_queue_v1')` (shared)
- Session ID: Generated on chat start, persists across page refreshes

---

## Event Interactions

### User Actions

1. **Select Topic** (lobby)
   - Click topic card → Navigate to `/chat/index.html?topicId={id}`
   - Logs: `chat_started` event

2. **Send Message**
   - Type message → Click Send or press Enter
   - Add user bubble → Show loading → Get AI response → Add AI bubble
   - Logs: `message_sent` event
   - Saves transcript after each exchange

3. **Quick Prompt Click**
   - Pre-fills input → Auto-sends
   - Logs: `quick_prompt_used` event

4. **Back Button**
   - Returns to previous page or `/stories`
   - If from story: Returns to story viewer at correct panel
   - Logs: `chat_session_ended` event

5. **Escalation CTA**
   - Shows alert: "Ask a parent or teacher for help"
   - Logs: `escalation_clicked` event

6. **Context Badge Click**
   - Returns to story viewer at linked panel
   - Preserves panel navigation state

### AI Response Flow
1. User sends message
2. Apply safety filter (placeholder: always passes)
3. Pattern match against mock responses
4. Simulate delay (1-2 seconds)
5. Return response or default
6. Update UI, save transcript

---

## Integration with Comic Viewer

### Deep Link Parameters
- `topicId`: Topic to pre-select
- `storyRef`: Story ID for context badge
- `panelId`: Panel ID for context badge

### Context Display
- Badge shows: "From: [Story Name] - Panel [N]"
- Clickable to return to that panel
- Story title loaded from Comic Viewer service

### CTA Button (Already Wired)
- Location: `stories/story-viewer.js` line 89-94
- Passes: `topicId`, `storyRef`, `panelId`
- URL format: `/chat/index.html?topicId={id}&storyRef={storyId}&panelId={panelId}`

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Dev server running (`npm run dev`)
- [ ] Feature flag `VITE_USE_CHAT_MOCKS=true` (or default)
- [ ] Browser DevTools open (F12)
- [ ] Clear localStorage (optional, for fresh test)

---

### Test Case 1: Chat Lobby (Topic Picker)
**Steps:**
1. Navigate to `http://localhost:3000/chat/index.html`
2. Observe topic picker display

**Expected Results:**
- [ ] Topic picker grid displays 6 topics
- [ ] Each topic shows: icon, name, description
- [ ] "Start Chat" buttons are clickable
- [ ] No console errors
- [ ] Design matches Comic Viewer (glassmorphism, purple gradients)

**URL Check:**
- [ ] Final URL: `http://localhost:3000/chat/index.html`

---

### Test Case 2: Topic Selection
**Steps:**
1. From lobby, click "Start Chat" on any topic
2. Observe navigation and page load

**Expected Results:**
- [ ] Navigates to chat session
- [ ] Topic name appears in header
- [ ] Welcome message from AI displays
- [ ] Quick prompts row shows 2-3 prompts
- [ ] Safety banner visible
- [ ] Message input and send button enabled

**URL Check:**
- [ ] Final URL: `http://localhost:3000/chat/index.html?topicId={topicId}`
- [ ] `topicId` parameter matches selected topic

**Analytics Check:**
- [ ] `chat_started` event logged (check localStorage `sqh_analytics_queue_v1`)

---

### Test Case 3: Send Message
**Steps:**
1. Type a message in input field
2. Click "Send" or press Enter
3. Observe response

**Expected Results:**
- [ ] User message appears in right-aligned purple bubble
- [ ] Loading indicator shows ("Thinking..." with animated dots)
- [ ] AI response appears in left-aligned white bubble after 1-2 seconds
- [ ] Response is educational and age-appropriate
- [ ] Chat window auto-scrolls to bottom
- [ ] Input clears after send
- [ ] Send button disabled during loading

**Analytics Check:**
- [ ] `message_sent` event logged with correct payload

**Persistence Check:**
- [ ] Transcript saved to localStorage (`sqh_chat_transcripts_v1`)
- [ ] Messages array includes both user and AI messages

---

### Test Case 4: Quick Prompts
**Steps:**
1. Click a quick prompt button
2. Observe auto-send behavior

**Expected Results:**
- [ ] Prompt text fills input
- [ ] Message auto-sends
- [ ] AI responds appropriately
- [ ] Prompt button works correctly

**Analytics Check:**
- [ ] `quick_prompt_used` event logged with `promptIndex`

---

### Test Case 5: Pattern Matching
**Steps:**
1. Send messages matching different patterns
2. Test: "How far away is the moon?" (should match distance pattern)
3. Test: "Why does the moon change shape?" (should match phase pattern)
4. Test: "Tell me about dinosaurs" (should use default response)

**Expected Results:**
- [ ] Pattern-matched responses are specific and relevant
- [ ] Default response used for unmatched queries
- [ ] All responses are educational and safe

---

### Test Case 6: Deep Link from Comic Viewer
**Steps:**
1. Navigate to a story in Comic Viewer
2. Click "Ask the AI about this panel" button
3. Observe chat page load

**Expected Results:**
- [ ] Chat opens with correct topic pre-selected
- [ ] Context badge displays: "From: [Story Name] - Panel [N]"
- [ ] Badge is clickable
- [ ] Story title loads correctly
- [ ] Quick prompts are relevant to topic

**URL Check:**
- [ ] URL includes: `topicId`, `storyRef`, `panelId`
- [ ] All parameters are valid

**Navigation Check:**
- [ ] Clicking context badge returns to correct panel
- [ ] Back button returns to story viewer

---

### Test Case 7: Transcript Persistence
**Steps:**
1. Start a chat session
2. Send 2-3 messages
3. Refresh the page (F5)
4. Observe transcript restoration

**Expected Results:**
- [ ] Previous messages are restored
- [ ] Welcome message + all exchanges visible
- [ ] Session ID persists
- [ ] Can continue conversation

**DevTools Check:**
- [ ] `sqh_chat_transcripts_v1` in localStorage
- [ ] Contains correct session data

---

### Test Case 8: Back Navigation
**Steps:**
1. From chat session, click "Back" button
2. Test from lobby (no context)
3. Test from story context

**Expected Results:**
- [ ] From lobby: Returns to `/chat/index.html` (lobby)
- [ ] From story context: Returns to story viewer at correct panel
- [ ] `chat_session_ended` event logged

**URL Check:**
- [ ] Navigation URL is correct
- [ ] Panel parameter preserved (if from story)

---

### Test Case 9: Escalation CTA
**Steps:**
1. Click "Ask a Parent or Teacher" button
2. Observe alert/modal

**Expected Results:**
- [ ] Alert displays helpful message
- [ ] User can dismiss and continue chatting
- [ ] `escalation_clicked` event logged

---

### Test Case 10: Error Handling
**Steps:**
1. Navigate to: `/chat/index.html?topicId=invalid-topic`
2. Observe error handling

**Expected Results:**
- [ ] Error message displays: "Topic not found"
- [ ] "Go to Topic List" button appears
- [ ] Button navigates to lobby
- [ ] No uncaught exceptions

---

### Test Case 11: Mock Mode Indicator
**Steps:**
1. Check for offline/mock banner
2. Verify feature flag behavior

**Expected Results:**
- [ ] Banner appears when `VITE_USE_CHAT_MOCKS=true`
- [ ] Banner doesn't block functionality
- [ ] Can be dismissed or ignored

---

### Test Case 12: Logout Functionality
**Steps:**
1. Navigate to any Chat or Stories page
2. Locate logout button in header
3. Click logout button
4. Observe redirect behavior

**Expected Results:**
- [ ] Logout button visible in header (desktop view)
- [ ] Logout button visible on mobile (mobile view)
- [ ] Clicking logout clears localStorage
- [ ] Clicking logout clears sessionStorage
- [ ] Redirects to `/auth/auth.html`
- [ ] No console errors in mock mode

**Desktop/Mobile Check:**
- [ ] Desktop: Logout button in navigation bar
- [ ] Mobile: Logout button visible and clickable

---

### Test Case 13: Loading States
**Steps:**
1. Send a message
2. Observe loading indicator

**Expected Results:**
- [ ] Animated dots appear in AI bubble
- [ ] "Thinking..." text displays
- [ ] Loading lasts 1-2 seconds
- [ ] Smooth transition to response

---

## Code Quality Checks

### File: `chat/chat-services.js`
- [ ] `shouldUseMockData()` checks feature flag correctly
- [ ] `getTopicCatalog()` returns mock data when flag is true
- [ ] `sendMessage()` applies safety filter
- [ ] Pattern matching works correctly
- [ ] `logChatEvent()` queues events properly
- [ ] Transcript save/load functions work

### File: `chat/chat-session.js`
- [ ] Topic picker renders correctly
- [ ] Message bubbles render with correct styling
- [ ] Loading state displays during AI response
- [ ] Context badge shows when storyRef present
- [ ] Deep link parameters parsed correctly
- [ ] Analytics events fire at correct times
- [ ] Transcript persistence works

### File: `chat/index.html`
- [ ] UI matches Comic Viewer design tokens
- [ ] All elements have correct IDs
- [ ] Responsive layout works
- [ ] Safety banner always visible

### File: `chat/mockChatData.json`
- [ ] Valid JSON structure
- [ ] At least 6 topics defined
- [ ] Each topic has patterns and default response
- [ ] Quick prompts array present

---

## Integration Verification

### Comic Viewer Integration
- [ ] CTA button in `stories/story-viewer.js` passes correct params
- [ ] Deep link URL format is correct
- [ ] Context badge displays story title
- [ ] Return navigation works correctly

### Analytics Integration
- [ ] Events use same queue as Comic Viewer
- [ ] Event names prefixed with `chat_`
- [ ] Payloads include required fields
- [ ] Events queued to localStorage correctly

### Design Consistency
- [ ] Colors match Comic Viewer (purple/pink gradients)
- [ ] Typography matches (font-fredoka, Inter)
- [ ] Glassmorphism effects consistent
- [ ] Button styles match
- [ ] Banner styles match

---

## Future Database Integration Notes

All Supabase schema, tables, policies, and migrations for chat will be created in a dedicated "Database Finalization Phase" after UI flows are complete. This includes:

### Tables to Create
- `topics` - Topic catalog (id, name, description, icon, quick_prompts, enabled)
- `chat_sessions` - Session tracking (session_id, child_id, topic_id, messages, context, created_at, updated_at)
- `chat_messages` - Individual messages (message_id, session_id, role, content, timestamp, safety_flagged)
- `analytics_events` - Shared with Comic Viewer (event_type, payload, occurred_at)

### RLS Policies
- Child-only access to chat sessions
- Parents can view child's chat history
- Topics visible to all children

### Edge Functions (Future)
- `get_ai_response` - Real AI integration
- `check_message_safety` - Safety filtering
- Analytics logging endpoint

### Migration Strategy
- Mock data structure matches future schema
- Service functions already stubbed for Supabase
- Feature flag allows gradual migration
- No breaking changes to UI when switching

---

## Known Limitations (Current Phase)

- [ ] No real AI integration (mock responses only)
- [ ] Safety filter always returns safe (placeholder)
- [ ] No parent dashboard integration yet
- [ ] No user authentication checks
- [ ] No multi-user session isolation
- [ ] No real-time updates
- [ ] No message history across sessions (only current session)

---

## Validation Checklist Summary

### Critical Path
1. [ ] Chat lobby displays topics
2. [ ] Topic selection navigates to session
3. [ ] Messages send and receive responses
4. [ ] Quick prompts work
5. [ ] Deep link from Comic Viewer works
6. [ ] Context badge displays and navigates correctly
7. [ ] Transcript persists across refresh
8. [ ] Back navigation works
9. [ ] Analytics events fire
10. [ ] Error handling graceful
11. [ ] Logout button accessible on all pages

### No-Go Criteria
**If any of these fail, implementation is NOT ready:**
- [ ] Chat lobby doesn't load topics
- [ ] Messages don't send or receive responses
- [ ] Deep link from Comic Viewer doesn't work
- [ ] Transcript doesn't persist
- [ ] Console shows uncaught exceptions
- [ ] Design doesn't match Comic Viewer
- [ ] Analytics events don't queue

---

## Reviewer Notes

**Issues Found:**
```
[Document any issues here]
```

**Positive Observations:**
```
[Document what works well]
```

**Recommendations:**
```
[Suggestions for improvement]
```

---

---

## Visual Design Updates (Anpu Branch)

### Color System Applied
All pages in the Anpu branch (Chat + Comic Viewer) have been updated with a child-friendly color system:

#### Primary Background Gradient
- **Replaces**: Generic purple/indigo backgrounds
- **New**: `from-[#4F2EC9] to-[#9B37FF]` (deep purple to pink-violet)
- **Applied to**: All page backgrounds in `chat/` and `stories/` directories

#### Secondary Surfaces
- **Glassmorphism Cards**: `bg-white/10 backdrop-blur-xl border border-white/20`
- **Purple Glow Shadow**: `shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- **Child-Friendly Layers**:
  - `bg-indigo-600/30`
  - `bg-purple-700/25`
  - `bg-fuchsia-500/20`

#### Message Bubbles
- **User Bubbles**: Gradient `from-purple-500 to-pink-500`, white bold text
- **AI Bubbles**: Soft lavender `bg-[#E8D9FF] border-[#C8AFFF]`, dark text
- **No Plain White**: All white surfaces replaced

#### Header & Footer
- **Fixed Header**: Glassmorphism navigation bar with logo and links
- **Navigation Links**: Stories, Chat, Dashboard
- **Logout Button**: 
  - Desktop: Visible in header navigation (`id="logoutBtn"`)
  - Mobile: Separate button for smaller screens (`id="logoutBtnMobile"`)
  - Styling: `border border-white/20 hover:bg-white/10`
  - Functionality: Clears storage, attempts Supabase logout, redirects to auth page
- **Consistent Footer**: Appears on all branch pages (Chat Lobby, Chat Session, Stories List, Story Detail, Comic Viewer)
- **Style**: `bg-white/10 backdrop-blur-xl border border-white/20`

#### Files Modified (Anpu Branch Only)
- ✅ `chat/index.html` - Full UI update with header/footer + logout button
- ✅ `chat/chat-session.js` - Bubble colors, topic card gradients
- ✅ `stories/index.html` - Story cards with gradients, header/footer + logout button
- ✅ `stories/story.html` - Detail page with glassmorphism, header/footer + logout button
- ✅ `stories/reader.html` - Comic viewer panels with purple glow, header/footer + logout button
- ✅ `stories/story-viewer.js` - Glossary pill colors

#### Design Consistency
- All surfaces use glassmorphism or child-friendly colors
- Purple glow shadows on interactive cards
- Consistent header/footer across all branch pages
- Logout button accessible on all pages (desktop + mobile)
- No plain white backgrounds (replaced with lavender or glassmorphism)
- Vibrant, playful aesthetic suitable for children

#### Logout Functionality
- **Location**: Header navigation on all branch pages
- **Desktop**: Logout button in main navigation bar
- **Mobile**: Separate mobile-friendly logout button
- **Handler**: 
  - Attempts Supabase auth signOut if configured
  - Clears localStorage and sessionStorage
  - Redirects to `/auth/auth.html`
  - Works gracefully in mock mode (no Supabase errors)
- **Styling**: Matches branch design tokens (glassmorphism border, purple hover)

---

## Sign-Off

**Reviewer Name:** _______________  
**Date:** _______________  
**Status:** ☐ PASS  ☐ FAIL  ☐ NEEDS REVISION  
**Comments:** _______________

---

## Quick Reference: Expected URLs

| Action | Expected URL Format |
|--------|-------------------|
| Chat Lobby | `/chat/index.html` |
| Chat Session | `/chat/index.html?topicId={id}` |
| Chat with Context | `/chat/index.html?topicId={id}&storyRef={storyId}&panelId={panelId}` |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_USE_CHAT_MOCKS` | `'true'` | Enable/disable mock mode |
| `VITE_EDGE_ANALYTICS_URL` | `''` | Optional edge function for analytics |
| `VITE_SUPABASE_URL` | - | Supabase project URL (future) |
| `VITE_SUPABASE_ANON_KEY` | - | Supabase anonymous key (future) |

---

**End of Implementation Plan**


