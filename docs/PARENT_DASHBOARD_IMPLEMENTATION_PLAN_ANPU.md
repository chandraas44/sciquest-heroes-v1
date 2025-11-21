# Parent Dashboard with Progress Visualization - Implementation Plan

**Branch:** Anpu  
**Feature:** Parent Dashboard with Progress Visualization (Phase 3)  
**Status:** Planning  
**Route:** `/parent/dashboard`

---

## Overview

The Parent Dashboard provides parents with a comprehensive view of their children's learning progress across Comic Viewer stories, Topic Chat AI interactions, and quiz performance. Following the established mock-first approach, this phase builds UI scaffolding, data aggregation logic, and mock data fallbacks before Supabase database integration.

This dashboard uses the same global header, footer, logout button logic, gradients, glassmorphism, and child-friendly design tokens used across the Anpu branch.

---

## Architecture & Design Principles

### Mock-First Approach
- Feature flag: `VITE_USE_DASHBOARD_MOCKS` (default: `true`)
- All functionality works with mock data before Supabase integration
- Graceful fallback to mocks if Supabase unavailable
- Follows same pattern as Comic Viewer and Topic Chat AI

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
- **No Plain White**: All white surfaces replaced with glassmorphism or child-friendly colors

### Global Header & Footer (Required)
- **Same header structure** as Comic Viewer and Chat pages
- **Same footer structure** as Comic Viewer and Chat pages
- **Same logout button logic** (desktop + mobile variants)
- **Navigation links**: Stories, Chat, Dashboard (highlighted when on dashboard)

### Parent-Child Relationship
- Uses existing `parent_id` column in `user_profiles` table
- Leverages Supabase helper function `get_parent_children(parent_user_id)`
- Client-side filtering and caching for child switching
- Row-level security policies enforced by Supabase

### Analytics Integration
- Lightweight placeholder functions mirroring Comic Viewer/Chat pattern
- Events: `dashboard_viewed`, `parent_child_switch`, `child_progress_viewed`, `progress_tab_switched`, `badge_viewed`
- Queued to localStorage: `sqh_analytics_queue_v1` (shared queue)
- No Supabase inserts at this phase (queued only)

---

## Navigation & Routing

### Routes
- `/parent/dashboard` - Main dashboard with two-column layout
- `/parent/dashboard?childId={id}` - Dashboard with specific child pre-selected
- Route handled via Vite middleware rewrite: `/parent/dashboard` → `/parent/dashboard.html`

### Vite Configuration
- Add route rewrite in `vite.config.js`:
  ```javascript
  server.middlewares.use((req, res, next) => {
    const match = req.url.match(/^\/parent\/dashboard(\?.*)?$/);
    if (match) {
      const existingQuery = match[1] || '';
      req.url = `/parent/dashboard.html${existingQuery}`;
    }
    next();
  });
  ```
- Add build input: `parent/dashboard.html` in `vite.config.js`

### Access Control
- Parent-only access (role check in shared `dashboard.js`)
- Redirect to appropriate dashboard if wrong account type
- Child filtering via `parent_id` relationship

### Layout Structure
- **Two-column responsive layout**:
  - Left column: ~30% width (Children List - "Your Young Heroes") - static, remains visible
  - Right column: ~70% width (Selected Child Detail) - updates on child selection
  - Stacks vertically on mobile (< 768px): children list above, detail below

---

## File Structure

```
parent/
├── dashboard.html                  # Main dashboard page (two-column layout)
├── dashboard.js                   # Dashboard UI logic and state management
├── dashboard-services.js         # Data aggregation service layer
└── mockDashboardData.json        # Sample children, progress, badges data

dashboards/
├── dashboard.js                   # Shared: Auth check, profile loading (existing)
└── (existing dashboard files remain unchanged)
```

### Integration Points
- `stories/story-services.js` - Story progress data source
- `chat/chat-services.js` - Chat session data source
- `dashboards/dashboard.js` - Existing auth/profile logic (shared)
- `vite.config.js` - Dashboard route in build config + rewrite middleware
- Shared analytics queue with Comic Viewer and Chat

---

## UI Components & Layout

### Global Header (Required - Same as Anpu Branch)

**Implementation**: Identical to Comic Viewer and Chat pages

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
        <a href="./dashboard.html" class="font-fredoka text-purple-200 font-bold">Dashboard</a>
        <button id="logoutBtn" class="font-fredoka text-white hover:text-purple-200 transition font-bold px-4 py-2 rounded-full border border-white/20 hover:bg-white/10">Logout</button>
      </div>
      
      <!-- Mobile Logout Button -->
      <button id="logoutBtnMobile" class="lg:hidden font-fredoka text-white hover:text-purple-200 transition font-bold px-3 py-2 rounded-full border border-white/20 hover:bg-white/10 text-sm">Logout</button>
    </div>
  </div>
