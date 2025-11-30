# Test Plan: Parent Dashboard Fallback + Grade-Based Quiz Routing

## 1. Parent Dashboard Fallback Tests

### Test 1a: Supabase Missing/Off

**Goal**: Verify Parent Dashboard renders (never blank) when Supabase config is missing.

**Steps to Simulate**:
1. Open `config.js`
2. Temporarily comment out or rename `VITE_SUPABASE_URL`:
   ```javascript
   export const supabaseConfig = {
       url: undefined, // or import.meta.env.VITE_SUPABASE_URL_DISABLED
       anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
   };
   ```
3. Or in `.env` file, rename `VITE_SUPABASE_URL` to `VITE_SUPABASE_URL_DISABLED`
4. Restart dev server if needed
5. Navigate to `/parent/dashboard.html`
6. Select a child (or use URL param `?childId=child-akhil`)

**Expected Console Logs**:
```
[dashboard] getParentChildren called for: <parentId>
[dashboard] No Supabase client available
[dashboard] getChildProgress fallback: <error or no_supabase_client>
```

**Expected UI**:
- Dashboard should render (NOT blank)
- Children list may be empty or show mock data
- When selecting a child, should show:
  - Child header with name/avatar
  - Learning Snapshot cards (may show zeros)
  - Progress tabs (Overview/Stories/Quizzes)
  - Badges section
- All sections should have proper structure with keys: `{stories, quizzes, chat, streak, activity}`

**Expected Return Value**:
`getChildProgress()` should return `buildEmptyChildProgress(childId, "no_supabase_client")` with shape:
```javascript
{
  stories: { completed: 0, inProgress: 0, total: 0, byTopic: [] },
  quizzes: { attempts: 0, averageScore: 0, byTopic: [] },
  chat: { questionsThisWeek: 0, totalQuestions: 0, topicsExplored: 0 },
  streak: { days: 0, lastActivity: null },
  activity: { last7Days: [...], topicsExplored: [] }
}
```

---

### Test 1b: Supabase Available but Returns Empty Arrays

**Goal**: Verify fallback chain: localStorage → mockDashboardData.json → buildEmptyChildProgress

**Steps to Simulate**:
1. Ensure Supabase config is valid
2. Use a childId that has NO data in Supabase (e.g., `child-test-empty`)
3. Clear localStorage for this test: `localStorage.removeItem('sqh_dashboard_progress_v1')`
4. Navigate to `/parent/dashboard.html?childId=child-test-empty`
5. Select the child

**Expected Console Logs** (in order):
```
[dashboard] Supabase returned empty arrays, checking fallbacks...
[dashboard] Using stored dashboard progress from localStorage  // IF localStorage has data
// OR
[dashboard] Using mock dashboard progress  // IF mockDashboardData.json has data
// OR
[dashboard] Using empty progress fallback  // IF both fail
```

**Test Scenarios**:

**Scenario 1: localStorage has data**
1. Before test, set localStorage:
   ```javascript
   localStorage.setItem('sqh_dashboard_progress_v1', JSON.stringify({
     'child-test-empty': {
       stories: { completed: 2, inProgress: 1, total: 3, byTopic: [] },
       quizzes: { attempts: 5, averageScore: 80, byTopic: [] },
       chat: { questionsThisWeek: 3, totalQuestions: 10, topicsExplored: 2 },
       streak: { days: 3, lastActivity: new Date().toISOString() },
       activity: { last7Days: [...], topicsExplored: [] }
     }
   }));
   ```
2. Expected: Uses localStorage data

**Scenario 2: localStorage empty, mockDashboardData.json has data**
1. Clear localStorage: `localStorage.removeItem('sqh_dashboard_progress_v1')`
2. Ensure `/parent/mockDashboardData.json` exists and has `progress['child-test-empty']` or use existing child like `child-akhil`
3. Expected: Uses mock data

**Scenario 3: Both empty**
1. Clear localStorage
2. Use childId NOT in mockDashboardData.json
3. Expected: Uses `buildEmptyChildProgress(childId, "empty_data_fallback")`

**Expected UI**:
- Dashboard renders with data from fallback source
- All sections display correctly with proper keys

---

