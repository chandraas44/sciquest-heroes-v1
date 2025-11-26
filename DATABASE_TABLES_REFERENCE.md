# SciQuest Heroes - Database Tables Reference

**Last Updated:** 2025-01-27  
**Database:** Supabase (PostgreSQL)

---

## 📊 Database Tables Overview

This document lists all database tables used in the SciQuest Heroes application, their structure, relationships, and usage.

---

## 🔐 Core Tables

### 1. `user_profiles`
**Purpose:** Extended user profile information beyond Supabase auth.users

**Schema:**
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('student', 'parent', 'teacher')),
  full_name text,
  first_name text,
  username text UNIQUE,
  child_name text,                    -- DEPRECATED: For parent accounts
  age integer CHECK (age IS NULL OR (age >= 5 AND age <= 12)),
  grade_level text,
  parent_email text,                  -- DEPRECATED: Use parent_id instead
  parent_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Key Features:**
- Links to Supabase `auth.users` via foreign key
- Supports three account types: student, parent, teacher
- Parent-child relationship via `parent_id` (1-to-many)
- Unique username constraint
- Age validation (5-12 for students)

**Indexes:**
- `idx_user_profiles_id` on `id`
- `idx_user_profiles_email` on `email`
- `idx_user_profiles_account_type` on `account_type`
- `idx_user_profiles_username` on `username`
- `idx_user_profiles_parent_email` on `parent_email`
- `idx_user_profiles_parent_id` on `parent_id`
- `idx_user_profiles_account_type_parent_id` on `(account_type, parent_id)`

**Helper Functions:**
- `get_children_count(parent_user_id uuid)` - Returns count of children for a parent
- `get_parent_children(parent_user_id uuid)` - Returns all children for a parent

**Views:**
- `parent_child_relationships` - View joining parents and their children

**Used In:**
- Authentication (`auth/auth.js`, `auth/student-signup.js`)
- Profile management (`profile.js`)
- Dashboard routing (`dashboards/dashboard.js`, `dashboards/student-dashboard.js`)
- Avatar selection (`avatar-selection.js`)
- Parent dashboard (`parent/dashboard-services.js`)

---

## 📚 Content Tables

### 2. `stories`
**Purpose:** Science story/comic content

**Schema (Inferred from code):**
```sql
CREATE TABLE stories (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  cover_url text,
  topic_tag text,
  reading_level text,
  estimated_time text,
  summary text,
  panels jsonb,                       -- Story panel data
  created_at timestamptz,
  updated_at timestamptz
);
```

**Used In:**
- `stories/story-services.js` - Story listing and retrieval
- Story reader functionality

**Key Operations:**
- List all stories
- Get story by ID
- Fetch story panels

---

### 3. `story_progress`
**Purpose:** Track student progress through stories