</nav>
```

**Logout Handler** (Same as Comic Viewer/Chat):
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

**Implementation**: Identical to Comic Viewer and Chat pages

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
        <a href="./dashboard.html" class="hover:text-white transition">Dashboard</a>
      </div>
      
      <!-- Copyright -->
      <p class="text-white/60 text-xs font-medium">© 2025 SciQuest Heroes. Safe learning for curious minds.</p>
    </div>
  </div>
</footer>
```

### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Global Header (Fixed, Anpu branch style)                   │
│  - Logo, Stories, Chat, Dashboard links, Logout button      │
├───────────────┬─────────────────────────────────────────────┤
│ Left Column   │ Right Column                                │
│ (~30% width)  │ (~70% width)                                │
│               │                                             │
│ "Your Young   │ [Empty State OR Selected Child Detail]     │
│  Heroes"      │                                             │
│               │                                             │
│ [Child Card 1]│ Header Row (if child selected)             │
│ - Avatar      │ - Avatar, Name                              │
│ - Name        │ - "Last active: X · Current topic: Y"      │
│ - Grade/Age   │                                             │
│ - Stats       │ Learning Snapshot Row                       │
│ - Status pill │ - Stories card (X/Y)                       │
│ - Button      │ - Quizzes card (NN%)                       │
│               │ - Chat card (N questions)                  │
│ [Child Card 2]│ - Streak card (N days)                     │
│ ...           │                                             │
│               │ Learning Progress Section                   │
│               │ <StudentProgressSection />                  │
│               │ - Tab 1: Overview (charts)                 │
│               │ - Tab 2: Stories (progress rows)           │
│               │ - Tab 3: Quizzes (chart + table)           │
│               │                                             │
│               │ Curiosity Badges Section                    │
│               │ <StudentBadgesSection />                    │
│               │ - Summary: "Unlocked X of Y"               │
│               │ - Badge tiles (scroll/wrap)                │
│               │ - "View all badge rules" button            │
├───────────────┴─────────────────────────────────────────────┤
│  Global Footer (Anpu branch style)                          │
│  - Logo, links, copyright                                   │
└─────────────────────────────────────────────────────────────┘
```

### Left Column - Children List (~30% width, Static)

**Container**: 
- `w-[30%]` on desktop, full width on mobile
- Optional background: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6`

**Section Title**:
- Text: "Your Young Heroes"
- Styling: `font-fredoka text-3xl font-bold text-white mb-6`

**Child Cards (Vertical List)**:

Each child card contains:
- **Round avatar image**: 
  - Size: `w-16 h-16 rounded-full`
  - Source: `avatar_url` from profile or default
  - Border: `border-4 border-white/30`
- **Child name**: 
  - `font-fredoka text-xl font-bold text-white`
  - Display: `first_name` or `username`
- **Grade/Age line**: 
  - Format: "Grade 5 · Age 11"
  - `text-white/80 text-sm`
  - Data: `grade_level` and `age` from profile
- **Stats line**: 
  - Format: "Stories: X · Quizzes: Y"
  - `text-white/70 text-xs font-semibold`
  - X = completed stories, Y = quiz attempts (mock for now)
- **Status pill**: 
  - Options: "On Track" (green) or "Needs Attention" (amber)
  - Styling: `px-3 py-1 rounded-full text-xs font-bold`
  - "On Track": `bg-green-500/30 text-green-100 border border-green-400/50`
  - "Needs Attention": `bg-amber-500/30 text-amber-100 border border-amber-400/50`
  - Logic: "On Track" if recent activity (within 7 days) and progress threshold met
- **"View Progress" button**: 
  - `bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition shadow-lg`
  - Click handler: Sets `selectedChildId` and updates right column

**Card Styling**:
- Container: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-[0_0_30px_rgba(155,55,255,0.25)]`
- Hover effect: `hover:shadow-[0_0_40px_rgba(155,55,255,0.35)] transition`
- Selected state: `border-purple-400/50` with stronger glow when child is active
- Spacing: `mb-4` between cards

### Right Column - Selected Child Detail (~70% width, Updates on Selection)

#### Empty State (No Child Selected)

**Container**: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center shadow-[0_0_30px_rgba(155,55,255,0.25)]`

**Content**:
- Icon: 🦸 emoji (large, `text-6xl mb-4`)
- Message: "Select a hero on the left to see their progress."
- Styling: `text-white/70 text-lg font-medium`

#### Header Row (When Child Selected)

