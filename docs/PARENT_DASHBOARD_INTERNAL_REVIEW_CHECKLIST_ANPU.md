# Parent Dashboard - Internal Review Checklist

**Branch:** Anpu  
**Feature:** Parent Dashboard with Progress Visualization  
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
| Feature flag `VITE_USE_DASHBOARD_MOCKS=true` | ☐ | Default: enabled |

---

## 1. Navigation & Pages

### 1.1 Parent Dashboard Main Page
| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/parent/dashboard` | ☐ | Should show two-column layout |
| Vite rewrite works: `/parent/dashboard` → `dashboard.html` | ☐ | URL rewrites correctly |
| Header visible with logo + nav links | ☐ | Stories, Chat, Dashboard, Logout |
| Footer visible with links | ☐ | Consistent across pages |
| Dashboard title displays: "Parent Dashboard" | ☐ | Large font-fredoka heading |
| Two-column layout visible | ☐ | Left: Children list (~30%), Right: Detail (~70%) |
| Layout stacks on mobile (< 768px) | ☐ | Children list above, detail below |

**URL Check:** `http://localhost:3000/parent/dashboard`

---

### 1.2 Children List (Left Column)
| Check | Status | Notes |
|-------|--------|-------|
| Section title: "Your Young Heroes" | ☐ | Font-fredoka, large, white |
| 3 child cards display (from mock data) | ☐ | Akhil, Maya, Ryan |
| Each card shows: avatar, name, grade/age | ☐ | All visible correctly |
| Stats line shows: "Stories: X · Quizzes: Y" | ☐ | Defaults to 0 for unselected |
| Status pill displays: "On Track" or "Needs Attention" | ☐ | Green or amber styling |
| "View Progress" button on each card | ☐ | Purple-pink gradient button |
| Card styling: glassmorphism, purple glow | ☐ | `bg-white/10 backdrop-blur-xl` |
| Selected card highlights (purple border) | ☐ | When child selected |

---

### 1.3 Empty State (Right Column)
| Check | Status | Notes |
|-------|--------|-------|
| Empty state visible when no child selected | ☐ | Large 🦸 emoji, message |
| Message: "Select a hero on the left to see their progress." | ☐ | White/70 text |
| Empty state hidden when child selected | ☐ | Child detail appears |

---

## 2. Selected Child Detail (Right Column)

### 2.1 Header Row
| Check | Status | Notes |
|-------|--------|-------|
| Child avatar displays (round, large) | ☐ | 64x64px, border-white/30 |
| Child name displays (large font-fredoka) | ☐ | First name or username |
| "Last active: X · Current topic: Y" line | ☐ | Relative time, topic name |
| Header card: glassmorphism styling | ☐ | Purple glow shadow |

---

### 2.2 Learning Snapshot (Metric Cards)
| Check | Status | Notes |
|-------|--------|-------|
| 4 metric cards display in grid | ☐ | 2x2 on mobile, 4 columns on desktop |
| **Stories card**: Icon 📚, completed/in progress | ☐ | Shows "4 / 2" format |
| **Quizzes card**: Icon 🏆, average score % | ☐ | Shows "85%" format |
| **Chat card**: Icon 💬, questions this week | ☐ | Shows "15" format |
| **Streak card**: Icon 🔥, learning streak days | ☐ | Shows "7" days format |
| Each card: icon circle (gradient), value, label | ☐ | Styling consistent |
| Card styling: glassmorphism, purple glow | ☐ | Matches design tokens |

---

### 2.3 Learning Progress Section
| Check | Status | Notes |
|-------|--------|-------|
| Section title: "Learning Progress" | ☐ | Font-fredoka, 2xl, white |
| 3 tabs visible: Overview, Stories, Quizzes | ☐ | Tab navigation bar |
| Active tab highlighted (purple-pink gradient) | ☐ | Inactive tabs: white/10 |
| Tab switching works | ☐ | Click tab → content changes |
| URL updates with `?childId={id}` on selection | ☐ | Deep link support |

---

### 2.4 Overview Tab
| Check | Status | Notes |
|-------|--------|-------|
| Two charts display side-by-side | ☐ | Last 7 Days Activity, Topics Explored |
| Left chart: Line/bar chart for activity | ☐ | Shows sessions per day |
| Right chart: Bar chart for topics | ☐ | Shows topic engagement counts |
| Charts render (SVG-based placeholder) | ☐ | No errors in console |
| Summary sentence below charts | ☐ | "This week, [Name] explored X topics..." |
| Chart containers: white/5 background | ☐ | Styling consistent |

