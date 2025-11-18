# Feature Implementation Blueprints

This document extends the approved roadmap with implementation-ready notes for each major feature to keep engineering, design, and content aligned while we build.

## Comic Viewer with Panel Navigation (Phase 1)
- **Route coverage**: `/stories`, `/stories/:storyId`, `/stories/:storyId/read` delivered through `stories/index.html`, `stories/story.html`, and `stories/reader.html` with query-driven fallbacks for static hosting.
- **Data access**: `stories/story-services.js` centralizes Supabase + mock JSON fetching, local progress storage, analytics logging, and edge-function hooks. Mock data loads first (feature flag or missing Supabase config).
- **UI contracts**: `StoriesList`, `StoryDetail`, `ComicViewer`, `PanelProgressDots`, CTA button, offline banner, glossary dialog. Tailwind + existing design tokens keep visuals consistent.
- **State & persistence**: Local storage tracks `lastPanelIndex` per story with optional Supabase `story_progress` upserts. Panel switching persists progress and emits analytics events (`stories_list_viewed`, `story_viewer_opened`, `panel_viewed`, `story_completed`).
- **Analytics & edge functions**: Lightweight helper queues events locally, attempts edge function POST first, and falls back to Supabase inserts.
- **Chat CTA**: Each panel carries `chatTopicId` and CTA label; viewer deep-links to `/chat/:topicId` (currently placeholder) with context parameters for future AI prompts.
- **Mock toolkit**: `stories/mockStories.json` follows the approved schema so designers can iterate on copy/assets without backend dependencies.

## Topic-specific Chat AI with Safe Replies (Phase 2)
- **Routes**: `/chat` lobby plus `/chat/:topicId` session; temporary placeholder keeps deep links alive while AI stack is under construction.
- **UI**: Planned components include `ChatTopicPicker`, `ChatWindow` with bubble stack, quick prompt chips, safety banner, teacher/parent escalation CTA. Reuse `font-fredoka` and glassmorphism tokens for consistency.
- **Data & services**: Extend `story-services` or introduce `chat-services` to handle Supabase `chat_sessions`, topic metadata, and local mock transcripts. Supabase Edge Function proxies requests to AI provider with moderation and logging before responses reach the client.
- **Analytics**: Log `chat_started`, `message_sent`, `chat_escalated` via the same helper to keep telemetry consistent.
- **Mock support**: Provide scripted reply sets per topic stored alongside stories; fallback toggles let us demo chat without network calls.

## Parent Dashboard with Progress Visualization (Phase 3)
- **Routes**: `/dashboard` (summary), `/dashboard/child/:childId`, `/dashboard/settings`, `/dashboard/badges`. Existing dashboard shell can host new components.
- **UI blocks**: `ParentLayout` (role-aware nav), `ProgressOverview` cards, simple chart module (SVG or lightweight chart lib), `TopicControls`, alerts tray for new events, `BadgeSummary`.
- **Data sources**: Direct Supabase queries to `story_progress`, `chat_sessions`, and `earned_badges`. Edge function optional to aggregate metrics securely before returning to client. Mock mode supplies JSON snapshots for demos.
- **State handling**: Server-side filtering by child, client caching w/ revalidation when parents switch between kids. Row-level security policies enforced by Supabase.
- **Analytics**: Log `dashboard_viewed`, `parent_child_switch` for instrumentation.

## Curiosity Badges Linked to Milestones (Phase 4)
- **Routes & surfaces**: `/profile/badges` for kids, `/dashboard/badges` for parents, plus contextual overlays triggered inside viewer/chat when badges are earned.
- **Data model**: `badges` catalog (id, title, icon, trigger), `earned_badges` join table with `childId`, `storyId/chatSessionId`, `awardedAt`. Local cache mirrors `earned_badges` for quick UI reads.
- **Business logic**: Supabase Edge Function evaluates events (panel completion, chat streaks, diverse topics) and writes awards atomically, ensuring secure badge issuance. Local mock evaluator mirrors logic for offline demos.
- **UI**: `BadgeTray`, `BadgeDetailModal`, celebratory animation component, parent badge manager for visibility toggles.
- **Analytics**: Emit `badge_awarded`, `badge_viewed`, `badge_shared` for telemetry and future growth loops.

These blueprints ensure every phase stays aligned with the roadmap, highlight mock/data fallbacks, and document how edge functions plus lightweight analytics plug into each experience.