**Container**: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 mb-6 shadow-[0_0_30px_rgba(155,55,255,0.25)]`

**Structure**:
```html
<div class="flex items-center gap-4 mb-2">
  <!-- Avatar -->
  <img src="{avatar_url}" alt="{name}" class="w-16 h-16 rounded-full border-4 border-white/30 object-cover" />
  
  <!-- Name & Activity -->
  <div>
    <h2 class="font-fredoka text-4xl font-bold text-white">{first_name}</h2>
    <p class="text-white/80 text-sm mt-1">
      Last active: {lastActiveRelative} · Current topic: {currentTopic}
    </p>
  </div>
</div>
```

**Data Sources**:
- `lastActiveRelative`: Calculated from most recent activity timestamp (e.g., "2 hours ago", "3 days ago")
- `currentTopic`: Most recently viewed story's `topic_tag` or chat session's topic name (e.g., "Photosynthesis")

#### Learning Snapshot Row (3-4 Metric Cards)

**Container**: `grid grid-cols-2 md:grid-cols-4 gap-4 mb-6`

**Each Metric Card**:
```html
<div class="metric-card bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(155,55,255,0.2)]">
  <!-- Icon Circle -->
  <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3">
    <span class="text-2xl">{icon}</span>
  </div>
  
  <!-- Value -->
  <div class="font-fredoka text-2xl font-bold text-white mb-1">
    {value}
  </div>
  
  <!-- Label -->
  <p class="text-white/80 text-xs font-medium">
    {label}
  </p>
</div>
```

**Card Details**:

1. **Stories Card**:
   - Icon: 📚
   - Value: "{completed} / {inProgress}"
   - Label: "Stories completed: {completed} / In progress: {inProgress}"
   - Data: From `getChildStoryProgress(childId)`

2. **Quizzes Card**:
   - Icon: 🏆
   - Value: "{averageScore}%"
   - Label: "Average quiz score: {averageScore}%"
   - Data: Mock for now (placeholder: 85%)

3. **Chat Card**:
   - Icon: 💬
   - Value: "{questionCount}"
   - Label: "Questions asked this week: {questionCount}"
   - Data: Count messages from chat transcripts in last 7 days

4. **Streak Card** (Optional):
   - Icon: 🔥
   - Value: "{days}"
   - Label: "Learning streak: {days} days"
   - Data: Calculate consecutive days with activity

#### Learning Progress Section

**Component**: `<StudentProgressSection childId={selectedChildId} />`

**Container**: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 mb-6 shadow-[0_0_30px_rgba(155,55,255,0.25)]`

**Title**: "Learning Progress" (`font-fredoka text-2xl font-bold text-white mb-4`)

**Tab Navigation**:
```html
<div class="flex gap-2 mb-6 border-b border-white/10">
  <button class="tab-btn active px-4 py-2 rounded-t-2xl font-fredoka font-bold text-sm transition" data-tab="overview">
    Overview
  </button>
  <button class="tab-btn px-4 py-2 rounded-t-2xl font-fredoka font-bold text-sm transition" data-tab="stories">
    Stories
  </button>
  <button class="tab-btn px-4 py-2 rounded-t-2xl font-fredoka font-bold text-sm transition" data-tab="quizzes">
    Quizzes
  </button>
</div>
```

**Tab Styling**:
- Active: `bg-gradient-to-r from-purple-500 to-pink-500 text-white`
- Inactive: `bg-white/10 text-white/70 hover:bg-white/20`
- Border radius: `rounded-t-2xl`

**Tab 1 - Overview**:

Top row (two charts side-by-side):
```html
<div class="grid md:grid-cols-2 gap-4 mb-4">
  <!-- Left Chart: Line Chart -->
  <div class="chart-container bg-white/5 rounded-xl p-4">
    <h4 class="font-fredoka text-sm font-bold text-white mb-3">Last 7 Days Activity</h4>
    <div id="activityLineChart" class="h-48">
      <!-- SVG or Chart.js line chart -->
      <!-- X-axis: Days (Mon, Tue, Wed...) -->
      <!-- Y-axis: Active learning sessions count -->
    </div>
  </div>
  
  <!-- Right Chart: Bar Chart -->
  <div class="chart-container bg-white/5 rounded-xl p-4">
    <h4 class="font-fredoka text-sm font-bold text-white mb-3">Topics Explored</h4>
    <div id="topicsBarChart" class="h-48">
      <!-- SVG or Chart.js bar chart -->
      <!-- X-axis: Topics (Photosynthesis, Sound, Space...) -->
      <!-- Y-axis: Engagement count -->
    </div>
  </div>
</div>
```

Summary sentence:
```html
<p class="text-white/90 text-sm font-medium bg-white/5 rounded-xl p-4">
  This week, {childName} explored {topicCount} topics and completed {storyCount} new stories.
</p>
```

