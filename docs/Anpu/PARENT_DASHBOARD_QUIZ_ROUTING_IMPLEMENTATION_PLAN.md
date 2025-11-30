# Parent Dashboard and Quiz Routing Fallback Implementation Plan

## Overview and Objectives

This document outlines the implementation plan for robust fallback mechanisms in the Parent Dashboard progress retrieval system and Quiz Routing grade-based selection. The implementation ensures the application remains functional even when Supabase is unavailable, returns empty data, or encounters errors.

### Objectives

1. Implement graceful degradation when Supabase is unavailable
2. Create a multi-tier fallback chain for progress data retrieval
3. Implement grade-level and age-based quiz routing with fallbacks
4. Ensure all functions return valid data structures instead of null
5. Provide comprehensive test coverage for all fallback scenarios

### Scope

- **Files Modified:**
  - `parent/dashboard-services.js` - Progress retrieval with fallback chain
  - `stories/quiz-routing.js` - Grade-based quiz URL routing
- **Test Files Created:**
  - `parent/dashboard-services.test.js` - 7 test cases
  - `stories/quiz-routing.test.js` - 11 test cases

---

## Issue 1: Supabase Unavailable → Fallback to Empty Progress

### Problem Statement

When Supabase client cannot be created (missing configuration, network issues, or initialization failures), the `getChildProgress` function must return a valid progress object instead of throwing errors or returning null.

### Implementation Approach

**Location:** `parent/dashboard-services.js`, lines 113-116

The function checks if `getSupabaseClient()` returns null immediately after invocation. If null, it bypasses all Supabase queries and returns an empty progress structure via `buildEmptyChildProgress()`.

**Flow:**
1. Call `getSupabaseClient()`
2. If null, return `buildEmptyChildProgress(childId, "no_supabase_client")`
3. No Supabase queries are executed
4. Function returns immediately with valid empty structure

### Key Functions

- `getSupabaseClient()` - Returns null if Supabase config is missing or invalid
- `buildEmptyChildProgress(childId, reason)` - Creates valid empty progress object with all required keys

### Validation

The returned object must contain all required keys: `stories`, `quizzes`, `chat`, `streak`, and `activity`. Each key must be a non-null object with appropriate structure.

---

## Issue 2: Supabase Returns Empty Arrays → Fallback Chain

### Problem Statement

When Supabase is available and queries succeed but return empty arrays (no data for the child), the system should attempt fallback sources in a specific order: localStorage → mock data → empty progress.

### Implementation Approach

**Location:** `parent/dashboard-services.js`, lines 143-185

After executing three Supabase queries (story_progress, quiz_attempts, chat_messages), the function checks if all three result arrays are empty. If empty, it initiates a fallback chain.

**Fallback Chain Order:**

1. **localStorage Check** (lines 155-166)
   - Calls `getStoredDashboardProgress(childId)`
   - Validates stored object has all required keys using shape guard
   - Returns stored progress if valid
   - Falls through if invalid or missing

2. **Mock Data Check** (lines 169-180)
   - Calls `getMockDashboardProgress(childId)`
   - Fetches from `/parent/mockDashboardData.json` if not cached
   - Validates mock progress has all required keys
   - Returns mock progress if valid
   - Falls through if invalid, missing, or fetch fails

3. **Empty Progress Fallback** (lines 183-184)
   - Returns `buildEmptyChildProgress(childId, "empty_data_fallback")`
   - Guarantees non-null return value

### Shape Guard Validation

Both localStorage and mock data are validated before being returned. The validation checks for the presence of all five required keys:
- `stories`
- `quizzes`
- `chat`
- `streak`
- `activity`

If any key is missing, the object is rejected and the fallback chain continues to the next level.

### Key Functions

- `getStoredDashboardProgress(childId)` - Retrieves from localStorage with error handling
- `getMockDashboardProgress(childId)` - Fetches mock data with caching and error handling
- `buildEmptyChildProgress(childId, reason)` - Creates empty progress structure

---

## Issue 3: Supabase + localStorage Empty → Fallback to Mock Data

### Problem Statement

When Supabase returns empty arrays and localStorage contains no valid data for the child, the system should attempt to load mock dashboard data from a JSON file.

### Implementation Approach

**Location:** `parent/dashboard-services.js`, lines 49-66 and 169-180

The `getMockDashboardProgress` function implements caching and error handling for mock data retrieval.

**Features:**

