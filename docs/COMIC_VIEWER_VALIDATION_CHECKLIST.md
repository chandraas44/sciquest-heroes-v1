# Comic Viewer Implementation - Validation Checklist

**Branch:** Anpu  
**Feature:** Comic Viewer with Panel Navigation  
**Reviewer:** External QA/Reviewer  
**Date:** _______________

---

## Pre-Review Setup

### Environment Requirements
- [ ] Node.js installed (v16+)
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server can start (`npm run dev`)
- [ ] Browser: Chrome/Firefox/Edge (latest)
- [ ] Browser DevTools available (F12)

### Configuration Check
- [ ] Verify `VITE_USE_STORY_MOCKS=true` in environment (or default behavior)
- [ ] No Supabase credentials required (mock mode active)
- [ ] Vite dev server running on `http://localhost:3000`

---

## 1. File Structure Verification

### Core Files to Verify Exist
- [ ] `stories/index.html` - Story listing page
- [ ] `stories/story.html` - Story detail page
- [ ] `stories/reader.html` - Comic panel viewer
- [ ] `stories/stories-list.js` - List page logic
- [ ] `stories/story-detail.js` - Detail page logic
- [ ] `stories/story-viewer.js` - Viewer logic
- [ ] `stories/story-services.js` - Data/service layer
- [ ] `stories/mockStories.json` - Mock dataset

### Configuration Files
- [ ] `vite.config.js` - Contains story routes in build config
- [ ] `config.js` - Supabase config (may be empty for mocks)

### Documentation
- [ ] `README-ComicViewer.md` - Implementation documentation exists

---

## 2. Navigation Flow Testing

### Test Case 2.1: Landing Page → Story List
**Steps:**
1. Navigate to `http://localhost:3000/`
2. Click "Stories" link or navigate to `/stories/index.html`

**Expected Results:**
- [ ] Story list page loads without errors
- [ ] At least 2-3 story cards are visible
- [ ] Each card shows: title, cover image, topic tag
- [ ] Cards are clickable
- [ ] No console errors

**URL Check:**
- [ ] Final URL: `http://localhost:3000/stories/index.html`

---

### Test Case 2.2: Story List → Story Detail
**Steps:**
1. From story list, click any story card
2. Observe navigation

**Expected Results:**
- [ ] Story detail page loads
- [ ] Shows story title, cover, summary
- [ ] Displays topic, reading level, estimated time
- [ ] Shows panel preview (first 4 panels)
- [ ] "Start Story" button is visible and enabled
- [ ] "Resume Story" button appears if progress exists (hidden on first visit)

**URL Check:**
- [ ] Final URL: `http://localhost:3000/stories/story.html?storyId={storyId}`
- [ ] `storyId` parameter is present and valid (e.g., "mystery-moon")

---

### Test Case 2.3: Story Detail → Comic Viewer (Start Story)
**Steps:**
1. On story detail page, click "Start Story" button
2. Observe navigation and page load

**Expected Results:**
- [ ] Comic viewer page loads
- [ ] Story title appears in header
- [ ] First panel image displays
- [ ] Panel narration text is visible
- [ ] Progress dots show at bottom (all panels represented)
- [ ] "Previous" button is disabled (on first panel)
- [ ] "Next" button is enabled
- [ ] Panel counter shows "Panel 1 of X"

**URL Check:**
- [ ] Final URL: `http://localhost:3000/stories/{storyId}/read?panel=0`
- [ ] URL format is clean (not `reader.html?storyId=...`)
- [ ] `storyId` matches the story selected
- [ ] `panel` parameter is `0` for first panel

**Critical:** 
- [ ] **DOES NOT redirect to homepage**
- [ ] **DOES NOT show 404 error**
- [ ] **URL updates to clean format after page load**

---

### Test Case 2.4: Panel Navigation (Next/Previous)
**Steps:**
1. From first panel, click "Next Panel"
2. Click "Previous Panel"
3. Click on progress dots to jump to specific panels

**Expected Results:**
- [ ] Panel content updates (image, narration)
- [ ] Progress dots highlight current panel
- [ ] Panel counter updates ("Panel 2 of X", etc.)
- [ ] "Previous" button enables after panel 1
- [ ] "Next" button disables on last panel
- [ ] Clicking progress dots jumps to that panel

**URL Check:**
- [ ] URL updates: `?panel=1`, `?panel=2`, etc.
- [ ] URL format remains: `/stories/{storyId}/read?panel={n}`
- [ ] Browser back/forward buttons work correctly

---