**Chart Library Options**:
- Chart.js (lightweight, CDN)
- Custom SVG-based charts (full control)
- Recharts (if needed, but requires React-style setup)

**Tab 2 - Stories**:

Vertical list of topics with progress rows:
```html
<div class="stories-list space-y-3">
  {topics.map(topic => (
    <div class="topic-progress-row bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
      <!-- Topic Header -->
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-600/30 to-fuchsia-600/30 rounded-full flex items-center justify-center">
          <span class="text-xl">{topic.icon}</span>
        </div>
        <h4 class="font-fredoka text-lg font-bold text-white">{topic.name}</h4>
      </div>
      
      <!-- Progress Bar -->
      <div class="mb-2">
        <div class="bg-white/10 rounded-full h-3 mb-1">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: {completionPercent}%"></div>
        </div>
        <p class="text-white text-xs font-semibold">{completionPercent}%</p>
      </div>
      
      <!-- Stats Text -->
      <p class="text-white/70 text-xs">
        Stories read: {readCount} · In progress: {inProgressCount} · Last opened: {lastOpenedRelative}
      </p>
    </div>
  ))}
</div>
```

**Tab 3 - Quizzes**:

Top bar chart:
```html
<div class="chart-container bg-white/5 rounded-xl p-4 mb-4">
  <h4 class="font-fredoka text-sm font-bold text-white mb-3">Quiz Performance by Topic</h4>
  <div id="quizPerformanceChart" class="h-48">
    <!-- Bar chart -->
    <!-- X-axis: Topics -->
    <!-- Y-axis: Average quiz score (%) -->
  </div>
</div>
```

Below: Simple table:
```html
<div class="bg-white/5 rounded-xl p-4 overflow-x-auto">
  <table class="w-full">
    <thead>
      <tr class="border-b border-white/10">
        <th class="text-left text-white font-bold text-sm py-2">Topic</th>
        <th class="text-left text-white font-bold text-sm py-2">Attempts</th>
        <th class="text-left text-white font-bold text-sm py-2">Best Score</th>
        <th class="text-left text-white font-bold text-sm py-2">Last Attempt</th>
      </tr>
    </thead>
    <tbody>
      {quizData.map(row => (
        <tr class="border-b border-white/10">
          <td class="text-white/80 text-sm py-2">{row.topic}</td>
          <td class="text-white/80 text-sm py-2">{row.attempts}</td>
          <td class="text-white/80 text-sm py-2">{row.bestScore}%</td>
          <td class="text-white/80 text-sm py-2">{row.lastAttemptRelative}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

#### Curiosity Badges Section

**Component**: `<StudentBadgesSection childId={selectedChildId} />`

**Container**: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(155,55,255,0.25)]`

**Title**: "Curiosity Badges" (`font-fredoka text-2xl font-bold text-white mb-4`)

**Top Summary**:
```html
<p class="text-white/90 text-sm font-medium mb-4">
  {childName} has unlocked {unlockedCount} of {totalCount} core curiosity badges.
</p>
```

**Badge Tiles Container**:
```html
<div class="badges-container flex gap-4 overflow-x-auto pb-2 mb-4 md:flex-wrap md:overflow-x-visible">
  {badges.map(badge => (
    <div class="badge-tile bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 min-w-[180px] flex-shrink-0 hover:shadow-[0_0_30px_rgba(155,55,255,0.5)] transition relative" data-badge-id="{badge.id}">
      <!-- Badge Icon -->
      <div class="badge-icon-container mb-3 flex justify-center relative">
        <div class="badge-icon w-16 h-16 rounded-full flex items-center justify-center {badge.unlocked ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(155,55,255,0.4)]' : 'bg-white/10 opacity-40'}">
          <span class="text-3xl">{badge.icon}</span>
        </div>
        <!-- Status Indicator -->
        {badge.unlocked ? (
          <span class="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
        ) : (
          <span class="absolute top-0 right-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white/60 text-xs">🔒</span>
        )}
      </div>
      
      <!-- Badge Name -->
      <h4 class="font-fredoka text-base font-bold text-white mb-2 text-center">
        {badge.name}
      </h4>
      
      <!-- Description Line -->
      <p class="text-white/80 text-xs text-center {!badge.unlocked && 'italic text-white/60'}">
        {badge.unlocked ? `Earned on: ${badge.earnedDate}` : `Hint: ${badge.hint}`}
      </p>
    </div>
  ))}
</div>
```

**Badge Tile Styling**:
- Unlocked: Full color icon, soft purple glow, checkmark badge
- Locked: Grayscale/dimmed icon, lock icon badge
- Hover: Enhanced glow effect

**Bottom Right Button**:
```html
<div class="flex justify-end">
  <button class="text-white/70 text-xs underline hover:text-white transition" id="viewBadgeRulesBtn">
    View all badge rules
  </button>
</div>
```

