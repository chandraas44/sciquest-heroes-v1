# Comic Viewer Scaffold Overview

This README documents the routes, structure, data flow, and current completion status of the Comic Viewer feature scaffold.

## Routes & Entry Files

| Route | Purpose | Entry File |
|-------|---------|------------|
| `/stories` | Story list (cards, resume states) | `stories/index.html` → `stories/stories-list.js` |
| `/stories/story.html?storyId=...` | Story detail with metadata & CTAs | `stories/story.html` → `stories/story-detail.js` |
| `/stories/reader.html?storyId=...&panel=n` | Panel-by-panel comic viewer | `stories/reader.html` → `stories/story-viewer.js` |
| `/chat/index.html?topicId=...` | Placeholder topic chat target | `chat/index.html` |

Landing page (`index.html`) now links directly to `/stories`, and `vite.config.js` registers the new HTML entry points (`storiesHub`, `storyDetail`, `storyReader`, `chat`).

## Directory Structure

```
stories/
├─ index.html
├─ story.html
├─ reader.html
├─ stories-list.js
├─ story-detail.js
├─ story-viewer.js
├─ story-services.js      # Supabase + mock data + analytics helper
└─ mockStories.json       # sample story + panel data

chat/
└─ index.html             # placeholder for topic-specific chat
```

## Navigation Flow

1. `index.html` CTA → `/stories/index.html`
2. Story card button → `/stories/story.html?storyId=<id>`
3. Start/Resume → `/stories/reader.html?storyId=<id>&panel=<n>`
4. Panel CTA → `/chat/index.html?topicId=<topic>&storyRef=<id>&panelId=<panel>`

## Query Parameters

- `story.html` requires `storyId`
- `reader.html` requires `storyId`, optional `panel` (default resume index)
- `chat/index.html` reads `topicId`, `storyRef`, `panelId` for context display

## Responsibilities by File

| Concern | File |
|---------|------|
| Story metadata loading | `stories/story-services.js` (`getStoryList`, `getStoryById`) |
| Panel loading | `stories/story-services.js` (`getPanelsForStory`), consumed by `story-viewer.js` |
| Progress persistence | `stories/story-services.js` (`getStoryProgressSummary`, `saveStoryProgress`) using localStorage + optional Supabase `story_progress` |
| Analytics queueing | `stories/story-services.js` (`logAnalyticsEvent`, queue helpers, optional edge POST) |
| CTA to chat | `stories/story-viewer.js` (`chatCtaBtn.onclick`) and `stories/story-detail.js` (`openChatBtn`) |

## Config & Env Variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (existing)
- `VITE_EDGE_ANALYTICS_URL` (optional, for edge logging)
- `VITE_USE_STORY_MOCKS` (defaults to `'true'`; toggles mock dataset)

## Supabase Touchpoints

- Table `stories` (metadata + `panels` JSON column)
- Table `story_progress` (upserted progress)
- Table `analytics_events` (lightweight logging)
- Edge function (optional) for analytics/event logging; falls back to direct insert
- When Supabase unavailable or mocks enabled, the app uses `mockStories.json` and local storage only.

## Completion Checklist

| Item | Status |
|------|--------|
| Routes + Vite inputs for stories/chat | ✅ |
| Story list/detail/reader UIs with Tailwind styling | ✅ |
| Mock data pipeline + Supabase fallback | ✅ |
| Local progress persistence + resume flow | ✅ |
| Analytics helper with offline queueing | ✅ |
| CTA links to chat placeholder with context | ✅ |
| Chat AI experience | ⏳ future phase |
| Badge triggers, parent dashboard integration | ⏳ future phase |
| Supabase tables/edge functions provisioned in prod | ⏳ follow-up |



