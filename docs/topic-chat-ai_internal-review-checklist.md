# Topic Chat AI - Internal Review Checklist

**Branch:** Anpu  
**Feature:** Topic Chat AI with Safe Replies  
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
| Feature flag `VITE_USE_CHAT_MOCKS=true` | ☐ | Default: enabled |

---

## 1. Navigation & Pages

### 1.1 Chat Lobby (Topic Picker)
| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/chat/index.html` | ☐ | Should show topic grid |
| Header visible with logo + nav links | ☐ | Stories, Chat, Dashboard, Logout |
| Footer visible with links | ☐ | Consistent across pages |
| 6 topic cards display correctly | ☐ | Moon, Photosynthesis, Ocean, etc. |
| Topic cards have gradient backgrounds | ☐ | `from-indigo-700/40 to-fuchsia-600/40` |
| Icons inside circular backgrounds | ☐ | `bg-white/20` circles |
| "Start Chat" buttons clickable | ☐ | Navigate to chat session |

**URL Check:** `http://localhost:3000/chat/index.html`

---

### 1.2 Chat Session
| Check | Status | Notes |
|-------|--------|-------|
| Click topic card → navigates to session | ☐ | URL includes `?topicId={id}` |
| Chat header shows topic name | ☐ | Font-fredoka, large, white |
| Safety banner visible | ☐ | Amber banner with shield icon |
| Welcome message from AI displays | ☐ | Lavender bubble, left-aligned |
| Quick prompts row shows 2-3 prompts | ☐ | Below chat window |
| Message input field functional | ☐ | Textarea with placeholder |
| Send button enabled | ☐ | Purple-pink gradient |
| Back button returns to lobby | ☐ | Or story viewer if from panel |

**URL Check:** `http://localhost:3000/chat/index.html?topicId=moon-physics`

---

### 1.3 Deep Link from Comic Viewer
| Check | Status | Notes |
|-------|--------|-------|
| Open Comic Viewer (`/stories/{storyId}/read`) | ☐ | Any story with panels |
| Click "Ask the AI about this panel" button | ☐ | CTA in side panel |
| Chat opens with correct topic pre-selected | ☐ | Matches panel's `chatTopicId` |
| Context badge displays: "From: [Story] - Panel [N]" | ☐ | Clickable badge in header |
| Click context badge → returns to panel | ☐ | Navigates back to Comic Viewer |
| URL includes: `topicId`, `storyRef`, `panelId` | ☐ | All parameters present |

**Example URL:** `/chat/index.html?topicId=moon-physics&storyRef=mystery-moon&panelId=panel-1`

---

## 2. Functional Checks

### 2.1 Chat Lobby Functionality
| Check | Status | Notes |
|-------|--------|-------|
| Topic cards render from mock data | ☐ | Check `mockChatData.json` |
| Grid layout responsive (2-3 columns) | ☐ | Desktop vs mobile |
| Hover effects on cards | ☐ | Slight opacity change |
| Click any card → loads session | ☐ | No errors in console |

---

### 2.2 Message Sending & AI Responses
| Check | Status | Notes |
|-------|--------|-------|
| Type message in input field | ☐ | Textarea accepts input |
| Click Send or press Enter | ☐ | Message sends |
| User message appears in purple bubble | ☐ | Right-aligned, gradient, bold text |
| Loading indicator shows | ☐ | Lavender bubble, animated dots, "Thinking..." |
| AI response appears after 1-2 seconds | ☐ | Lavender bubble, left-aligned |
| Response is educational and age-appropriate | ☐ | Check message content |
| Chat window auto-scrolls to bottom | ☐ | New messages visible |

**Pattern Matching Test:**
- [ ] "How far away is the moon?" → matches distance pattern
- [ ] "Why does the moon change shape?" → matches phase pattern
- [ ] "Tell me about dinosaurs" → uses default response

---

### 2.3 Quick Prompts
| Check | Status | Notes |
|-------|--------|-------|
| Quick prompts display below chat window | ☐ | Row of pill buttons |
| Click a prompt → pre-fills input | ☐ | Text appears in textarea |
| Click prompt → auto-sends message | ☐ | Message sent immediately |
| Prompt button uses correct styling | ☐ | `bg-white/10 border border-white/20` |
| Analytics event logged | ☐ | Check console: `quick_prompt_used` |

---

### 2.4 Transcript Persistence
| Check | Status | Notes |
|-------|--------|-------|
| Send 2-3 messages in session | ☐ | Multiple exchanges |
| Refresh page (F5) | ☐ | Transcript should persist |
| Previous messages restored | ☐ | Welcome + all exchanges visible |
| Can continue conversation | ☐ | New messages append correctly |
| Check localStorage: `sqh_chat_transcripts_v1` | ☐ | Contains session data |

---

## 3. UI/Design Consistency

### 3.1 Color System
| Check | Status | Notes |
|-------|--------|-------|
| Background gradient: `from-[#4F2EC9] to-[#9B37FF]` | ☐ | Deep purple to pink-violet |
| Chat window: glassmorphism `bg-white/10` | ☐ | Backdrop blur, border |
| User bubbles: purple-pink gradient | ☐ | `from-purple-500 to-pink-500`, white bold text |
| AI bubbles: lavender `bg-[#E8D9FF]` | ☐ | Border `border-[#C8AFFF]`, dark text |
| Loading state: lavender bubble | ☐ | Purple dots, "Thinking..." |
| **NO plain white backgrounds** | ☐ | All replaced with colors/glassmorphism |