**Badge Rules Handler** (Placeholder):
```javascript
document.getElementById('viewBadgeRulesBtn')?.addEventListener('click', () => {
  alert('Badge rules will be available soon! 🏆');
  // Future: Open modal or navigate to badge rules page
});
```

---

## Data Flow & Mock Behavior

### Dashboard Services Functions

#### `getParentChildren(parentId)`
- Returns array of children linked to parent
- Uses Supabase `get_parent_children()` helper function if available
- Fallback to mock data if Supabase unavailable
- Caches results in component state
- Returns: `Array<{id, first_name, username, age, avatar_url, grade_level, created_at}>`

#### `getChildProgressSummary(childId)`
- Aggregates progress data for single child:
  - Story progress from `story_progress` table or localStorage
  - Chat session count from `chat_sessions` table or localStorage
  - Total panels viewed
  - Completion percentages
- Returns: `{stories_completed, stories_in_progress, total_panels_viewed, chat_sessions_count, topics_explored, total_learning_minutes, last_activity_at}`

#### `getAllChildrenProgressSummary(parentId)`
- Aggregates progress across all children
- Calls `getChildProgressSummary()` for each child
- Returns combined metrics for dashboard cards

#### `getChildStoryProgress(childId)`
- Returns detailed story-by-story progress
- Includes: storyId, title, panelsCompleted, totalPanels, lastViewedAt, completedAt
- Source: `story_progress` table or localStorage (`sqh_story_progress_v1`)
- Returns: `Array<{story_id, story_title, panels_completed, total_panels, is_completed, completed_at, last_viewed_at}>`

#### `getChildChatSessions(childId)`
- Returns chat session history for child
- Includes: sessionId, topicId, topicName, messageCount, createdAt, lastMessageAt
- Source: `chat_sessions` table or localStorage transcripts (`sqh_chat_transcripts_v1`)
- Returns: `Array<{session_id, topic_id, topic_name, message_count, created_at, last_message_at}>`

#### `getRecentActivity(parentId, limit = 10)`
- Returns recent activities across all children:
  - Story completions
  - Chat session starts
  - Panel views
- Sorted by timestamp (most recent first)
- Pulls from analytics queue and progress storage

#### `getChildLearningActivity(childId, days = 7)`
- Returns activity data for charts (last 7 days)
- Includes: date, session_count (story views + chat sessions)
- Used for Overview tab line chart

#### `getChildTopicsExplored(childId)`
- Returns topics explored with engagement counts
- Includes: topicId, topicName, storyCount, chatCount, totalEngagement
- Used for Overview tab bar chart

#### `getChildQuizPerformance(childId)`
- Returns quiz performance data (mock for now)
- Includes: topicId, topicName, attempts, bestScore, averageScore, lastAttempt
- Used for Quizzes tab

#### `getChildBadges(childId)`
- Returns badges for child (mock for now, Phase 4 will implement)
- Includes: badgeId, name, icon, unlocked, earnedDate, hint
- Used for Curiosity Badges section

#### `calculateChildStatus(childId)`
- Determines "On Track" vs "Needs Attention"
- Logic:
  - "On Track": Recent activity (within 7 days) AND (at least 1 story completed OR 1 chat session)
  - "Needs Attention": No recent activity (>7 days) OR no progress at all

#### `logDashboardEvent(eventType, payload)`
- Queues analytics events to shared queue
- Events: `dashboard_viewed`, `parent_child_switch`, `child_progress_viewed`, `progress_tab_switched`, `badge_viewed`
- Future: Edge function or Supabase insert

---

## Mock Data Structure

### `mockDashboardData.json`