1. **Caching:** Uses module-level `cachedMockDashboardData` variable to avoid repeated fetches
2. **Error Handling:** Wraps fetch in try-catch block
3. **Response Validation:** Checks `response.ok` before parsing JSON
4. **Graceful Degradation:** Returns null on any error, triggering next fallback level

**Flow:**
1. Check if `cachedMockDashboardData` exists
2. If cached, return `cachedMockDashboardData.progress[childId]`
3. If not cached, fetch from `/parent/mockDashboardData.json`
4. Validate response is ok
5. Parse JSON and cache result
6. Return `progress[childId]` or null if not found

### Error Scenarios Handled

- Network errors (fetch throws)
- HTTP errors (response.ok is false)
- JSON parsing errors
- Missing child ID in mock data
- Invalid mock data structure

All errors result in null return, allowing fallback chain to continue to empty progress.

---

## Issue 4: Quiz Routing Grade/Age-Based Selection with Fallbacks

### Problem Statement

For Photosynthesis stories, quiz URLs must be determined based on user's grade level or age, with appropriate fallbacks when profile data is unavailable.

### Implementation Approach

**Location:** `stories/quiz-routing.js`, lines 163-181

The `getQuizUrl` function determines quiz difficulty based on grade level (primary) or age (fallback), then constructs the appropriate quiz URL.

**Grade Level Mapping:**

- **K, 1, 2 → beginner:** Returns `/quizzes/photosynthesis-quiz-beginner.html`
- **3, 4 → intermediate:** Returns `/quizzes/photosynthesis-quiz-intermediate.html`
- **5, 6 → advanced:** Returns `/quizzes/photosynthesis-quiz-advanced.html`

**Fallback Chain:**

1. **Grade Level (Primary):** Uses `profile.grade_level` if available
2. **Age (Backward Compatibility):** Falls back to `profile.age` if grade_level unavailable
3. **Default:** Returns beginner difficulty if neither available

**Non-Photosynthesis Stories:**

For stories that are not about Photosynthesis, the function returns a fallback URL: `/stories/{storyId}/quiz` or `/stories/unknown/quiz` if story ID is missing.

### Grade Level Mapping Logic

**Location:** `stories/quiz-routing.js`, lines 69-127

The `mapGradeLevelToQuizDifficulty` function handles various grade level formats:

**Beginner (K-2):**
- Accepts: "K", "k", "1", "2", "grade 1", "grade 2", "k-2", "kindergarten", etc.
- Case-insensitive matching
- Handles variations like "Grade K", "K-2", etc.

**Intermediate (3-4):**
- Accepts: "3", "4", "grade 3", "grade 4", "3-4"
- Case-insensitive matching

**Advanced (5-6):**
- Accepts: "5", "6", "grade 5", "grade 6", "5-6"
- Case-insensitive matching

**Age Fallback:**
- Ages 5-7 → beginner
- Ages 8-9 → intermediate
- Ages 10-12 → advanced

**Default:**
- Returns "beginner" if neither grade_level nor age is available
- Logs warning message

### Key Functions

- `getUserProfile()` - Fetches user profile from Supabase with caching
- `mapGradeLevelToQuizDifficulty(gradeLevel, age)` - Maps grade/age to difficulty
- `isPhotosynthesisStory(story)` - Determines if story is Photosynthesis-related
- `getQuizUrl(story)` - Main function returning appropriate quiz URL

### Profile Fetching Fallbacks

**Location:** `stories/quiz-routing.js`, lines 15-57

The `getUserProfile` function implements multiple fallback levels:

1. **Cache Check:** Returns cached profile if available
2. **Config Check:** Validates Supabase config exists
3. **Session Check:** Verifies active Supabase session
4. **Profile Query:** Fetches from `user_profiles` table
5. **Error Handling:** Returns null on any error, triggering default difficulty

---

## Issue 5: Empty/Default Child Progress Structure

### Problem Statement

All code paths must return a valid progress object structure instead of null. This ensures UI components can safely access progress data without null checks.

### Implementation Approach

**Location:** `parent/dashboard-services.js`, lines 26-34

The `buildEmptyChildProgress` function creates a standardized empty progress object that matches the structure of real progress data.

**Structure:**
- `stories`: Result of `aggregateStoryProgress([])` - empty array aggregation
- `quizzes`: Result of `aggregateQuizProgress([])` - empty array aggregation
- `chat`: Result of `aggregateChatProgress([])` - empty array aggregation
- `streak`: Result of `calculateStreak([], [], [])` - empty streak calculation
- `activity`: Result of `aggregateActivity([], [], [])` - empty activity aggregation

