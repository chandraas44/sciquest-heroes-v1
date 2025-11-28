# Testing Guide: Parent Dashboard Fallback + Quiz Routing

## Quick Test Summary

### 1. Parent Dashboard Fallback Tests

#### Test 1a: Supabase Missing/Off

**How to Simulate**:
1. Open `.env` file (or create if missing)
2. Comment out or rename `VITE_SUPABASE_URL`:
   ```
   # VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_URL_DISABLED=https://your-project.supabase.co
   ```
3. Restart dev server: `npm run dev` (or your dev command)
4. Open browser to `http://localhost:5173/parent/dashboard.html?childId=child-akhil`

**Expected Console Logs**:
```
[dashboard] getParentChildren called for: <parentId>
[dashboard] No Supabase client available
[dashboard] No Supabase client available, using empty progress fallback
```

**Expected UI**:
- ✅ Dashboard renders (NOT blank)
- ✅ Child header shows name/avatar
- ✅ Learning Snapshot shows 4 metric cards (may show zeros)
- ✅ Progress tabs (Overview/Stories/Quizzes) are visible
- ✅ Badges section is visible
- ✅ All sections have proper structure

**What to Check**:
- Open DevTools Console → Should see logs above
- Check Network tab → No Supabase API calls (or they fail gracefully)
- Verify UI renders completely (no blank screen)

---

#### Test 1b: Supabase Available but Returns Empty Arrays

**How to Simulate**:
1. Ensure Supabase config is valid (restore `.env` if needed)
2. Use a childId that has NO data in Supabase (e.g., `child-test-empty`)
3. Clear localStorage:
   ```javascript
   // In browser console:
   localStorage.removeItem('sqh_dashboard_progress_v1');
   ```
4. Navigate to `/parent/dashboard.html?childId=child-test-empty`

**Test Scenario A: localStorage has data**
1. Before navigating, set localStorage:
   ```javascript
   // In browser console:
   localStorage.setItem('sqh_dashboard_progress_v1', JSON.stringify({
     'child-test-empty': {
       stories: { completed: 2, inProgress: 1, total: 3, byTopic: [] },
       quizzes: { attempts: 5, averageScore: 80, byTopic: [] },
       chat: { questionsThisWeek: 3, totalQuestions: 10, topicsExplored: 2 },
       streak: { days: 3, lastActivity: new Date().toISOString() },
       activity: { last7Days: [
         { date: '2025-01-15', sessions: 1 },
         { date: '2025-01-14', sessions: 0 },
         { date: '2025-01-13', sessions: 1 },
         { date: '2025-01-12', sessions: 0 },
         { date: '2025-01-11', sessions: 1 },
         { date: '2025-01-10', sessions: 0 },
         { date: '2025-01-09', sessions: 1 }
       ], topicsExplored: [] }
     }
   }));
   ```
2. Navigate to dashboard
3. **Expected Console**:
   ```
   [dashboard] Supabase returned empty arrays, checking fallbacks...
   [dashboard] Using stored dashboard progress from localStorage
   ```
4. **Expected UI**: Shows data from localStorage (2 stories completed, 5 quiz attempts, etc.)

**Test Scenario B: localStorage empty, mockDashboardData.json has data**
1. Clear localStorage: `localStorage.removeItem('sqh_dashboard_progress_v1')`
2. Use existing child from mock data: `child-akhil` or `child-maya`
3. Navigate to `/parent/dashboard.html?childId=child-akhil`
4. **Expected Console**:
   ```
   [dashboard] Supabase returned empty arrays, checking fallbacks...
   [dashboard] Using mock dashboard progress
   ```
5. **Expected UI**: Shows mock data (4 stories completed for child-akhil, etc.)

**Test Scenario C: Both empty**
1. Clear localStorage
2. Use childId NOT in mockDashboardData.json: `child-nonexistent`
3. Navigate to `/parent/dashboard.html?childId=child-nonexistent`
4. **Expected Console**:
   ```
   [dashboard] Supabase returned empty arrays, checking fallbacks...
   [dashboard] Using empty progress fallback
   ```
5. **Expected UI**: Shows zeros/empty but structure intact

---

#### Test 1c: Supabase Error (Missing Table/RLS)

**How to Simulate**:
1. Ensure Supabase config is valid
2. Temporarily break a table name in `parent/dashboard-services.js`:
   - Line 121: Change `'story_progress'` to `'story_progress_broken'`
3. Navigate to `/parent/dashboard.html?childId=child-akhil`

**Expected Console Logs**:
```
[dashboard] getChildProgress fallback: <error object>
```

**Expected UI**:
- ✅ Dashboard renders (NOT blank)
- ✅ Shows empty/zero values
- ✅ All sections visible with proper structure
- ❌ No error messages visible to user

**Revert Change**: After test, change `'story_progress_broken'` back to `'story_progress'`

---

### 2. Grade-Based Quiz Routing Tests

#### Test 2a: Grades K-2 → Beginner Quiz

**How to Simulate**:
1. Ensure user is logged in
2. Set user profile `grade_level` to K, 1, or 2 (or age 5-7)
   - In Supabase: Update `user_profiles` table, set `grade_level = 'K'` or `'1'` or `'2'`
   - Or use a test user with grade K-2