```json
{
  "children": [
    {
      "id": "child-1",
      "first_name": "Emma",
      "username": "emma_explorer",
      "age": 8,
      "avatar_url": "/images/avatars/Stella.png",
      "grade_level": "3rd Grade",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "child-2",
      "first_name": "Lucas",
      "username": "lucas_curious",
      "age": 10,
      "avatar_url": "/images/avatars/Max.png",
      "grade_level": "5th Grade",
      "created_at": "2025-01-10T14:30:00Z"
    }
  ],
  "progress_summaries": {
    "child-1": {
      "stories_completed": 2,
      "stories_in_progress": 1,
      "total_panels_viewed": 18,
      "chat_sessions_count": 5,
      "topics_explored": 4,
      "total_learning_minutes": 45,
      "last_activity_at": "2025-01-20T14:30:00Z"
    },
    "child-2": {
      "stories_completed": 1,
      "stories_in_progress": 2,
      "total_panels_viewed": 12,
      "chat_sessions_count": 3,
      "topics_explored": 3,
      "total_learning_minutes": 30,
      "last_activity_at": "2025-01-19T10:15:00Z"
    }
  },
  "story_progress": {
    "child-1": [
      {
        "story_id": "mystery-moon",
        "story_title": "Mystery of the Moon",
        "panels_completed": 6,
        "total_panels": 6,
        "is_completed": true,
        "completed_at": "2025-01-19T16:00:00Z",
        "last_viewed_at": "2025-01-19T16:00:00Z",
        "topic_tag": "Space"
      },
      {
        "story_id": "photosynthesis-adventure",
        "story_title": "Photosynthesis Adventure",
        "panels_completed": 3,
        "total_panels": 6,
        "is_completed": false,
        "completed_at": null,
        "last_viewed_at": "2025-01-20T14:00:00Z",
        "topic_tag": "Photosynthesis"
      }
    ]
  },
  "chat_sessions": {
    "child-1": [
      {
        "session_id": "chat_session_1",
        "topic_id": "moon-physics",
        "topic_name": "Moon & Gravity",
        "message_count": 8,
        "created_at": "2025-01-20T14:00:00Z",
        "last_message_at": "2025-01-20T14:25:00Z"
      },
      {
        "session_id": "chat_session_2",
        "topic_id": "photosynthesis",
        "topic_name": "Photosynthesis",
        "message_count": 12,
        "created_at": "2025-01-19T10:00:00Z",
        "last_message_at": "2025-01-19T10:30:00Z"
      }
    ]
  },
  "learning_activity": {
    "child-1": {
      "last_7_days": [
        {"date": "2025-01-14", "session_count": 2},
        {"date": "2025-01-15", "session_count": 0},
        {"date": "2025-01-16", "session_count": 1},
        {"date": "2025-01-17", "session_count": 3},
        {"date": "2025-01-18", "session_count": 2},
        {"date": "2025-01-19", "session_count": 4},
        {"date": "2025-01-20", "session_count": 2}
      ]
    }
  },
  "topics_explored": {
    "child-1": [
      {"topic_id": "moon-physics", "topic_name": "Moon & Gravity", "story_count": 1, "chat_count": 2, "total_engagement": 3},
      {"topic_id": "photosynthesis", "topic_name": "Photosynthesis", "story_count": 1, "chat_count": 1, "total_engagement": 2},
      {"topic_id": "ocean-life", "topic_name": "Ocean Life", "story_count": 0, "chat_count": 2, "total_engagement": 2},
      {"topic_id": "solar-system", "topic_name": "Solar System", "story_count": 0, "chat_count": 1, "total_engagement": 1}
    ]
  },
  "quiz_performance": {
    "child-1": [
      {
        "topic_id": "moon-physics",
        "topic_name": "Moon & Gravity",
        "attempts": 2,
        "best_score": 90,
        "average_score": 85,
        "last_attempt": "2025-01-18T12:00:00Z"
      },
      {
        "topic_id": "photosynthesis",
        "topic_name": "Photosynthesis",
        "attempts": 1,
        "best_score": 80,
        "average_score": 80,
        "last_attempt": "2025-01-16T15:30:00Z"
      }
    ]
  },
  "badges": {
    "child-1": [
      {
        "badge_id": "first-question",
        "name": "First Curious Question",
        "icon": "💭",
        "unlocked": true,
        "earned_date": "2025-01-15T10:30:00Z",
        "hint": null
      },
      {
        "badge_id": "photosynthesis-explorer",
        "name": "Photosynthesis Explorer",
        "icon": "🌿",
        "unlocked": true,
        "earned_date": "2025-01-19T14:00:00Z",
        "hint": null
      },
      {
        "badge_id": "quiz-hero",
        "name": "Quiz Hero (80%+)",
        "icon": "🏆",
        "unlocked": false,
        "earned_date": null,
        "hint": "Score 80% or higher on 3 quizzes"
      },
      {
        "badge_id": "chat-streak",
        "name": "Chat Streak",
        "icon": "🔥",
        "unlocked": false,
        "earned_date": null,
        "hint": "Ask questions in chat for 5 days in a row"
      },
      {
        "badge_id": "story-completer",
        "name": "Story Completer",
        "icon": "📚",
        "unlocked": false,
        "earned_date": null,
        "hint": "Complete your first science story"
      }
    ]
  },
  "recent_activity": [
    {
      "type": "chat_started",
      "child_id": "child-1",
      "child_name": "Emma",
      "topic_id": "moon-physics",
      "topic_name": "Moon & Gravity",
      "timestamp": "2025-01-20T14:00:00Z"
    },
    {
      "type": "story_completed",
      "child_id": "child-1",
      "child_name": "Emma",
      "story_id": "mystery-moon",
      "story_title": "Mystery of the Moon",
      "timestamp": "2025-01-19T16:00:00Z"
    },
    {
      "type": "story_viewed",
      "child_id": "child-2",
      "child_name": "Lucas",
      "story_id": "photosynthesis-adventure",
      "story_title": "Photosynthesis Adventure",
      "timestamp": "2025-01-19T10:15:00Z"
    }
  ]
}
```

