import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig, createSupabaseClientAsync } from '../config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';
const USE_STORY_MOCKS = (import.meta.env?.VITE_USE_STORY_MOCKS ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const DEFAULT_CHILD_ID = 'guest-child';
const PROGRESS_STORAGE_KEY = 'sqh_story_progress_v1';
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

let supabaseClient = null;
let cachedMockStories = null;

async function hasSupabaseConfig() {
  const config = await supabaseConfig.ready().catch(() => ({ url: null, anonKey: null }));
  return Boolean(config?.url && config?.anonKey);
}

export async function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = await createSupabaseClientAsync(createClient);
  }
  return supabaseClient;
}

function shouldUseMockData() {
  if (USE_STORY_MOCKS) return true;
  // Check sync config (has build-time fallback)
  return !(supabaseConfig?.url && supabaseConfig?.anonKey);
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

  const client = await getSupabaseClient();
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
        enabled
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
      enabled: story.enabled !== false  // Default to true if not specified
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

  const client = await getSupabaseClient();
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
      panels: data.panels
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

/**
 * Get current logged-in user ID from Supabase session
 * @returns {Promise<string|null>} User ID or null if not logged in
 */
async function getCurrentUserId() {
  try {
    const client = await getSupabaseClient();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.warn('[stories] Failed to get current user ID', error);
    return null;
  }
}

export async function saveStoryProgress({
  storyId,
  lastPanelIndex = 0,
  completed = false,
  childId = null
}) {
  if (!storyId) throw new Error('storyId is required to save progress');
  
  // Get actual user ID if not provided
  if (!childId) {
    childId = await getCurrentUserId() || DEFAULT_CHILD_ID;
  }
  
  const store = getStoredProgress();
  if (!store[childId]) store[childId] = {};
  store[childId][storyId] = {
    lastPanelIndex,
    completedAt: completed ? new Date().toISOString() : store[childId][storyId]?.completedAt || null
  };
  persistProgress(store);

  const client = await getSupabaseClient();
  if (client && !shouldUseMockData()) {
    try {
      // Try saving with user_id first
      const payload = {
        user_id: childId,
        story_id: storyId,
        last_panel_index: lastPanelIndex,
        completed_at: completed ? new Date().toISOString() : null
      };
      
      try {
        await client.from('story_progress').upsert(payload, {
          onConflict: 'user_id,story_id'
        });
        console.log('[stories] Progress saved with user_id');
      } catch (userIdError) {
        // If user_id fails, try with child_id as fallback
        if (userIdError.code === '42703' || userIdError.message?.includes('user_id')) {
          console.warn('[stories] user_id column not found, trying child_id...');
          const childIdPayload = {
            child_id: childId,
            story_id: storyId,
            last_panel_index: lastPanelIndex,
            completed_at: completed ? new Date().toISOString() : null
          };
          await client.from('story_progress').upsert(childIdPayload, {
            onConflict: 'child_id,story_id'
          });
          console.log('[stories] Progress saved with child_id');
        } else {
          throw userIdError;
        }
      }
    } catch (error) {
      console.error('[stories] ❌ Supabase progress upsert failed:', error);
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

  const client = await getSupabaseClient();
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

  const client = await getSupabaseClient();
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