**Reason Parameter:**
The function accepts a `reason` parameter for debugging/logging purposes:
- "no_supabase_client" - Supabase unavailable
- "empty_data_fallback" - All fallbacks exhausted
- "supabase_error" - Supabase query error
- "fallback" - Default reason

### Aggregation Functions

All aggregation functions (`aggregateStoryProgress`, `aggregateQuizProgress`, `aggregateChatProgress`, `calculateStreak`, `aggregateActivity`) are designed to handle empty arrays gracefully, returning valid structures with zero values or empty arrays as appropriate.

---

## Fallback Chain Architecture

### Complete Flow Diagram

```
getChildProgress(childId)
│
├─> getSupabaseClient()
│   │
│   ├─> null? → buildEmptyChildProgress("no_supabase_client") → RETURN
│   │
│   └─> client exists → Continue
│
├─> Try Supabase Queries
│   │
│   ├─> story_progress.select().eq('user_id', childId)
│   ├─> quiz_attempts.select().eq('user_id', childId)
│   └─> chat_messages.select().eq('user_id', childId)
│   │
│   ├─> Error? → Catch → buildEmptyChildProgress("supabase_error") → RETURN
│   │
│   └─> Success → Check if all arrays empty
│       │
│       ├─> Not Empty → Transform & Return Real Data
│       │
│       └─> All Empty → Fallback Chain:
│           │
│           ├─> Level 1: localStorage
│           │   ├─> getStoredDashboardProgress(childId)
│           │   ├─> Valid? → RETURN storedProgress
│           │   └─> Invalid/Missing → Continue
│           │
│           ├─> Level 2: Mock Data
│           │   ├─> getMockDashboardProgress(childId)
│           │   ├─> Valid? → RETURN mockProgress
│           │   └─> Invalid/Missing/Fetch Fails → Continue
│           │
│           └─> Level 3: Empty Progress
│               └─> buildEmptyChildProgress("empty_data_fallback") → RETURN
```

### Quiz Routing Flow

```
getQuizUrl(story)
│
├─> isPhotosynthesisStory(story)?
│   │
│   ├─> No → RETURN `/stories/{storyId}/quiz`
│   │
│   └─> Yes → Continue
│
├─> getUserProfile()
│   │
│   ├─> Cache hit? → Use cached profile
│   ├─> Config missing? → null
│   ├─> No session? → null
│   ├─> Query error? → null
│   └─> Success → profile object
│
├─> mapGradeLevelToQuizDifficulty(gradeLevel, age)
│   │
│   ├─> gradeLevel exists? → Map grade (K-2, 3-4, 5-6)
│   ├─> age exists? → Map age (5-7, 8-9, 10-12)
│   └─> Neither? → Default to "beginner"
│
└─> RETURN `/quizzes/photosynthesis-quiz-{difficulty}.html`
```

---

## Implementation Details

### Code References

**Parent Dashboard Services:**

- `getChildProgress()` - Lines 110-199 in `parent/dashboard-services.js`
- `buildEmptyChildProgress()` - Lines 26-34
- `getStoredDashboardProgress()` - Lines 36-47
- `getMockDashboardProgress()` - Lines 49-66
- `getSupabaseClient()` - Lines 18-24 (exported for testing)

**Quiz Routing:**

- `getQuizUrl()` - Lines 163-181 in `stories/quiz-routing.js`
- `getUserProfile()` - Lines 15-57 (exported for testing)
- `mapGradeLevelToQuizDifficulty()` - Lines 69-127
- `isPhotosynthesisStory()` - Lines 134-156

### Key Design Decisions

1. **Early Return Pattern:** Supabase unavailability is checked first to avoid unnecessary processing
2. **Shape Guards:** All fallback data sources are validated before use
3. **Caching:** Mock data and user profiles are cached to reduce network calls
4. **Error Isolation:** Each fallback level handles its own errors independently
5. **Non-Null Guarantee:** All code paths return valid objects, never null
6. **Backward Compatibility:** Age-based mapping maintained for existing profiles without grade_level

### Constants and Configuration

- `DASHBOARD_PROGRESS_KEY = 'sqh_dashboard_progress_v1'` - localStorage key for progress
- Mock data path: `/parent/mockDashboardData.json`
- Quiz URL pattern: `/quizzes/photosynthesis-quiz-{difficulty}.html`
- Fallback quiz URL pattern: `/stories/{storyId}/quiz`

---

## Testing Strategy

### Test Framework