---

## State Management

### Dashboard State
```javascript
{
  parentId: string,
  children: Array<{
    id, first_name, username, age, avatar_url, grade_level, created_at
  }>,
  selectedChildId: string | null,  // null = empty state
  progressSummary: {
    stories_completed: number,
    stories_in_progress: number,
    chat_sessions_count: number,
    topics_explored: number,
    total_learning_minutes: number,
    last_activity_at: timestamp
  },
  storyProgress: Array<StoryProgress>,
  chatSessions: Array<ChatSession>,
  learningActivity: Array<DailyActivity>,
  topicsExplored: Array<TopicData>,
  quizPerformance: Array<QuizData>,
  badges: Array<BadgeData>,
  recentActivity: Array<Activity>,
  isLoading: boolean,
  lastRefreshedAt: timestamp
}
```

### Persistence
- Selected child: `localStorage.getItem('sqh_dashboard_selected_child')`
- Analytics: `localStorage.getItem('sqh_analytics_queue_v1')` (shared)
- Progress data: Aggregated from `sqh_story_progress_v1` and `sqh_chat_transcripts_v1`

---

## Responsive Layout

### Desktop (> 768px)
- Two-column layout (30% / 70%)
- Charts side-by-side in Overview tab
- Badge tiles horizontal scroll
- Table with full columns

### Tablet/Mobile (< 768px)
- Stacked layout (left column above right column)
- Full-width charts
- Badge tiles wrap to multiple rows
- Table scrollable horizontally

### Breakpoints
- `md:` prefix for tablet+ (768px+)
- Mobile-first approach

---

## Component Architecture

### Main Components

#### `<ParentDashboard />` (Main Container)
- Manages overall dashboard state
- Handles child selection
- Coordinates data fetching
- Renders left and right columns

#### `<ChildList />` (Left Column)
- Renders "Your Young Heroes" title
- Maps children to `<ChildCard />` components
- Handles card click → set selected child

#### `<ChildCard />` (Individual Child)
- Displays avatar, name, grade/age
- Shows stats line (Stories X · Quizzes Y)
- Renders status pill
- "View Progress" button

#### `<ChildDetail />` (Right Column)
- Empty state when no child selected
- Header row with avatar, name, activity
- Learning Snapshot cards
- `<StudentProgressSection />` component
- `<StudentBadgesSection />` component

#### `<StudentProgressSection />` (Progress Tabs)
- Tab navigation (Overview, Stories, Quizzes)
- Tab content rendering
- Chart rendering (line, bar)
- Progress bars and tables

#### `<StudentBadgesSection />` (Badges)
- Badge summary text
- Badge tiles rendering
- Locked/unlocked styling
- "View all badge rules" button

---

## Integration with Existing Features

### Comic Viewer Integration
- Reads progress from `stories/story-services.js`
- Uses `getStoryProgressSummary(childId)` for child progress
- Aggregates `lastPanelIndex` data from localStorage
- Extracts topic tags from story metadata

### Topic Chat AI Integration
- Reads chat sessions from `chat/chat-services.js`
- Uses `loadTranscript(sessionId)` patterns to count sessions
- Aggregates chat activity from localStorage transcripts
- Extracts topic names from chat metadata

### Authentication Integration
- Uses existing `dashboards/dashboard.js` auth check
- Gets parent ID from session via `user_profiles`
- Leverages `parent_id` relationship for child queries

---

## Testing Checklist

### Setup
- [ ] Dev server running (`npm run dev`)
- [ ] Feature flag `VITE_USE_DASHBOARD_MOCKS=true` (or default)
- [ ] Browser DevTools open (F12)
- [ ] Parent account logged in

### Navigation
- [ ] Navigate to `/parent/dashboard`
- [ ] Dashboard loads without errors
- [ ] Global header visible (same as Comic Viewer/Chat)
- [ ] Global footer visible (same as Comic Viewer/Chat)
- [ ] Logout button functional (desktop)
- [ ] Logout button functional (mobile)

### Left Column - Children List
- [ ] "Your Young Heroes" title displays
- [ ] Child cards render from mock data
- [ ] Each card shows: avatar, name, grade/age, stats, status pill, button
- [ ] Status pills show "On Track" or "Needs Attention" correctly
- [ ] Click "View Progress" → right column updates
- [ ] Selected card has highlight border

### Right Column - Empty State
- [ ] Empty state shows when no child selected
- [ ] Message: "Select a hero on the left to see their progress."

