# Complete Codebase Analysis - SciQuest Heroes

**Analysis Date:** 2025-01-27  
**Project:** SciQuest Heroes - AI-Powered Science Education Platform  
**Status:** Comprehensive Analysis Complete

---

## 📋 EXECUTIVE SUMMARY

SciQuest Heroes is an AI-powered educational platform that personalizes science learning for children (ages 5-12) through interactive stories, AI chat, quizzes, and gamification. The platform uses a mock-first architecture with Supabase backend, supporting both authenticated and guest experiences.

### Key Technology Stack
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN)
- **Build Tool:** Vite 7.2.4
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **AI Integration:** n8n workflows for chat responses
- **Architecture:** Mock-first with graceful fallbacks

---

## 🏗️ PROJECT STRUCTURE

### Root Directory
```
sciquest-heroes-v1/
├── auth/                 # Authentication system
├── badges/              # Badge/gamification system
├── chat/                # AI chat interface
├── components/          # Shared components (nav)
├── dashboards/          # Student dashboard (legacy)
├── parent/              # Parent dashboard (new)
├── quizzes/             # Quiz system (3 levels)
├── stories/             # Story viewer system
├── shared/              # Shared utilities
├── supabase/            # Database migrations
├── docs/                # Documentation
├── images/              # Static assets
├── assets/              # Avatar assets
└── dist/                # Production build output
```

---

## 🔐 AUTHENTICATION SYSTEM

### Flow
1. **Account Type Selection** (`auth/account-type-selection.html`)
   - Choose: Student, Parent, or Teacher
   - Stores selection in localStorage

2. **Authentication** (`auth/auth.html` + `auth/auth.js`)
   - Unified login/signup interface
   - Email/password authentication
   - Google OAuth (optional, hidden for students)
   - Password reset functionality
   - Mode toggle (login ↔ signup)

3. **Student Signup** (`auth/student-signup.html`)
   - Additional step for students
   - Collects grade level, child name
   - Links to avatar selection

4. **Avatar Selection** (`avatar-selection.html`)
   - Select character avatar
   - Stores avatar URL in profile

### Key Files
- `auth/auth.js` - Main authentication logic (600 lines)
- `auth/student-signup.js` - Student-specific signup flow
- `config.js` - Supabase configuration

### Database Table: `user_profiles`
- Links to `auth.users` (Supabase built-in)
- Stores: email, account_type, grade_level, avatar_url, parent_id
- Parent-child relationships via `parent_id`

---

## 📚 STORIES SYSTEM

### Architecture

**Three-Tier Navigation:**
1. **Story List** (`stories/index.html` + `stories-list.js`)
   - Grid of story cards
   - Shows progress (completed, in-progress, new)
   - Filter by topic

2. **Story Detail** (`stories/story.html` + `story-detail.js`)
   - Story metadata display
   - "Start Story" or "Resume" button
   - Links to story reader

3. **Story Reader** (`stories/reader.html` + `story-viewer.js`)
   - Panel-by-panel comic viewer
   - Personalized narration (name replacement)
   - Voice narration (browser TTS)
   - Progress tracking
   - Glossary terms
   - Chat CTA buttons

### Key Features

**Personalization:**
- Child's name replaces "Child:" in narration
- Dynamic name fetching from user profile
- Name appears in dialogue and narration

**Voice Narration:**
- Browser Text-to-Speech (TTS) API
- Natural voice selection (prioritizes neural voices)
- Name included in narration text
- Expressive TTS with pauses and emphasis

**Progress Tracking:**
- Panel-by-panel progress saved
- Resume from last viewed panel
- Completion tracking
- Stored in localStorage + Supabase

**Data Structure:**
```javascript
{
  id: "photosynthesis-adventure",
  title: "Photosynthesis Adventure",
  panels: [
    {
      panelId: "panel-01",
      imageUrl: "/images/L1P1Photosynthesis.png",
      narration: "Mr. Chloro: \"Ready?\" Child: \"Yes!\"",
      glossaryTerms: ["leaf", "plant"],
      chatTopicId: "photosynthesis",
      ctaLabel: "Ask about photosynthesis"
    }
  ]
}
```