### Test 1c: Supabase Error (Missing Table/RLS)

**Goal**: Verify error handling returns `buildEmptyChildProgress(childId, "supabase_error")`

**Steps to Simulate**:
1. Ensure Supabase config is valid
2. Option A: Temporarily break Supabase query (e.g., wrong table name)
   - Edit `dashboard-services.js` line 121: change `'story_progress'` to `'story_progress_broken'`
3. Option B: Use a childId that triggers RLS error (if RLS is configured)
4. Navigate to `/parent/dashboard.html?childId=<childId>`

**Expected Console Logs**:
```
[dashboard] getChildProgress fallback: <error object>
```

**Expected Return Value**:
`buildEmptyChildProgress(childId, "supabase_error")` with all keys present

**Expected UI**:
- Dashboard renders (NOT blank)
- Shows empty/zero values but structure is intact
- No error messages visible to user (errors logged only)

---

## 2. Grade-Based Quiz Routing Tests

### Test 2a: Grades K-2 → Beginner Quiz

**Steps**:
1. Ensure user profile has `grade_level` set to K, 1, or 2 (or age 5-7)
2. Navigate to a Photosynthesis story (e.g., `/stories/photosynthesis-story/read`)
3. Complete the story or click "Take Quiz" button
4. Check browser console and network tab

**Expected Console Logs**:
```
[story-viewer] Take Quiz button clicked!
[story-viewer] Getting quiz URL for story: <story object>
[quiz-routing] <grade level detection logs>
[story-viewer] Quiz URL determined: /quizzes/photosynthesis-quiz-beginner.html
[story-viewer] Navigating to: /quizzes/photosynthesis-quiz-beginner.html
```

**Expected Navigation**:
- URL changes to `/quizzes/photosynthesis-quiz-beginner.html`
- Quiz page loads

**Test Cases**:
- Grade K → beginner
- Grade 1 → beginner
- Grade 2 → beginner
- Age 5-7 (if grade_level missing) → beginner

---

### Test 2b: Grades 3-4 → Intermediate Quiz

**Steps**:
1. Set user profile `grade_level` to 3 or 4 (or age 8-9)
2. Navigate to Photosynthesis story
3. Click "Take Quiz"

**Expected Navigation**:
- URL: `/quizzes/photosynthesis-quiz-intermediate.html`

**Test Cases**:
- Grade 3 → intermediate
- Grade 4 → intermediate
- Age 8-9 (if grade_level missing) → intermediate

---

### Test 2c: Grades 5-6 → Advanced Quiz

**Steps**:
1. Set user profile `grade_level` to 5 or 6 (or age 10-12)
2. Navigate to Photosynthesis story
3. Click "Take Quiz"

**Expected Navigation**:
- URL: `/quizzes/photosynthesis-quiz-advanced.html`

**Test Cases**:
- Grade 5 → advanced
- Grade 6 → advanced
- Age 10-12 (if grade_level missing) → advanced

---

### Test 2d: Non-Photosynthesis Stories → Fallback Route

**Steps**:
1. Navigate to a non-Photosynthesis story (e.g., Solar System story)
2. Click "Take Quiz"

**Expected Console Logs**:
```
[story-viewer] Quiz URL determined: /stories/<storyId>/quiz
```

**Expected Navigation**:
- URL: `/stories/<storyId>/quiz` (fallback route)
- NOT one of the photosynthesis quiz URLs

**Test Cases**:
- Story with `topicTag: "Solar System"` → fallback
- Story with `topicTag: "Moon & Gravity"` → fallback
- Story with no `topicTag` → fallback

---

## Verification Checklist

### Parent Dashboard Fallback
- [ ] Test 1a: Supabase missing → Dashboard renders, returns empty progress
- [ ] Test 1b: Empty arrays → Fallback chain works (localStorage → mock → empty)
- [ ] Test 1c: Supabase error → Returns empty progress, UI renders

### Quiz Routing
- [ ] Test 2a: K-2 → beginner quiz
- [ ] Test 2b: 3-4 → intermediate quiz
- [ ] Test 2c: 5-6 → advanced quiz
- [ ] Test 2d: Non-photosynthesis → fallback route

---

## Issues Found & Fixes

(To be filled during testing)