### Test Case 2.5: Resume Story Functionality
**Steps:**
1. Start a story, navigate to panel 3
2. Click "Back to Stories" or navigate away
3. Return to story detail page
4. Click "Resume Story" button

**Expected Results:**
- [ ] "Resume Story" button is visible (not hidden)
- [ ] Clicking it opens viewer at last viewed panel
- [ ] Progress is preserved (panel 3, not panel 0)
- [ ] URL shows correct panel number

**URL Check:**
- [ ] URL: `/stories/{storyId}/read?panel=3` (or last viewed panel)

---

### Test Case 2.6: Chat CTA Navigation
**Steps:**
1. From comic viewer, click "Ask the AI about this panel" button
2. Observe navigation

**Expected Results:**
- [ ] Navigates to chat page
- [ ] Chat page receives story context

**URL Check:**
- [ ] URL: `http://localhost:3000/chat/index.html?topicId={topicId}&storyRef={storyId}&panelId={panelId}`
- [ ] All parameters are present and valid

---

## 3. Functional Testing

### Test Case 3.1: Mock Data Loading
**Steps:**
1. Open browser DevTools → Network tab
2. Navigate through story list → detail → viewer
3. Check network requests

**Expected Results:**
- [ ] `mockStories.json` is loaded (check Network tab)
- [ ] No Supabase API calls are made
- [ ] Stories load from local JSON file
- [ ] Panel images load (may be placeholders)
- [ ] No 404 errors for story data

**Console Check:**
- [ ] No errors about missing Supabase config
- [ ] Mock data warnings are acceptable (if any)

---

### Test Case 3.2: Progress Persistence
**Steps:**
1. Start a story, navigate to panel 2
2. Refresh the page (F5)
3. Navigate away and return

**Expected Results:**
- [ ] Progress is saved to localStorage
- [ ] After refresh, viewer resumes at panel 2
- [ ] Story detail page shows "Resume" option
- [ ] Progress persists across browser sessions (close/reopen)

**DevTools Check:**
- [ ] Open Application → Local Storage
- [ ] Key `sqh_story_progress_v1` exists
- [ ] Contains `{childId: {storyId: {lastPanelIndex, completedAt}}}`

---

### Test Case 3.3: Analytics Event Logging
**Steps:**
1. Open DevTools → Console
2. Navigate through story flow
3. Check console for analytics events

**Expected Results:**
- [ ] Events logged: `story_viewer_opened`, `panel_viewed`, `story_completed`
- [ ] Events contain correct `storyId` and `panelIndex`
- [ ] Events queued in localStorage (if offline mode)

**DevTools Check:**
- [ ] Application → Local Storage → `sqh_analytics_queue_v1` exists
- [ ] Queue contains event objects with timestamps

---

### Test Case 3.4: Glossary Feature
**Steps:**
1. In comic viewer, click "Glossary" button
2. Check glossary modal

**Expected Results:**
- [ ] Glossary modal opens
- [ ] Shows glossary terms for current panel (if any)
- [ ] Modal can be closed
- [ ] Modal shows "No glossary terms" if panel has none

---

### Test Case 3.5: Offline Banner
**Steps:**
1. Check if offline banner appears
2. Verify mock mode indicator

**Expected Results:**
- [ ] Offline/mock banner may appear (acceptable)
- [ ] Banner doesn't block functionality
- [ ] Can be dismissed or ignored

---

### Test Case 3.6: Error Handling
**Steps:**
1. Manually navigate to invalid story: `/stories/story.html?storyId=invalid-id`
2. Check error handling

**Expected Results:**
- [ ] Error message displays: "Story unavailable" or similar
- [ ] Buttons are disabled
- [ ] User can navigate back
- [ ] No uncaught exceptions in console

---

## 4. Code Quality Checks

### File: `stories/story-detail.js`
- [ ] `goToReader()` function navigates correctly
- [ ] URL construction uses `/stories/{storyId}/read` format
- [ ] Progress UI updates based on saved progress
- [ ] Resume button logic works

### File: `stories/story-viewer.js`
- [ ] `storyId` extracted from query params OR pathname (fallback)
- [ ] URL updated to clean format after page load
- [ ] Panel navigation updates URL correctly
- [ ] Progress saved on panel changes
- [ ] Analytics events fire correctly

### File: `stories/story-services.js`
- [ ] `getStoryList()` returns mock data when flag is true
- [ ] `getStoryById()` handles missing stories gracefully
- [ ] `saveStoryProgress()` writes to localStorage
- [ ] `logAnalyticsEvent()` queues events correctly
- [ ] Fallback to mock data when Supabase unavailable