3. Navigate to a Photosynthesis story:
   - `/stories/photosynthesis-story/read` (or your photosynthesis story ID)
4. Complete story or click "Take Quiz" button
5. Check browser console and network tab

**Expected Console Logs**:
```
[story-viewer] Take Quiz button clicked!
[story-viewer] Getting quiz URL for story: <story object>
[quiz-routing] <grade level detection logs if any>
[story-viewer] Quiz URL determined: /quizzes/photosynthesis-quiz-beginner.html
[story-viewer] Navigating to: /quizzes/photosynthesis-quiz-beginner.html
```

**Expected Navigation**:
- ✅ URL changes to `/quizzes/photosynthesis-quiz-beginner.html`
- ✅ Quiz page loads

**Test Cases**:
- Grade K → `/quizzes/photosynthesis-quiz-beginner.html`
- Grade 1 → `/quizzes/photosynthesis-quiz-beginner.html`
- Grade 2 → `/quizzes/photosynthesis-quiz-beginner.html`
- Age 5-7 (if grade_level missing) → `/quizzes/photosynthesis-quiz-beginner.html`

---

#### Test 2b: Grades 3-4 → Intermediate Quiz

**How to Simulate**:
1. Set user profile `grade_level` to 3 or 4 (or age 8-9)
2. Navigate to Photosynthesis story
3. Click "Take Quiz"

**Expected Navigation**:
- ✅ URL: `/quizzes/photosynthesis-quiz-intermediate.html`
- ✅ Quiz page loads

**Test Cases**:
- Grade 3 → `/quizzes/photosynthesis-quiz-intermediate.html`
- Grade 4 → `/quizzes/photosynthesis-quiz-intermediate.html`
- Age 8-9 (if grade_level missing) → `/quizzes/photosynthesis-quiz-intermediate.html`

---

#### Test 2c: Grades 5-6 → Advanced Quiz

**How to Simulate**:
1. Set user profile `grade_level` to 5 or 6 (or age 10-12)
2. Navigate to Photosynthesis story
3. Click "Take Quiz"

**Expected Navigation**:
- ✅ URL: `/quizzes/photosynthesis-quiz-advanced.html`
- ✅ Quiz page loads

**Test Cases**:
- Grade 5 → `/quizzes/photosynthesis-quiz-advanced.html`
- Grade 6 → `/quizzes/photosynthesis-quiz-advanced.html`
- Age 10-12 (if grade_level missing) → `/quizzes/photosynthesis-quiz-advanced.html`

---

#### Test 2d: Non-Photosynthesis Stories → Fallback Route

**How to Simulate**:
1. Navigate to a non-Photosynthesis story:
   - `/stories/solar-system-story/read` (or any non-photosynthesis story)
2. Click "Take Quiz" button

**Expected Console Logs**:
```
[story-viewer] Take Quiz button clicked!
[story-viewer] Getting quiz URL for story: <story object>
[story-viewer] Quiz URL determined: /stories/<storyId>/quiz
[story-viewer] Navigating to: /stories/<storyId>/quiz
```

**Expected Navigation**:
- ✅ URL: `/stories/<storyId>/quiz` (fallback route)
- ❌ NOT one of: `/quizzes/photosynthesis-quiz-beginner.html`, etc.

**Test Cases**:
- Story with `topicTag: "Solar System"` → `/stories/solar-system-story/quiz`
- Story with `topicTag: "Moon & Gravity"` → `/stories/moon-gravity-story/quiz`
- Story with no `topicTag` → `/stories/<storyId>/quiz`

---

## Verification Checklist

### Parent Dashboard Fallback
- [ ] **Test 1a**: Supabase missing → Dashboard renders, shows empty progress, console logs present
- [ ] **Test 1b Scenario A**: Empty arrays + localStorage → Uses localStorage data
- [ ] **Test 1b Scenario B**: Empty arrays + mock data → Uses mock data
- [ ] **Test 1b Scenario C**: Empty arrays + no fallback → Uses empty progress
- [ ] **Test 1c**: Supabase error → Returns empty progress, UI renders, no user-visible errors

### Quiz Routing
- [ ] **Test 2a**: K-2 → `/quizzes/photosynthesis-quiz-beginner.html`
- [ ] **Test 2b**: 3-4 → `/quizzes/photosynthesis-quiz-intermediate.html`
- [ ] **Test 2c**: 5-6 → `/quizzes/photosynthesis-quiz-advanced.html`
- [ ] **Test 2d**: Non-photosynthesis → `/stories/<storyId>/quiz`

---

## Common Issues & Fixes

### Issue: Dashboard shows blank screen
**Fix**: Check console for errors. Ensure `getChildProgress` always returns an object with all required keys.

### Issue: Quiz routing goes to wrong URL
**Fix**: 
1. Check user profile has correct `grade_level`
2. Verify story has correct `topicTag` for Photosynthesis detection
3. Check console logs for routing decisions

### Issue: Fallback chain not working
**Fix**: 
1. Verify localStorage key: `sqh_dashboard_progress_v1`
2. Verify mockDashboardData.json path: `/parent/mockDashboardData.json`
3. Check console logs to see which fallback is used

---

## Notes

- All tests should be done in a development environment
- After testing, revert any temporary code changes
- Use browser DevTools Console and Network tabs for debugging
- Test with different childIds to verify various scenarios