---

### 2.5 Stories Tab
| Check | Status | Notes |
|-------|--------|-------|
| Vertical list of topics with progress | ☐ | Each topic has a row |
| Topic icon displays (circle background) | ☐ | Gradient indigo-fuchsia |
| Topic name displays | ☐ | Font-fredoka, large |
| Progress bar shows completion % | ☐ | Purple-pink gradient fill |
| Stats text: "Stories read: X · In progress: Y · Last opened: Z" | ☐ | All visible |
| Progress rows: glassmorphism styling | ☐ | Hover effect works |

---

### 2.6 Quizzes Tab
| Check | Status | Notes |
|-------|--------|-------|
| Top: Bar chart for quiz performance | ☐ | Topics vs average score |
| Chart renders correctly | ☐ | SVG-based, no errors |
| Below: Simple table with columns | ☐ | Topic | Attempts | Best Score | Last Attempt |
| Table rows populate from mock data | ☐ | All topics visible |
| Last Attempt shows relative time | ☐ | "2 hours ago", etc. |
| Table styling: white/5 background | ☐ | Readable, consistent |

---

### 2.7 Curiosity Badges Section
| Check | Status | Notes |
|-------|--------|-------|
| Section title: "Curiosity Badges" | ☐ | Font-fredoka, 2xl, white |
| Summary text: "[Name] has unlocked X of Y badges" | ☐ | Dynamic, accurate |
| Badge tiles display (horizontal scroll/wrap) | ☐ | 5 core badges visible |
| Each badge tile shows: icon, name, status | ☐ | Unlocked: full color, checkmark |
| Locked badges: grayscale, lock icon | ☐ | Opacity reduced |
| Unlocked badges: "Earned on: [date]" | ☐ | Date displays |
| Locked badges: "Hint: [description]" | ☐ | Hint text visible |
| "View all badge rules" button (bottom right) | ☐ | Placeholder alert for now |
| Badge tiles: glassmorphism, hover glow | ☐ | Purple glow on hover |

---

## 3. Child Selection & State Management

| Check | Status | Notes |
|-------|--------|-------|
| Click "View Progress" → selects child | ☐ | Right column updates |
| Selected child card highlights | ☐ | Purple border, stronger glow |
| URL updates with `?childId={id}` | ☐ | Deep link works |
| Refresh page with `?childId` → child selected | ☐ | State persists |
| Switch between children | ☐ | Progress updates correctly |
| Analytics event: `parent_child_switch` | ☐ | Logged to queue |

---

## 4. UI/Design Consistency

### 4.1 Color System
| Check | Status | Notes |
|-------|--------|-------|
| Background gradient: `from-[#4F2EC9] to-[#9B37FF]` | ☐ | Deep purple to pink-violet |
| Cards: glassmorphism `bg-white/10` | ☐ | Backdrop blur, border |
| Purple glow shadow on cards | ☐ | `shadow-[0_0_30px_rgba(155,55,255,0.25)]` |
| **NO plain white backgrounds** | ☐ | All replaced with colors/glassmorphism |
| Status pills: green (On Track) or amber (Needs Attention) | ☐ | Correct colors |

---

### 4.2 Typography & Styling
| Check | Status | Notes |
|-------|--------|-------|
| Headings use `font-fredoka` | ☐ | Bold, large, white |
| Body text uses `Inter` | ☐ | Readable, appropriate size |
| Buttons: `rounded-2xl` or `rounded-3xl` | ☐ | Consistent border radius |
| Metric cards: icon circles gradient | ☐ | `from-purple-500 to-pink-500` |
| Tab buttons: active gradient, inactive white/10 | ☐ | Consistent styling |

---

### 4.3 Header & Footer
| Check | Status | Notes |
|-------|--------|-------|
| Fixed header on all pages | ☐ | Glassmorphism, sticky top |
| Header links: Stories, Chat, Dashboard | ☐ | Dashboard highlighted |
| **Logout button visible (desktop)** | ☐ | In navigation bar |
| **Logout button visible (mobile)** | ☐ | Separate mobile button |
| Footer visible on all pages | ☐ | Consistent styling |
| Footer links functional | ☐ | Home, Stories, Chat, Dashboard |

---

## 5. Logout Functionality