**Schema (Inferred from code):**
```sql
CREATE TABLE story_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  last_panel_index integer,
  completed boolean DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `stories/story-services.js` - Save/load story progress
- `parent/dashboard-services.js` - Aggregate child progress

**Key Operations:**
- Upsert progress (save current panel)
- Get progress by user and story
- Aggregate progress for parent dashboard

---

## 🏆 Badge System Tables

### 4. `badges`
**Purpose:** Badge definitions/catalog

**Schema (Inferred from code):**
```sql
CREATE TABLE badges (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon_url text,
  category text,
  created_at timestamptz
);
```

**Used In:**
- `badges/badge-services.js` - Badge catalog
- `parent/dashboard-services.js` - Display child badges

---

### 5. `badge_rules`
**Purpose:** Rules for earning badges

**Schema (Inferred from code):**
```sql
CREATE TABLE badge_rules (
  id uuid PRIMARY KEY,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  rule_type text,                      -- e.g., 'stories_read', 'quizzes_completed'
  threshold integer,                   -- Number required
  priority integer,
  created_at timestamptz
);
```

**Used In:**
- `badges/badge-services.js` - Badge rule evaluation

---

### 6. `badge_awards`
**Purpose:** Track which badges have been awarded to users

**Schema (Inferred from code):**
```sql
CREATE TABLE badge_awards (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `badges/badge-services.js` - Check awarded badges
- `parent/dashboard-services.js` - Display child achievements

**Key Operations:**
- Insert new badge award
- Get badges for a user
- Check if badge is unlocked

---

## 💬 Chat System Tables

### 7. `topics`
**Purpose:** Available chat topics for AI conversations

**Schema (Inferred from code):**
```sql
CREATE TABLE topics (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  created_at timestamptz
);
```

**Used In:**
- `chat/chat-services.js` - Topic listing

---

### 8. `chat_sessions`
**Purpose:** Track chat conversation sessions

**Schema (Inferred from code):**
```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `chat/chat-services.js` - Session management

---

### 9. `chat_messages`
**Purpose:** Individual chat messages in conversations

**Schema (Inferred from code):**
```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text,                           -- 'user' or 'assistant'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `chat/chat-services.js` - Message storage
- `parent/dashboard-services.js` - Aggregate chat activity

---

## 📝 Quiz System Tables

### 10. `quiz_attempts`
**Purpose:** Track quiz completion attempts

**Schema (Inferred from code):**
```sql
CREATE TABLE quiz_attempts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  quiz_id text,                        -- Quiz identifier
  score integer,
  total_questions integer,
  completed boolean DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `parent/dashboard-services.js` - Aggregate quiz progress

---

## 📊 Analytics Tables

### 11. `analytics_events`
**Purpose:** Track user analytics events

**Schema (Inferred from code):**
```sql
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,            -- e.g., 'story_viewed', 'badge_earned'
  payload jsonb,                       -- Event-specific data
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

**Used In:**
- `stories/story-services.js` - Story analytics
- `chat/chat-services.js` - Chat analytics
- `badges/badge-services.js` - Badge analytics
- `parent/dashboard-services.js` - Dashboard analytics

**Key Operations:**
- Insert analytics events
- Queue events to localStorage if Supabase unavailable
- Batch process queued events

---

## 🗄️ Storage Buckets (Supabase Storage)

### 12. `avatars` (Storage Bucket)
**Purpose:** Store user avatar images

**Used In:**
- `avatar-selection.js` - List and retrieve avatars

**Operations:**
- List avatar files
- Get public URL for avatar
- Upload avatar (future feature)

---

## 📋 Table Relationships Diagram

```
auth.users (Supabase built-in)
    ↓ (1:1)
user_profiles
    ↓ (1:many via parent_id)
user_profiles (children)
    ↓
    ├──→ story_progress (many:many with stories)
    ├──→ badge_awards (many:many with badges)
    ├──→ chat_sessions (1:many)
    ├──→ quiz_attempts (1:many)
    └──→ analytics_events (1:many)

stories (1:many)
    ↓
story_progress

badges (1:many)
    ↓
badge_awards

badge_rules (many:1)
    ↓
badges

topics (1:many)
    ↓
chat_sessions (1:many)
    ↓
chat_messages
```

---

## 🔍 Table Usage Summary

| Table | Primary Use Case | Key Files |
|-------|------------------|-----------|
| `user_profiles` | User authentication & profiles | `auth/*.js`, `profile.js`, `dashboards/*.js` |
| `stories` | Story content | `stories/story-services.js` |
| `story_progress` | Track reading progress | `stories/story-services.js`, `parent/dashboard-services.js` |
| `badges` | Badge definitions | `badges/badge-services.js` |
| `badge_rules` | Badge earning rules | `badges/badge-services.js` |
| `badge_awards` | Awarded badges | `badges/badge-services.js`, `parent/dashboard-services.js` |
| `topics` | Chat topics | `chat/chat-services.js` |
| `chat_sessions` | Chat sessions | `chat/chat-services.js` |
| `chat_messages` | Chat messages | `chat/chat-services.js`, `parent/dashboard-services.js` |
| `quiz_attempts` | Quiz progress | `parent/dashboard-services.js` |
| `analytics_events` | User analytics | All service files |

---

## 🔐 Security & RLS

**Current Status:**
- RLS (Row Level Security) is **disabled** on `user_profiles` table
- Other tables may have RLS enabled (check Supabase dashboard)

**Note:** The codebase includes migration files for RLS policies, but they may not be active. Check your Supabase project settings.

---

## 📝 Migration Files

All table creation and modification is handled via Supabase migrations:

1. `20251111193329_create_user_profiles_table.sql` - Initial user_profiles table
2. `20251111205437_extend_user_profiles_for_students.sql` - Extended user_profiles with student fields
3. `20251111222247_fix_rls_and_add_parent_child_relationship.sql` - Parent-child relationship

---

## 🚀 Next Steps

To see the actual schema in your Supabase project:
1. Go to Supabase Dashboard → Table Editor
2. Or run: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
3. Or check: `SELECT * FROM information_schema.columns WHERE table_name = 'user_profiles';`

---

**Document Generated:** 2025-01-27  
**For:** SciQuest Heroes v1