- **Framework:** Vitest with jsdom environment
- **Location:** Test files in same directories as source files
- **Coverage:** 18 total tests (7 for dashboard, 11 for quiz routing)

### Dashboard Services Tests

**File:** `parent/dashboard-services.test.js`

**Test Cases:**

1. **Issue 1 Test:** No supabase client returns non-null object with required keys
2. **Issue 2 Test:** Supabase empty arrays + localStorage returns stored progress
3. **Issue 3 Test:** Supabase empty arrays + no localStorage + mock data returns mock progress
4. **Issue 4a Test:** Fetch throws error returns empty progress
5. **Issue 4b Test:** Fetch returns non-ok status returns empty progress
6. **Issue 5 Test:** Supabase query error returns empty progress
7. **Shape Guard Test:** localStorage with missing keys falls through to mock/empty

**Mocking Strategy:**

- Mock `createClient` from Supabase CDN import
- Mock `fetch` for mock data retrieval
- Use jsdom localStorage for storage testing
- Mock config to control Supabase availability

### Quiz Routing Tests

**File:** `stories/quiz-routing.test.js`

**Test Cases:**

1. **Grade K Test:** Returns beginner quiz
2. **Grade 1 Test:** Returns beginner quiz
3. **Grade 2 Test:** Returns beginner quiz
4. **Grade 3 Test:** Returns intermediate quiz
5. **Grade 4 Test:** Returns intermediate quiz
6. **Grade 5 Test:** Returns advanced quiz
7. **Grade 6 Test:** Returns advanced quiz
8. **Non-Photosynthesis Test:** Returns fallback URL
9. **Null Profile Test:** Returns fallback URL for non-photosynthesis
10. **Null Story ID Test:** Handles null story ID
11. **Undefined Story ID Test:** Handles undefined story ID

**Mocking Strategy:**

- Mock Supabase `createClient` and auth methods
- Mock `getUserProfile` to return various grade levels
- Test all grade level variations and edge cases

### Test Execution

Run all tests with: `npm test`

All 18 tests must pass to verify implementation correctness.

---

## Files Modified

### Source Files

1. **parent/dashboard-services.js**
   - Exported `getSupabaseClient` for testability
   - Implemented fallback chain in `getChildProgress`
   - Added shape guard validation
   - Enhanced error handling

2. **stories/quiz-routing.js**
   - Exported `getUserProfile` for testability
   - Implemented grade level mapping with age fallback
   - Added profile caching
   - Enhanced error handling

### Test Files

1. **parent/dashboard-services.test.js** (new)
   - 7 test cases covering all fallback scenarios
   - Comprehensive mocking setup

2. **stories/quiz-routing.test.js** (new)
   - 11 test cases covering all grade levels and edge cases
   - Comprehensive mocking setup

### Configuration Files

1. **package.json**
   - Added `vitest` and `jsdom` to devDependencies
   - Added `"test": "vitest"` script

2. **vitest.config.js** (new)
   - Configured jsdom environment for browser API testing

---

## Success Criteria

### Functional Requirements

- [x] Issue 1: No Supabase client returns valid empty progress
- [x] Issue 2: Empty arrays trigger localStorage fallback
- [x] Issue 3: Mock data fallback works when localStorage empty
- [x] Issue 4: Quiz routing uses grade level with age fallback
- [x] Issue 5: All code paths return valid progress objects

### Quality Requirements

- [x] All 18 tests passing
- [x] No null returns from progress functions
- [x] Shape guards validate all fallback data
- [x] Error handling covers all failure scenarios
- [x] Backward compatibility maintained for age-based routing

### Documentation Requirements

- [x] Code comments explain fallback logic
- [x] Function documentation describes behavior
- [x] Test files document expected behavior
- [x] Implementation plan document created
- [x] Implementation summary document created

---

## Future Enhancements

### Potential Improvements

1. **Progressive Enhancement:** Load mock data in background while Supabase queries execute
2. **Retry Logic:** Add retry mechanism for transient Supabase failures
3. **Cache Invalidation:** Implement TTL for cached mock data
4. **Analytics:** Log which fallback level was used for monitoring
5. **User Feedback:** Display indicator when using fallback data

### Maintenance Notes

- Mock data structure must match Supabase schema for seamless migration
- Grade level mapping may need expansion for additional grade levels
- localStorage key versioning allows future schema changes
- Profile cache clearing may be needed after profile updates

---

**Document Status:** Final  
**Last Updated:** Implementation complete, all tests passing  
**Next Review:** When adding new fallback levels or modifying fallback chain