### File: `vite.config.js`
- [ ] Story routes included in build config
- [ ] `configureServer` middleware present (optional, for URL rewrite)

---

## 5. Mock Data Verification

### Test Case 5.1: Mock Stories Dataset
**File:** `stories/mockStories.json`

**Check:**
- [ ] File exists and is valid JSON
- [ ] Contains at least 2-3 sample stories
- [ ] Each story has:
  - [ ] `id` (string)
  - [ ] `title` (string)
  - [ ] `coverUrl` (string or path)
  - [ ] `topicTag` (string)
  - [ ] `panels` (array)
- [ ] Each panel has:
  - [ ] `panelId` (string)
  - [ ] `imageUrl` (string or path)
  - [ ] `narration` (string)
  - [ ] `chatTopicId` (optional string)
  - [ ] `glossaryTerms` (optional array)

**Sample Story IDs to Test:**
- [ ] `mystery-moon` (or first story in array)
- [ ] Any other story IDs present

---

## 6. Browser Compatibility

### Test in Multiple Browsers
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Check:**
- [ ] Navigation works in all browsers
- [ ] URL format displays correctly
- [ ] History API works (back/forward buttons)
- [ ] localStorage persists across sessions

---

## 7. Edge Cases

### Test Case 7.1: Direct URL Access
**Steps:**
1. Open new tab
2. Navigate directly to: `http://localhost:3000/stories/mystery-moon/read?panel=2`

**Expected Results:**
- [ ] Page loads correctly
- [ ] Shows panel 2 (not panel 0)
- [ ] Story data loads
- [ ] URL remains in clean format

---

### Test Case 7.2: Invalid Panel Number
**Steps:**
1. Navigate to: `/stories/{storyId}/read?panel=999`

**Expected Results:**
- [ ] Clamps to last valid panel
- [ ] No errors thrown
- [ ] Viewer displays last panel

---

### Test Case 7.3: Missing Story ID
**Steps:**
1. Navigate to: `/stories/reader.html` (no storyId)

**Expected Results:**
- [ ] Error message displayed
- [ ] User can navigate back
- [ ] No uncaught exceptions

---

### Test Case 7.4: Story Completion
**Steps:**
1. Navigate to last panel
2. Click "Next Panel" (should complete story)

**Expected Results:**
- [ ] Story marked as completed
- [ ] `story_completed` analytics event fires
- [ ] "Next" button disabled
- [ ] Progress saved with `completedAt` timestamp

---

## 8. Performance Checks

### Load Time
- [ ] Story list loads in < 2 seconds
- [ ] Story detail loads in < 1 second
- [ ] Panel viewer loads in < 2 seconds
- [ ] Panel switching is instant (< 100ms)

### Network Usage
- [ ] No unnecessary API calls
- [ ] Mock data loaded once and cached
- [ ] Images load efficiently (if present)

---

## 9. Accessibility (Basic)

### Keyboard Navigation
- [ ] Tab key navigates through buttons
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals

### Screen Reader (if available)
- [ ] Story titles are readable
- [ ] Panel narration is accessible
- [ ] Buttons have descriptive text

---

## 10. Final Validation

### Critical Path Summary
**Complete flow from start to finish:**
1. [ ] Landing page → Story list
2. [ ] Story list → Story detail
3. [ ] Story detail → Comic viewer (Start Story)
4. [ ] Navigate through 3+ panels
5. [ ] Return to story list
6. [ ] Resume story from detail page
7. [ ] Complete a story (reach last panel)

### No-Go Criteria
**If any of these fail, implementation is NOT ready:**
- [ ] Redirects to homepage when clicking "Start Story"
- [ ] 404 errors on `/stories/{storyId}/read` route
- [ ] Story data doesn't load (blank pages)
- [ ] Progress doesn't persist
- [ ] Console shows uncaught exceptions
- [ ] URL format is incorrect (shows `reader.html?storyId=...` instead of clean format)

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

## Sign-Off

**Reviewer Name:** _______________  
**Date:** _______________  
**Status:** ☐ PASS  ☐ FAIL  ☐ NEEDS REVISION  
**Comments:** _______________

---

## Quick Reference: Expected URLs

| Action | Expected URL Format |
|--------|-------------------|
| Story List | `/stories/index.html` |
| Story Detail | `/stories/story.html?storyId={id}` |
| Comic Viewer | `/stories/{storyId}/read?panel={n}` |
| Chat (from viewer) | `/chat/index.html?topicId={id}&storyRef={storyId}&panelId={id}` |

---

**End of Checklist**

