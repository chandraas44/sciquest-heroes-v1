import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';
const USE_STORY_MOCKS = (import.meta.env?.VITE_USE_STORY_MOCKS ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const DEFAULT_CHILD_ID = 'guest-child';
const PROGRESS_STORAGE_KEY = 'sqh_story_progress_v1';
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

let supabaseClient = null;
let cachedMockStories = null;

function hasSupabaseConfig() {
  return Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabaseClient;
}

function shouldUseMockData() {
  if (USE_STORY_MOCKS) return true;
  return !hasSupabaseConfig();
}

async function loadMockStories() {
  if (cachedMockStories) return cachedMockStories;
  const res = await fetch(new URL('./mockStories.json', import.meta.url));
  if (!res.ok) {
    throw new Error('Unable to load mock story data');
  }
  const data = await res.json();
  cachedMockStories = data.stories || [];
  return cachedMockStories;
}

export async function getStoryList() {
  if (shouldUseMockData()) {
    return loadMockStories();
  }

  const client = getSupabaseClient();
  if (!client) {
    return loadMockStories();
  }

  try {
    const { data, error } = await client
      .from('stories')
      .select(`
        id,
        title,
        cover_url,
        topic_tag,
        reading_level,
        estimated_time,
        summary,
        user_id
      `)
      .order('title');

    if (error) throw error;

    return (data || []).map((story) => ({
      id: story.id,
      title: story.title,
      coverUrl: story.cover_url,
      topicTag: story.topic_tag,
      readingLevel: story.reading_level,
      estimatedTime: story.estimated_time,
      summary: story.summary,
      userId: story.user_id || null
    }));
  } catch (error) {
    console.warn('[stories] Supabase stories fetch failed, reverting to mock data', error);
    return loadMockStories();
  }
}

export async function getStoryById(storyId) {
  if (!storyId) throw new Error('storyId is required');
  if (shouldUseMockData()) {
    const stories = await loadMockStories();
    return stories.find((story) => story.id === storyId) || null;
  }

  const client = getSupabaseClient();
  if (!client) {
    const stories = await loadMockStories();
    return stories.find((story) => story.id === storyId) || null;
  }

  try {
    const { data, error } = await client
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .maybeSingle();

    if (error || !data) {
      throw error || new Error('missing story');
    }

    return {
      id: data.id,
      title: data.title,
      coverUrl: data.cover_url,
      topicTag: data.topic_tag,
      readingLevel: data.reading_level,
      estimatedTime: data.estimated_time,
      summary: data.summary,
      panels: data.panels,
      userId: data.user_id || null
    };
  } catch (error) {
    console.warn('[stories] Supabase story fetch failed, reverting to mock data', error);
    const stories = await loadMockStories();
    return stories.find((story) => story.id === storyId) || null;
  }
}

export async function getPanelsForStory(storyId) {
  const story = await getStoryById(storyId);
  return story?.panels || [];
}

/**
 * Fetch the latest generated comic for the current authenticated user and story.
 * Returns null if mock mode is enabled, Supabase is not configured, or no comic exists.
 */
export async function getLatestGeneratedComicForStory(storyId) {
  if (!storyId) throw new Error('storyId is required');
  if (shouldUseMockData()) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await client
      .from('generated_comics')
      .select('id, story_id, pdf_path, panel_count, panels_json, created_at')
      .eq('user_id', session.user.id)
      .eq('story_id', storyId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn('[stories] Failed to load latest generated comic', {
          error,
          storyId
        });
      } else {
        console.log('[stories] No generated comic found for story', { storyId });
      }
      return null;
    }

    console.log('[stories] Loaded latest generated comic', {
      storyId,
      comicId: data.id,
      panelCount: data.panel_count
    });

    return data;
  } catch (error) {
    console.warn('[stories] Unable to get latest generated comic', error);
    return null;
  }
}

/**
 * Fetch a specific generated comic by its ID.
 * Returns null if mock mode is enabled, Supabase is not configured, or the comic is missing.
 */
export async function getGeneratedComicById(comicId) {
  if (!comicId) throw new Error('comicId is required');
  if (shouldUseMockData()) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('generated_comics')
      .select('id, story_id, pdf_path, panel_count, panels_json, created_at')
      .eq('id', comicId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn('[stories] Failed to load generated comic by id', {
          error,
          comicId
        });
      } else {
        console.log('[stories] No generated comic found by id', { comicId });
      }
      return null;
    }

    console.log('[stories] Loaded generated comic by id', {
      comicId: data.id,
      storyId: data.story_id,
      panelCount: data.panel_count
    });

    return data;
  } catch (error) {
    console.warn('[stories] Unable to get generated comic by id', error);
    return null;
  }
}