### Key Files
- `stories/story-services.js` - Story data layer (mock + Supabase)
- `stories/story-viewer.js` - Reader UI and logic (2378 lines)
- `stories/mockStories.json` - Mock story data
- `stories/quiz-routing.js` - Quiz routing based on story topic

### Database Tables
- `stories` - Story metadata + panels JSON
- `story_progress` - User progress tracking

---

## 💬 CHAT SYSTEM (AI-Powered)

### Architecture

**Two-Tier Interface:**
1. **Chat Lobby** (`chat/index.html`)
   - Topic picker (cards)
   - Shows available science topics
   - "Start Chat" buttons

2. **Chat Session** (`chat/index.html?topicId=...`)
   - Message interface
   - AI response display
   - Context awareness (story references)
   - Quick prompts
   - Grade-level adaptation

### AI Integration

**n8n Workflow:**
- Webhook URL: `VITE_N8N_CHAT_URL`
- Payload includes: topic, grade_level, chat_history, context
- Fallback chain: n8n → Supabase RPC → Mock data

**Grade-Level Adaptation:**
- Grade level sent in every request
- AI adjusts response complexity
- Vocabulary matches age group

**Context Awareness:**
- Story references passed to chat
- Panel context included
- Continuity between story and chat

### Key Files
- `chat/chat-services.js` - Chat data layer + n8n integration
- `chat/chat-session.js` - Chat UI and message handling
- `chat/mockChatData.json` - Mock chat topics and responses

### Database Tables
- `topics` - Available chat topics
- `chat_sessions` - Chat session tracking
- `chat_messages` - Individual messages

---

## 🏆 BADGE SYSTEM (Gamification)

### Architecture

**Event-Driven Badge Evaluation:**
- Badges awarded in real-time (<100ms)
- No polling required
- Event triggers: story_completed, chat_message, quiz_completed

**Badge Types:**
- **First Curious Question** - First chat message
- **Story Master** - 5 stories completed
- **Topic Explorer** - Topic-specific completion
- **Quiz Hero** - 80%+ quiz score
- **Streak Star** - Learning streaks

**Badge Display:**
- Child-facing gallery (`badges/badges.html`)
- Parent dashboard integration
- Progress indicators for locked badges
- Celebration animations

### Rule Engine

**Evaluation Logic:**
```javascript
{
  trigger: { type: "story_completed" },
  evaluation: { 
    type: "count", 
    source: "story_progress",
    threshold: 5 
  }
}
```

**Evaluation Flow:**
1. User action triggers event
2. Badge engine loads rules
3. Evaluates rules against user activity
4. Awards badge if conditions met
5. Shows celebration animation
6. Saves to localStorage + Supabase

### Key Files
- `badges/badge-services.js` - Badge catalog, rules, evaluation
- `badges/badges.js` - Badge gallery UI
- `badges/badge-rules.json` - Badge rule definitions
- `badges/mockBadgeData.json` - Mock badge catalog
- `shared/badge-celebration.js` - Celebration animations

### Database Tables
- `badges` - Badge catalog
- `badge_rules` - Earning rules
- `badge_awards` - Awarded badges

---

## 📝 QUIZ SYSTEM

### Architecture

**Grade-Level Adaptive Routing:**
- Automatic routing based on user's grade_level
- Three difficulty levels:
  - **Beginner** (K-2)
  - **Intermediate** (3-4)
  - **Advanced** (5-6)

**Quiz Structure:**
- 10 questions per quiz
- 4 multiple-choice options
- Immediate feedback after submission
- Answer key display
- Score saved to database

**Current Topics:**
- Photosynthesis (beginner/intermediate/advanced versions)

### Routing Logic

**File:** `quiz-handler.js`, `stories/quiz-routing.js`
```javascript
determineQuizLevel(gradeLevel) {
  if (grade <= 2) return 'beginner';
  if (grade <= 4) return 'intermediate';
  return 'advanced';
}
```