---

### 3.2 Typography & Styling
| Check | Status | Notes |
|-------|--------|-------|
| Headings use `font-fredoka` | ☐ | Bold, large, white |
| Body text uses `Inter` | ☐ | Readable, appropriate size |
| Buttons: `rounded-2xl` or `rounded-3xl` | ☐ | Consistent border radius |
| Purple glow shadow on cards | ☐ | `shadow-[0_0_30px_rgba(155,55,255,0.25)]` |
| Safety banner: amber `bg-amber-100/90` | ☐ | Consistent across features |

---

### 3.3 Header & Footer
| Check | Status | Notes |
|-------|--------|-------|
| Fixed header on all pages | ☐ | Glassmorphism, sticky top |
| Header links: Stories, Chat, Dashboard | ☐ | All functional |
| **Logout button visible (desktop)** | ☐ | In navigation bar |
| **Logout button visible (mobile)** | ☐ | Separate mobile button |
| Footer visible on all pages | ☐ | Consistent styling |
| Footer links functional | ☐ | Home, Stories, Chat, Dashboard |

---

## 4. Logout Functionality

| Check | Status | Notes |
|-------|--------|-------|
| Logout button in header (desktop) | ☐ | After Dashboard link |
| Logout button in header (mobile) | ☐ | Separate `lg:hidden` button |
| Click logout → clears localStorage | ☐ | Check DevTools Application tab |
| Click logout → clears sessionStorage | ☐ | All storage cleared |
| Click logout → redirects to `/auth/auth.html` | ☐ | Navigation works |
| No console errors in mock mode | ☐ | Supabase logout skipped gracefully |

---

## 5. Analytics & Mock Mode

| Check | Status | Notes |
|-------|--------|-------|
| Feature flag `VITE_USE_CHAT_MOCKS=true` | ☐ | Check `.env` or default |
| Mock mode banner displays (optional) | ☐ | Shows offline/mock indicator |
| Analytics events queue to localStorage | ☐ | Key: `sqh_analytics_queue_v1` |
| Events logged: `chat_started` | ☐ | When topic selected |
| Events logged: `message_sent` | ☐ | When user sends message |
| Events logged: `quick_prompt_used` | ☐ | When prompt clicked |
| Events logged: `chat_session_ended` | ☐ | When back button clicked |
| Events logged: `escalation_clicked` | ☐ | When "Ask Parent" clicked |
| **No Supabase calls** (mock mode) | ☐ | All data from `mockChatData.json` |

---

## 6. Error Handling

| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/chat/index.html?topicId=invalid` | ☐ | Error message displays |
| Error shows "Topic not found" | ☐ | User-friendly message |
| "Go to Topic List" button appears | ☐ | Button navigates to lobby |
| No uncaught exceptions in console | ☐ | Errors handled gracefully |
| Empty message cannot be sent | ☐ | Send button disabled |

---

## 7. Integration with Comic Viewer

| Check | Status | Notes |
|-------|--------|-------|
| Comic Viewer CTA button functional | ☐ | "Ask the AI about this panel" |
| Deep link parameters passed correctly | ☐ | `topicId`, `storyRef`, `panelId` |
| Context badge displays story title | ☐ | Loaded from story metadata |
| Context badge shows panel number | ☐ | Correct panel ID |
| Click context badge → returns to panel | ☐ | Correct panel loaded |
| Back button from chat → returns to viewer | ☐ | Panel state preserved |

---

## 8. Mobile/Responsive

| Check | Status | Notes |
|-------|--------|-------|
| Topic grid stacks on mobile | ☐ | Single column layout |
| Chat window scrolls correctly | ☐ | Messages visible |
| Quick prompts wrap on small screens | ☐ | Responsive layout |
| Header navigation collapses | ☐ | Mobile-friendly |
| Logout button visible on mobile | ☐ | Separate mobile button |
| Touch interactions work | ☐ | Buttons tap-able |

---

## 9. Performance & Console

| Check | Status | Notes |
|-------|--------|-------|
| No console errors | ☐ | Check DevTools Console |
| No console warnings | ☐ | Clean console output |
| Page loads quickly | ☐ | < 2 seconds |
| Mock data loads from JSON | ☐ | Check Network tab |
| No unnecessary API calls | ☐ | Mock mode only |

---

## Review Summary

### Critical Issues Found
```
[Document any blocking issues here]
```

### Minor Issues / Improvements
```
[Document non-blocking issues here]
```

### What Works Well
```
[Document positive observations here]
```

---

## Sign-Off

**Reviewer Name:** _______________  
**Date:** _______________  
**Overall Status:** ☐ PASS  ☐ FAIL  ☐ NEEDS REVISION  

**Next Steps:**
```
[Document any follow-up actions needed]
```

---

## Quick Reference URLs

| Page | URL |
|------|-----|
| Chat Lobby | `http://localhost:3000/chat/index.html` |
| Chat Session | `http://localhost:3000/chat/index.html?topicId=moon-physics` |
| Chat with Context | `http://localhost:3000/chat/index.html?topicId=moon-physics&storyRef=mystery-moon&panelId=panel-1` |
| Comic Viewer | `http://localhost:3000/stories/mystery-moon/read` |

---

**End of Checklist**