| Check | Status | Notes |
|-------|--------|-------|
| Logout button in header (desktop) | ☐ | After Dashboard link |
| Logout button in header (mobile) | ☐ | Separate `lg:hidden` button |
| Click logout → clears localStorage | ☐ | Check DevTools Application tab |
| Click logout → clears sessionStorage | ☐ | All storage cleared |
| Click logout → redirects to `/auth/auth.html` | ☐ | Navigation works |
| No console errors in mock mode | ☐ | Supabase logout skipped gracefully |

---

## 6. Analytics & Mock Mode

| Check | Status | Notes |
|-------|--------|-------|
| Feature flag `VITE_USE_DASHBOARD_MOCKS=true` | ☐ | Check `.env` or default |
| Analytics events queue to localStorage | ☐ | Key: `sqh_analytics_queue_v1` |
| Events logged: `dashboard_viewed` | ☐ | When page loads |
| Events logged: `parent_child_switch` | ☐ | When child selected |
| Events logged: `child_progress_viewed` | ☐ | When child data loads |
| Events logged: `progress_tab_switched` | ☐ | When tab changed |
| Events logged: `badge_viewed` (future) | ☐ | Placeholder |
| **No Supabase calls** (mock mode) | ☐ | All data from `mockDashboardData.json` |

---

## 7. Mock Data Behavior

| Check | Status | Notes |
|-------|--------|-------|
| Children load from `mockDashboardData.json` | ☐ | 3 children: Akhil, Maya, Ryan |
| Progress data loads for each child | ☐ | Stories, quizzes, chat, streak |
| Badges load from mock data | ☐ | 5 core badges |
| Badge unlock status correct | ☐ | Unlocked/locked based on child |
| Activity data (last 7 days) loads | ☐ | Chart data available |
| Topics explored data loads | ☐ | Bar chart data available |
| No errors if mock data missing | ☐ | Graceful fallback |

---

## 8. Error Handling

| Check | Status | Notes |
|-------|--------|-------|
| Navigate to `/parent/dashboard?childId=invalid` | ☐ | Error message displays |
| Error shows "Unable to load progress data" | ☐ | User-friendly message |
| No uncaught exceptions in console | ☐ | Errors handled gracefully |
| Empty children list shows message | ☐ | "No children found" |

---

## 9. Mobile/Responsive

| Check | Status | Notes |
|-------|--------|-------|
| Two-column layout stacks on mobile | ☐ | Children list above, detail below |
| Metric cards: 2x2 grid on mobile | ☐ | 4 columns on desktop |
| Charts adjust to screen size | ☐ | Responsive SVG |
| Badge tiles wrap on mobile | ☐ | Horizontal scroll on desktop |
| Header navigation collapses | ☐ | Mobile-friendly |
| Logout button visible on mobile | ☐ | Separate mobile button |
| Touch interactions work | ☐ | Buttons tap-able |

---

## 10. Performance & Console

| Check | Status | Notes |
|-------|--------|-------|
| No console errors | ☐ | Check DevTools Console |
| No console warnings | ☐ | Clean console output |
| Page loads quickly | ☐ | < 2 seconds |
| Mock data loads from JSON | ☐ | Check Network tab |
| No unnecessary API calls | ☐ | Mock mode only |
| Child switching is fast | ☐ | No lag when selecting |

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
| Parent Dashboard | `http://localhost:3000/parent/dashboard` |
| Dashboard with Child | `http://localhost:3000/parent/dashboard?childId=child-akhil` |
| Dashboard (Maya) | `http://localhost:3000/parent/dashboard?childId=child-maya` |
| Dashboard (Ryan) | `http://localhost:3000/parent/dashboard?childId=child-ryan` |

---

## Mock Data Quick Reference

**Children:**
- `child-akhil` - Akhil Kumar, Grade 5, Age 11, On Track
- `child-maya` - Maya Patel, Grade 3, Age 9, On Track
- `child-ryan` - Ryan Chen, Grade 4, Age 10, Needs Attention

**Sample Progress (Akhil):**
- Stories: 4 completed, 2 in progress
- Quizzes: 8 attempts, 85% average
- Chat: 15 questions this week
- Streak: 7 days

**Badges:**
- 5 core badges (First Curious Question, Photosynthesis Explorer, Quiz Hero, Story Master, Streak Star)
- Akhil: 4 unlocked, 1 locked
- Maya: 2 unlocked, 3 locked
- Ryan: 0 unlocked, 5 locked

---

**End of Checklist**