**Quiz Files:**
- `quizzes/photosynthesis-quiz-beginner.html`
- `quizzes/photosynthesis-quiz-intermediate.html`
- `quizzes/photosynthesis-quiz-advanced.html`

### Key Features
- Inline quiz logic (no separate JS file)
- Grade-level automatic routing
- Results saved to `quiz_results` table
- Parent dashboard integration

### Database Table
- `quiz_results` - Quiz attempts and scores

---

## 📊 DASHBOARD SYSTEMS

### Student Dashboard (`dashboards/student-dashboard.html`)

**Features:**
- Welcome message with child's name
- Avatar display
- Quick access to Stories, Chat, Badges
- Quiz cards with grade-level routing
- User menu dropdown
- Logout functionality

**File:** `dashboards/student-dashboard.js`
- Authentication check
- Profile loading
- Quiz navigation setup

### Parent Dashboard (`parent/dashboard.html`)

**Architecture:**
- Two-column layout
- Left: Children list (sticky sidebar)
- Right: Selected child's progress details

**Tabs:**
1. **Overview** - Learning snapshot, activity timeline
2. **Stories** - Story-by-story progress
3. **Quizzes** - Quiz performance
4. **Chat** - Chat activity history
5. **Badges** - Badge collection and progress

**Key Files:**
- `parent/dashboard.js` - Dashboard UI logic
- `parent/dashboard-services.js` - Data aggregation (630 lines)

**Progress Aggregation:**
- Stories completed/in-progress
- Quiz scores and attempts
- Chat session counts
- Badge awards
- Learning streaks
- Activity timelines

### Database Queries
- Uses `get_parent_children()` RPC function
- Aggregates from multiple tables:
  - `story_progress`
  - `quiz_attempts` / `quiz_results`
  - `chat_messages`
  - `badge_awards`

---

## 🧭 NAVIGATION & ROUTING

### Shared Navigation Component

**File:** `components/nav.js` + `components/nav.html`

**Features:**
- Dynamically loaded navigation
- Context-aware links (authenticated vs public)
- User menu dropdown (authenticated)
- Mobile-responsive
- Active page highlighting

**Navigation Links:**
- Stories
- Chat
- Badges (for students)
- Dashboard links

### Route Rewriting (Vite Config)

**Clean URLs:**
- `/stories/{storyId}/read` → `/stories/reader.html?storyId={id}`
- `/parent/dashboard` → `/parent/dashboard.html`
- `/chat` → `/chat/index.html`
- `/stories` → `/stories/index.html`
- `/child/badges` → `/badges/badges.html`

**Implementation:** Custom Vite plugin with middleware

---

## 🗄️ DATABASE ARCHITECTURE

### Core Tables

1. **user_profiles**
   - User account information
   - Parent-child relationships
   - Grade levels, avatars

2. **stories**
   - Story metadata
   - Panels stored as JSON

3. **story_progress**
   - Panel-by-panel progress
   - Completion tracking

4. **topics**
   - Available chat topics

5. **chat_sessions**
   - Chat conversation sessions

6. **chat_messages**
   - Individual chat messages

7. **badges**
   - Badge catalog

8. **badge_rules**
   - Earning rule definitions

9. **badge_awards**
   - Awarded badges

10. **quiz_results**
    - Quiz attempts and scores

11. **analytics_events**
    - User activity tracking

### Relationships
```
auth.users (1:1) → user_profiles
user_profiles (1:many via parent_id) → user_profiles (children)
user_profiles → story_progress (many:many with stories)
user_profiles → badge_awards (many:many with badges)
user_profiles → chat_sessions (1:many)
user_profiles → quiz_results (1:many)
```

---

## 🔄 DATA FLOW PATTERNS

### Mock-First Architecture

**Pattern Used Throughout:**
```javascript
async function getData() {
  // 1. Check if should use mocks
  if (shouldUseMockData()) {
    return loadMockData();
  }
  
  // 2. Try Supabase
  const client = getSupabaseClient();
  if (!client) {
    return loadMockData(); // Fallback
  }
  
  try {
    const { data } = await client.from('table').select('*');
    return data;
  } catch (error) {
    return loadMockData(); // Graceful fallback
  }
}
```