### Right Column - Selected Child Detail
- [ ] Header row shows avatar, name, last active, current topic
- [ ] Learning Snapshot cards display (Stories, Quizzes, Chat, Streak)
- [ ] Card values are correct from mock data

### Learning Progress Section
- [ ] Tab navigation works (Overview, Stories, Quizzes)
- [ ] Active tab has gradient background
- [ ] Overview tab: Two charts display (line, bar)
- [ ] Overview tab: Summary sentence displays
- [ ] Stories tab: Topic progress rows display
- [ ] Stories tab: Progress bars show percentages
- [ ] Quizzes tab: Bar chart displays
- [ ] Quizzes tab: Table displays with columns

### Curiosity Badges Section
- [ ] Summary text displays: "X has unlocked Y of Z badges"
- [ ] Badge tiles render (locked and unlocked)
- [ ] Unlocked badges have full color and checkmark
- [ ] Locked badges have grayscale and lock icon
- [ ] Hints display for locked badges
- [ ] "View all badge rules" button functional (placeholder alert)

### Mock Mode
- [ ] Mock data loads when flag enabled
- [ ] Dashboard functional without Supabase
- [ ] Analytics events queue correctly
- [ ] No console errors

### Design Consistency
- [ ] Colors match Comic Viewer/Chat (purple-pink gradients)
- [ ] Typography matches (font-fredoka, Inter)
- [ ] Glassmorphism effects consistent
- [ ] No plain white backgrounds
- [ ] Purple glow shadows on cards

### Responsive
- [ ] Two-column layout on desktop
- [ ] Stacked layout on mobile
- [ ] Charts resize correctly
- [ ] Badge tiles wrap on mobile
- [ ] Table scrollable on mobile

---

## Future Database Integration Notes

All Supabase schema, tables, policies, and migrations will be created in a dedicated "Database Finalization Phase" after UI flows are complete.

### Tables to Create
- `story_progress` - Story completion tracking (child_id, story_id, last_panel_index, completed_at, updated_at)
- `chat_sessions` - Chat session tracking (session_id, child_id, topic_id, message_count, created_at, updated_at)
- `quiz_results` - Quiz performance (child_id, topic_id, score, attempts, best_score, last_attempt)
- `earned_badges` - Badge achievements (for Phase 4)

### RLS Policies
- Parents can only view their own children's progress
- Parents can only view progress for children linked via `parent_id`
- No cross-family data access

### Edge Functions (Future)
- `aggregate_child_progress` - Secure progress aggregation
- `get_parent_dashboard_data` - Combined dashboard query
- Analytics logging endpoint

### Migration Strategy
- Mock data structure matches future schema
- Service functions already stubbed for Supabase
- Feature flag allows gradual migration
- No breaking changes to UI when switching

---

## Known Limitations (Current Phase)

- [ ] No real-time updates (requires refresh)
- [ ] Badge unlocking logic placeholder (Phase 4)
- [ ] Quiz data is mock only (no quiz system yet)
- [ ] No data visualization charts implementation (placeholder areas)
- [ ] No export/print functionality
- [ ] Individual child detail view not included (future enhancement)
- [ ] Settings page not included (future enhancement)

---

## Files to Create/Modify

### New Files
- `parent/dashboard.html` - Main dashboard page (two-column layout)
- `parent/dashboard.js` - Dashboard UI logic and state management
- `parent/dashboard-services.js` - Data aggregation and Supabase/mock logic
- `parent/mockDashboardData.json` - Sample dashboard data

### Modified Files
- `vite.config.js` - Add route rewrite and build input for `/parent/dashboard`
- `dashboards/dashboard.js` - Minimal changes (auth check, profile loading - already exists)

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_USE_DASHBOARD_MOCKS` | `'true'` | Enable/disable mock mode |
| `VITE_EDGE_ANALYTICS_URL` | `''` | Optional edge function for analytics |
| `VITE_SUPABASE_URL` | - | Supabase project URL (future) |
| `VITE_SUPABASE_ANON_KEY` | - | Supabase anonymous key (future) |

---

## Success Criteria

- [ ] Parent can view dashboard with mock data
- [ ] Child selector functional (switches between children)
- [ ] Progress cards display aggregated metrics
- [ ] Learning Progress tabs work (Overview, Stories, Quizzes)
- [ ] Curiosity Badges section displays (locked and unlocked)
- [ ] Analytics events queue correctly
- [ ] Design matches Comic Viewer/Chat (child-friendly colors)
- [ ] Mock mode works without Supabase
- [ ] Global header, footer, and logout button present and functional
- [ ] No console errors
- [ ] Responsive layout works on mobile

---

**End of Implementation Plan**