/**
 * Fetch all generated comics for the current authenticated user.
 * Returns an array of rows from generated_comics (empty array on error or if none).
 */
export async function getUserGeneratedComics() {
  if (shouldUseMockData()) return [];

  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError || !session?.user?.id) {
      console.warn('[stories] No authenticated user for getUserGeneratedComics');
      return [];
    }

    const { data, error } = await client
      .from('generated_comics')
      .select('id, story_id, pdf_path, panel_count, panels_json, status, created_at')
      .eq('user_id', session.user.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[stories] Failed to load user generated comics', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('[stories] Unexpected error in getUserGeneratedComics', error);
    return [];
  }
}

/**
 * Call the generate-comic Edge Function to generate (or reuse) a comic for the given story.
 * Returns the function payload (including comicId, pdfPath, and panels) or throws on hard failure.
 */
export async function generateComicForStory(storyId) {
  if (!storyId) throw new Error('storyId is required');
  if (shouldUseMockData()) {
    // In mock mode we skip remote generation and let the viewer use static panels.
    console.log('[stories] Skipping generate-comic call in mock mode', { storyId });
    return null;
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured');
  }

  try {
    console.log('[stories] Invoking generate-comic function', { storyId });

    const { data, error } = await client.functions.invoke('generate-comic', {
      body: { storyId }
    });

    if (error) {
      console.warn('[stories] generate-comic function error', { error, storyId });
      throw error;
    }

    console.log('[stories] generate-comic function response', {
      storyId,
      hasData: Boolean(data),
      comicId: data?.comicId,
      reused: data?.reused
    });

    return data;
  } catch (error) {
    console.warn('[stories] Failed to invoke generate-comic function', {
      error,
      storyId
    });
    throw error;
  }
}

/**
 * Call the generate-avatar-story Edge Function to generate a 6-panel, avatar-aware story.
 * Returns { storyId, title, panels } or a local stub if mocks are enabled or the call fails.
 */
export async function generateAvatarStory({
  storyId,
  storySummary,
  topicTag = null
}) {
  if (!storyId) throw new Error('storyId is required');

  // In mock mode or when Supabase isn't configured, fall back to a local stub generator.
  if (shouldUseMockData()) {
    console.log('[stories] Using local stub for generateAvatarStory in mock mode', {
      storyId
    });
    return buildLocalAvatarStory({ storyId, storySummary, topicTag });
  }

  const client = getSupabaseClient();
  if (!client) {
    console.warn('[stories] Supabase client missing; using local stub for generateAvatarStory');
    return buildLocalAvatarStory({ storyId, storySummary, topicTag });
  }

  try {
    console.log('[stories] Invoking generate-avatar-story function', {
      storyId,
      hasSummary: Boolean(storySummary),
      topicTag
    });

    const { data, error } = await client.functions.invoke('generate-avatar-story', {
      body: {
        storyId,
        storySummary,
        topicTag
      }
    });

    if (error) {
      console.warn('[stories] generate-avatar-story function error', { error, storyId });
      return buildLocalAvatarStory({ storyId, storySummary, topicTag });
    }

    console.log('[stories] generate-avatar-story function response', {
      storyId,
      hasData: Boolean(data),
      panelCount: Array.isArray(data?.panels) ? data.panels.length : 0
    });

    if (!data || !Array.isArray(data.panels)) {
      return buildLocalAvatarStory({ storyId, storySummary, topicTag });
    }

    return data;
  } catch (error) {
    console.warn('[stories] Failed to invoke generate-avatar-story function', {
      error,
      storyId
    });
    return buildLocalAvatarStory({ storyId, storySummary, topicTag });
  }
}

/**
 * Call the generate-story-structure Edge Function to generate a story outline
 * from a free-form user idea.
 */