### Analytics Queue System

**Shared Across Features:**
- localStorage key: `sqh_analytics_queue_v1`
- Queues events when offline
- Flushes to Supabase when online
- Edge function option (optional)

**Events Tracked:**
- Story views, completions
- Chat messages, sessions
- Badge awards
- Quiz attempts
- Panel views

### Progress Storage

**Dual Storage Strategy:**
1. **localStorage** (instant, offline)
   - Story progress: `sqh_story_progress_v1`
   - Chat transcripts: `sqh_chat_transcripts_v1`
   - Badge awards: `sqh_badge_awards_v1`
   - Analytics queue: `sqh_analytics_queue_v1`

2. **Supabase** (persistent, sync)
   - Same data structure
   - Syncs when online
   - Supports parent dashboard aggregation

---

## 🎨 UI/UX PATTERNS

### Design System

**Colors:**
- Primary gradient: Purple (#667eea) → Pink (#764ba2)
- Glassmorphism effects
- Purple glow shadows

**Typography:**
- Headings: Fredoka (fun, child-friendly)
- Body: Inter (readable)
- Special: Space Grotesk

**Components:**
- 3D card effects
- Floating particle animations
- Smooth scroll animations
- Responsive design (mobile-first)

### Shared Components

**Navigation (`components/nav.js`):**
- Context-aware
- Authentication-aware
- Dynamic link generation

**Badge Celebration (`shared/badge-celebration.js`):**
- Animated badge unlocks
- Sound effects (optional)
- Queue system for multiple badges

**Logo Handler (`shared/logo-handler.js`):**
- Logo click navigation
- Consistent branding

---

## 🔌 INTEGRATIONS

### Supabase Integration

**Services:**
- Authentication (email/password, OAuth ready)
- PostgreSQL database
- Storage (avatars, audio files)
- Real-time (ready, not yet used)

**Configuration:**
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Client created in each service file
- Graceful fallback if unavailable

### n8n Integration

**Purpose:** AI chat responses

**Configuration:**
- Environment variable: `VITE_N8N_CHAT_URL`
- Webhook endpoint
- Payload format defined in `chat/chat-services.js`

**Fallback Chain:**
1. n8n webhook (if configured)
2. Supabase RPC function (if available)
3. Mock responses (always available)

### Browser APIs

**Text-to-Speech:**
- Native Web Speech API
- Voice selection logic
- Name pronunciation

**localStorage:**
- Offline data storage
- Analytics queueing
- Progress caching

---

## 🧪 TESTING

### Test Files

- `stories/quiz-routing.test.js` - Quiz routing logic tests
- `parent/dashboard-services.test.js` - Dashboard services tests
- `test/run-all-tests.js` - Test runner

### Testing Framework

**Vitest** configured in `vitest.config.js`
- Unit tests for services
- Mock data testing
- Integration test readiness

---

## 📦 BUILD & DEPLOYMENT

### Build Configuration

**Vite Config (`vite.config.js`):**
- Multi-page app (MPA) mode
- Route rewriting plugin
- Multiple HTML entry points
- Production build optimization

**Build Output:**
- `dist/` directory
- Asset optimization
- Code splitting by route

### Development Server

**Port:** 3000
**Features:**
- Hot Module Replacement (HMR)
- Route rewriting middleware
- Static asset serving
- Console log filtering

---

## 🔍 KEY FEATURES SUMMARY

### ✅ Fully Implemented

1. **Authentication System**
   - Multi-account types (Student, Parent, Teacher)
   - Email/password auth
   - Profile management
   - Parent-child linking

2. **Story System**
   - Story list, detail, reader
   - Personalized narration (name replacement)
   - Voice narration (TTS)
   - Progress tracking
   - Glossary integration

3. **Chat System**
   - Topic selection
   - AI-powered responses
   - Grade-level adaptation
   - Context awareness
   - n8n integration

4. **Badge System**
   - Event-driven evaluation
   - Real-time awards
   - Progress indicators
   - Celebration animations
   - Parent visibility

5. **Quiz System**
   - Grade-level routing
   - Three difficulty levels
   - Score tracking
   - Answer keys

6. **Dashboard Systems**
   - Student dashboard
   - Parent dashboard with progress aggregation
   - Activity timelines
   - Progress visualization

### 🚧 Partially Implemented / Planned

1. **AI Story Generation**
   - Infrastructure ready
   - Currently using curated content
   - Personalization layer exists
   - Ready for AI integration

2. **Grade-Level Story Adaptation**
   - Stories have reading levels
   - No dynamic vocabulary adjustment yet
   - Quizzes adapt, stories don't

3. **Real-Time Features**
   - Infrastructure ready
   - Not yet implemented
   - Parent notifications planned

---

## 🎯 ARCHITECTURAL PATTERNS

### 1. Mock-First Architecture
- Every feature works offline
- Graceful degradation
- Instant UI updates

### 2. Event-Driven Systems
- Badge evaluation
- Analytics queueing
- Real-time feedback

### 3. Service Layer Pattern
- Each feature has service file
- Consistent API across features
- Separation of concerns

### 4. Context Awareness
- Stories → Chat context passing
- Grade-level adaptation
- User profile integration

### 5. Dual Storage Strategy
- localStorage for speed
- Supabase for persistence
- Sync on connection

---

## 🔐 SECURITY CONSIDERATIONS

### Authentication
- Supabase Auth (secure by default)
- Session management
- Password hashing

### Data Isolation
- Row Level Security (RLS) ready
- User-specific data queries
- Parent-child relationship enforcement

### COPPA Compliance
- No third-party tracking
- Parent-controlled accounts
- Transparent data practices

---

## 📈 SCALABILITY CONSIDERATIONS

### Current Design
- Mock-first reduces server load
- Analytics queueing (batch processing)
- Local caching strategy

### Future Scaling
- Supabase handles database scaling
- n8n workflows can scale horizontally
- Edge functions ready
- CDN for static assets

---

## 🚀 DEPLOYMENT READINESS

### Production Build
- Vite optimizes builds
- Code splitting
- Asset optimization
- Environment variable support

### Environment Variables Needed
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_N8N_CHAT_URL` (optional)
- `VITE_EDGE_ANALYTICS_URL` (optional)
- Feature flags (USE_STORY_MOCKS, etc.)

---

## 📚 CODEBASE STATISTICS

### File Counts
- HTML files: ~46
- JavaScript files: ~54
- Database migrations: 7
- Documentation files: 51+

### Largest Files
- `stories/story-viewer.js` - 2378 lines (complex viewer logic)
- `parent/dashboard-services.js` - 630 lines (data aggregation)
- `auth/auth.js` - ~600 lines (authentication logic)
- `chat/chat-services.js` - ~777 lines (AI integration)

### Complexity Areas
- Story viewer (TTS, personalization, PDF generation)
- Dashboard services (multiple data source aggregation)
- Navigation component (context-aware routing)
- Chat services (fallback chains, n8n integration)

---

## 🎓 LEARNING POINTS

### What This Codebase Demonstrates
1. **Mock-First Development** - Offline-first architecture
2. **Progressive Enhancement** - Works without backend
3. **Event-Driven Design** - Real-time badge evaluation
4. **Context Awareness** - Stories and chat integration
5. **Grade Adaptation** - Age-appropriate content
6. **Personalization** - Name-based customization
7. **Gamification** - Badge system design
8. **Parent Transparency** - Complete visibility

---

## ✅ ANALYSIS COMPLETE

I have thoroughly analyzed the entire codebase. I understand:

- ✅ Authentication flow and user management
- ✅ Story system with personalization and voice
- ✅ Chat system with AI integration
- ✅ Badge/gamification system
- ✅ Quiz system with grade-level routing
- ✅ Dashboard systems (student & parent)
- ✅ Navigation and routing
- ✅ Database schema and relationships
- ✅ Mock-first architecture patterns
- ✅ Integration points (Supabase, n8n)
- ✅ Build and deployment setup

**Ready to work on your important feature!** 🚀

What feature would you like to implement?

