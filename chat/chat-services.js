import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';
const USE_CHAT_MOCKS = (import.meta.env?.VITE_USE_CHAT_MOCKS ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const DEFAULT_CHILD_ID = 'guest-child';
const TRANSCRIPT_STORAGE_KEY = 'sqh_chat_transcripts_v1';
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

let supabaseClient = null;
let cachedMockChatData = null;

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
  if (USE_CHAT_MOCKS) return true;
  return !hasSupabaseConfig();
}

export function isUsingChatMocks() {
  return shouldUseMockData();
}

async function loadMockChatData() {
  if (cachedMockChatData) return cachedMockChatData;
  const res = await fetch(new URL('./mockChatData.json', import.meta.url));
  if (!res.ok) {
    throw new Error('Unable to load mock chat data');
  }
  const data = await res.json();
  cachedMockChatData = data;
  return cachedMockChatData;
}

export async function getTopicCatalog() {
  if (shouldUseMockData()) {
    const data = await loadMockChatData();
    return data.topics || [];
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockChatData();
    return data.topics || [];
  }

  try {
    const { data, error } = await client
      .from('topics')
      .select('*')
      .eq('enabled', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[chat] Supabase topics fetch failed, reverting to mock data', error);
    const data = await loadMockChatData();
    return data.topics || [];
  }
}

export async function getTopicById(topicId) {
  if (!topicId) throw new Error('topicId is required');
  if (shouldUseMockData()) {
    const data = await loadMockChatData();
    return data.topics.find((topic) => topic.id === topicId) || null;
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockChatData();
    return data.topics.find((topic) => topic.id === topicId) || null;
  }

  try {
    const { data, error } = await client
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .eq('enabled', true)
      .maybeSingle();

    if (error || !data) {
      throw error || new Error('topic not found');
    }
    return data;
  } catch (error) {
    console.warn('[chat] Supabase topic fetch failed, reverting to mock data', error);
    const data = await loadMockChatData();
    return data.topics.find((topic) => topic.id === topicId) || null;
  }
}

function getMockResponse(topicId, message) {
  return new Promise(async (resolve) => {
    const data = await loadMockChatData();
    const topicResponses = data.responses?.[topicId];
    if (!topicResponses) {
      resolve(topicResponses?.default || "That's a great question! I'm here to help you learn. What else would you like to know? 🤔");
      return;
    }

    const lowerMessage = message.toLowerCase();
    let matchedResponse = null;

    for (const [pattern, response] of Object.entries(topicResponses.patterns || {})) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowerMessage)) {
        matchedResponse = response;
        break;
      }
    }

    const finalResponse = matchedResponse || topicResponses.default || "That's a great question! I'm here to help you learn. What else would you like to know? 🤔";
    
    setTimeout(() => {
      resolve(finalResponse);
    }, 1000 + Math.random() * 1000);
  });
}

export async function sendMessage(topicId, message, context = {}) {
  const safetyCheck = await applySafetyFilter(message);
  if (!safetyCheck.safe) {
    return {
      role: 'ai',
      content: "I can't answer that question right now. Would you like to ask a parent or teacher for help?",
      timestamp: new Date().toISOString(),
      safetyFlagged: true
    };
  }

  if (shouldUseMockData()) {
    const response = await getMockResponse(topicId, message);
    return {
      role: 'ai',
      content: response,
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    const response = await getMockResponse(topicId, message);
    return {
      role: 'ai',
      content: response,
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  }

  try {
    const { data, error } = await client.rpc('get_ai_response', {
      p_topic_id: topicId,
      p_message: message,
      p_context: context
    });

    if (error) throw error;
    return {
      role: 'ai',
      content: data.response || "I'm not sure how to answer that. Can you try asking it differently?",
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  } catch (error) {
    console.warn('[chat] Supabase AI call failed, reverting to mock', error);
    const response = await getMockResponse(topicId, message);
    return {
      role: 'ai',
      content: response,
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  }
}

export async function applySafetyFilter(message) {
  if (shouldUseMockData()) {
    return { safe: true };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { safe: true };
  }

  try {
    const { data, error } = await client.rpc('check_message_safety', {
      p_message: message
    });

    if (error) throw error;
    return { safe: data?.safe ?? true, reason: data?.reason };
  } catch (error) {
    console.warn('[chat] Safety filter check failed, defaulting to safe', error);
    return { safe: true };
  }
}

function getStoredTranscripts() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[chat] Unable to read transcript store', error);
    return {};
  }
}

function persistTranscripts(store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('[chat] Unable to write transcript store', error);
  }
}

export function saveTranscript(sessionId, transcript) {
  if (!sessionId) throw new Error('sessionId is required');
  const store = getStoredTranscripts();
  store[sessionId] = {
    ...transcript,
    updatedAt: new Date().toISOString()
  };
  persistTranscripts(store);

  const client = getSupabaseClient();
  if (client && !shouldUseMockData()) {
    client
      .from('chat_sessions')
      .upsert({
        session_id: sessionId,
        child_id: transcript.childId || DEFAULT_CHILD_ID,
        topic_id: transcript.topicId,
        messages: transcript.messages,
        context: transcript.context,
        updated_at: new Date().toISOString()
      })
      .catch((error) => {
        console.warn('[chat] Supabase transcript save failed', error);
      });
  }
}

export function loadTranscript(sessionId) {
  if (!sessionId) return null;
  const store = getStoredTranscripts();
  return store[sessionId] || null;
}

export function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function readAnalyticsQueue() {
  if (!USE_ANALYTICS_QUEUE || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[chat] Failed to read analytics queue', error);
    return [];
  }
}

function writeAnalyticsQueue(queue) {
  if (!USE_ANALYTICS_QUEUE || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[chat] Failed to update analytics queue', error);
  }
}

function enqueueAnalyticsEntry(entry) {
  if (!USE_ANALYTICS_QUEUE) return;
  const queue = readAnalyticsQueue();
  queue.push(entry);
  writeAnalyticsQueue(queue);
}

async function sendViaEdge(entry) {
  if (!EDGE_ANALYTICS_URL) return false;
  try {
    const res = await fetch(EDGE_ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    return res.ok;
  } catch (error) {
    console.warn('[chat] Edge analytics call failed', error);
    return false;
  }
}

export async function logChatEvent(eventType, payload = {}) {
  const entry = {
    eventType: `chat_${eventType}`,
    payload: {
      ...payload,
      childId: DEFAULT_CHILD_ID
    },
    timestamp: new Date().toISOString()
  };

  if (EDGE_ANALYTICS_URL) {
    const sent = await sendViaEdge(entry);
    if (sent) return;
  }

  enqueueAnalyticsEntry(entry);

  const client = getSupabaseClient();
  if (client && !shouldUseMockData()) {
    client
      .from('analytics_events')
      .insert({
        event_type: entry.eventType,
        payload: entry.payload,
        occurred_at: entry.timestamp
      })
      .catch((error) => {
        console.warn('[chat] Supabase analytics insert failed', error);
      });
  }
}