export async function generateStoryStructure(idea) {
  const trimmedIdea = (idea || '').trim();
  if (!trimmedIdea) throw new Error('idea is required');

  if (shouldUseMockData()) {
    // Simple local stub in mock mode
    const fallbackTitle =
      trimmedIdea.length <= 40
        ? trimmedIdea.charAt(0).toUpperCase() + trimmedIdea.slice(1)
        : `${trimmedIdea.slice(0, 37)}...`;
    return {
      title: fallbackTitle || 'My Custom Adventure',
      summary:
        'A curious hero explores this topic and discovers fun facts along the way. This is a simple starting point for your comic.',
      topicTag: 'Science',
      readingLevel: 'Ages 7-9',
      estimatedTime: '5 min'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured');
  }

  try {
    const { data, error } = await client.functions.invoke('generate-story-structure', {
      body: { idea: trimmedIdea }
    });

    if (error) {
      console.warn('[stories] generate-story-structure function error', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.warn('[stories] Failed to invoke generate-story-structure function', error);
    throw error;
  }
}

/**
 * Create a user-owned story row in the stories table.
 * Requires an authenticated Supabase session (RLS policy enforces user_id = auth.uid()).
 */
export async function createUserStory({
  title,
  summary,
  topicTag,
  readingLevel = 'Ages 7-9',
  estimatedTime = '5 min'
}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured');
  }

  const cleanTitle = (title || '').trim();
  const cleanSummary = (summary || '').trim();
  const cleanTopic = (topicTag || '').trim() || 'Science';

  if (!cleanTitle || !cleanSummary) {
    throw new Error('title and summary are required');
  }

  try {
    const {
      data: { session }
    } = await client.auth.getSession();

    if (!session?.user?.id) {
      throw new Error('You must be logged in to create a story');
    }

    const { data, error } = await client
      .from('stories')
      .insert({
        title: cleanTitle,
        summary: cleanSummary,
        topic_tag: cleanTopic,
        reading_level: readingLevel,
        estimated_time: estimatedTime,
        user_id: session.user.id
      })
      .select(
        'id, title, cover_url, topic_tag, reading_level, estimated_time, summary, user_id'
      )
      .single();

    if (error) {
      console.warn('[stories] Failed to create user story', error);
      throw error;
    }

    return {
      id: data.id,
      title: data.title,
      coverUrl: data.cover_url,
      topicTag: data.topic_tag,
      readingLevel: data.reading_level,
      estimatedTime: data.estimated_time,
      summary: data.summary,
      userId: data.user_id || null
    };
  } catch (error) {
    console.warn('[stories] createUserStory failed', error);
    throw error;
  }
}

function buildLocalAvatarStory({ storyId, storySummary, topicTag }) {
  const cleanedSummary =
    (storySummary || '').trim() ||
    'A curious young hero sets off on a science adventure, ready to explore and ask big questions.';

  const topic = (topicTag || 'science adventure').toLowerCase();
  const baseTitle =
    topic.includes('history') || topic.includes('past')
      ? 'Time-Traveling Adventure'
      : topic.includes('space')
      ? 'Journey Through the Stars'
      : topic.includes('plant') || topic.includes('photosynthesis')
      ? 'Mystery of the Magic Leaves'
      : 'Curious Hero Adventure';

  const avatarName = 'Hero';

  const panels = [
    {
      panelId: 'panel-01',
      imageUrl: null,
      imagePrompt: `Kid-friendly comic panel of ${avatarName} beginning a ${topic} based on this idea: ${cleanedSummary}`,
      narration: `${avatarName} hears about a new ${topic} and decides to explore it in a fun, kid-friendly way.`,
      glossaryTerms: ['adventure', 'curiosity'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask what this adventure is about'
    },
    {
      panelId: 'panel-02',
      imageUrl: null,
      imagePrompt: `${avatarName} meeting a friendly guide who explains the main idea using pictures and simple words.`,
      narration:
        `A friendly guide appears and helps ${avatarName} turn the big idea into a simple story they can understand.`,
      glossaryTerms: ['guide', 'idea'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask the guide to explain more'
    },
    {
      panelId: 'panel-03',
      imageUrl: null,
      imagePrompt: `${avatarName} trying a tiny experiment or pretend activity to see how things change.`,
      narration: `${avatarName} tries a tiny experiment, changing one small thing and watching carefully to see what happens.`,
      glossaryTerms: ['experiment', 'observe'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask what changed in the experiment'
    },
    {
      panelId: 'panel-04',
      imageUrl: null,
      imagePrompt: `${avatarName} pointing at a simple chart or scene that shows a clear pattern.`,
      narration: `Soon ${avatarName} notices a pattern. Things that looked confusing at first now start to make sense.`,
      glossaryTerms: ['pattern', 'cause and effect'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask about the pattern they found'
    },
    {
      panelId: 'panel-05',
      imageUrl: null,
      imagePrompt: `${avatarName} happily explaining the idea to a new friend in kid-friendly language.`,
      narration: `${avatarName} explains the adventure to a new friend using their own words and simple examples.`,
      glossaryTerms: ['explain', 'share'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask how to explain this to a friend'
    },
    {
      panelId: 'panel-06',
      imageUrl: null,
      imagePrompt: `${avatarName} and the guide celebrating and thinking of a new question to explore next.`,
      narration: `The adventure ends with a happy high-five. ${avatarName} feels proud and already wonders what they can explore next.`,
      glossaryTerms: ['celebrate', 'curiosity'],
      chatTopicId: topicTag || 'science-adventure',
      ctaLabel: 'Ask what to explore next'
    }
  ];

  return {
    storyId,
    title: baseTitle,
    panels
  };
}

function getStoredProgress() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[stories] Unable to read progress store', error);
    return {};
  }
}

function persistProgress(store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('[stories] Unable to write progress store', error);
  }
}

export function getStoryProgressSummary(storyId, childId = DEFAULT_CHILD_ID) {
  const store = getStoredProgress();
  return store[childId]?.[storyId] || { lastPanelIndex: 0, completedAt: null };
}

export async function saveStoryProgress({
  storyId,
  lastPanelIndex = 0,
  completed = false,
  childId = DEFAULT_CHILD_ID
}) {
  if (!storyId) throw new Error('storyId is required to save progress');
  const store = getStoredProgress();
  if (!store[childId]) store[childId] = {};
  store[childId][storyId] = {
    lastPanelIndex,
    completedAt: completed ? new Date().toISOString() : store[childId][storyId]?.completedAt || null
  };
  persistProgress(store);

  const client = getSupabaseClient();
  if (client && !shouldUseMockData()) {
    try {
      await client.from('story_progress').upsert({
        child_id: childId,
        story_id: storyId,
        last_panel_index: lastPanelIndex,
        completed_at: completed ? new Date().toISOString() : null
      });
    } catch (error) {
      console.warn('[stories] Supabase progress upsert failed', error);
    }
  }
}

function readAnalyticsQueue() {
  if (!USE_ANALYTICS_QUEUE || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[stories] Failed to read analytics queue', error);
    return [];
  }
}

function writeAnalyticsQueue(queue) {
  if (!USE_ANALYTICS_QUEUE || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[stories] Failed to update analytics queue', error);
  }
}

function enqueueAnalyticsEntry(entry) {
  if (!USE_ANALYTICS_QUEUE) return;
  const queue = readAnalyticsQueue();
  queue.push(entry);
  writeAnalyticsQueue(queue);
}

async function flushQueueWithSupabase(client) {
  if (!client) return;
  const queue = readAnalyticsQueue();
  if (!queue.length) return;

  const { error } = await client.from('analytics_events').insert(
    queue.map((entry) => ({
      event_type: entry.eventType,
      payload: entry.payload,
      occurred_at: entry.timestamp
    }))
  );

  if (error) {
    console.warn('[stories] Unable to flush analytics queue', error);
    return;
  }

  writeAnalyticsQueue([]);
}

async function sendViaEdge(entry) {
  if (!EDGE_ANALYTICS_URL) return false;
  try {
    const response = await fetch(EDGE_ANALYTICS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entry)
    });
    return response.ok;
  } catch (error) {
    console.warn('[stories] Edge analytics call failed', error);
    return false;
  }
}

export async function flushAnalyticsQueue() {
  if (EDGE_ANALYTICS_URL) {
    const queue = readAnalyticsQueue();
    if (!queue.length) return;

    const stillQueued = [];
    for (const entry of queue) {
      const ok = await sendViaEdge(entry);
      if (!ok) stillQueued.push(entry);
    }
    writeAnalyticsQueue(stillQueued);
    if (!stillQueued.length) return;
  }

  // Only try Supabase if not in mock mode
  if (shouldUseMockData()) return;

  const client = getSupabaseClient();
  if (client) {
    await flushQueueWithSupabase(client);
  }
}

export async function logAnalyticsEvent(eventType, payload = {}) {
  if (!eventType) return;
  
  // In mock mode, just queue analytics without trying Supabase
  if (shouldUseMockData()) {
    const entry = {
      eventType,
      payload,
      timestamp: new Date().toISOString()
    };
    enqueueAnalyticsEntry(entry);
    return;
  }

  const entry = {
    eventType,
    payload,
    timestamp: new Date().toISOString()
  };

  if (EDGE_ANALYTICS_URL) {
    const ok = await sendViaEdge(entry);
    if (ok) return;
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('analytics_events').insert({
        event_type: entry.eventType,
        payload: entry.payload,
        occurred_at: entry.timestamp
      });
      if (!error) {
        await flushQueueWithSupabase(client);
        return;
      }
      console.warn('[stories] analytics insert failed, queueing', error);
    } catch (error) {
      console.warn('[stories] analytics insert crashed, queueing', error);
    }
  }

  enqueueAnalyticsEntry(entry);
}

export function isUsingStoryMocks() {
  return shouldUseMockData();
}

if (typeof window !== 'undefined' && !shouldUseMockData()) {
  window.addEventListener('online', () => {
    flushAnalyticsQueue();
  });
  flushAnalyticsQueue();
}

