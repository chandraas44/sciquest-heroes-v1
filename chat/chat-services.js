import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig, createSupabaseClientAsync, getEnvVarAsync, configReady, getEnvVar } from '/config.js';

// Use runtime config system (from Netlify function)
// Initialize with build-time fallback, will be updated after config is ready
let EDGE_ANALYTICS_URL = getEnvVar('VITE_EDGE_ANALYTICS_URL') || '';
let N8N_CHAT_URL = getEnvVar('VITE_N8N_CHAT_URL')?.trim() || '';
let USE_CHAT_MOCKS_RAW = getEnvVar('VITE_USE_CHAT_MOCKS');
let USE_CHAT_MOCKS = (USE_CHAT_MOCKS_RAW ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const DEFAULT_CHILD_ID = 'guest-child';
const TRANSCRIPT_STORAGE_KEY = 'sqh_chat_transcripts_v1';
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

// Will log diagnostics after functions are defined (see end of file)

// Log n8n configuration status on module load (build-time check)
// Will be updated after runtime config loads
const initialN8nUrl = getEnvVar('VITE_N8N_CHAT_URL')?.trim() || '';
if (!initialN8nUrl) {
  console.log('[chat] Checking n8n configuration... (will check runtime config)');
}

// Update environment variables after Netlify config is ready
configReady.then(async () => {
  EDGE_ANALYTICS_URL = (await getEnvVarAsync('VITE_EDGE_ANALYTICS_URL')) || '';
  N8N_CHAT_URL = (await getEnvVarAsync('VITE_N8N_CHAT_URL'))?.trim() || '';
  USE_CHAT_MOCKS_RAW = await getEnvVarAsync('VITE_USE_CHAT_MOCKS');
  USE_CHAT_MOCKS = (USE_CHAT_MOCKS_RAW ?? 'true') === 'true';
  
  // Re-log n8n configuration status after config is ready
  if (N8N_CHAT_URL) {
    console.log('[chat] ✅ n8n integration enabled (runtime):', N8N_CHAT_URL);
    if (USE_CHAT_MOCKS) {
      console.warn('[chat] ⚠️ WARNING: n8n URL is configured BUT mock mode is enabled!');
      console.warn('[chat] ⚠️ n8n will NOT be used. Set VITE_USE_CHAT_MOCKS=false in Netlify env vars to use n8n');
      console.warn('[chat] ⚠️ Current value:', USE_CHAT_MOCKS_RAW || 'undefined (defaults to true)');
    } else {
      console.log('[chat] ✅ Mock mode disabled - n8n will be used');
    }
  } else {
    console.warn('[chat] ❌ n8n integration disabled (VITE_N8N_CHAT_URL not set in Netlify)');
    console.warn('[chat] 💡 Add VITE_N8N_CHAT_URL to Netlify environment variables');
  }
}).catch(() => {
  // Silent fail - will use build-time values as fallback
});

let supabaseClient = null;
let cachedMockChatData = null;

async function hasSupabaseConfig() {
  const config = await supabaseConfig.ready().catch(() => ({ url: null, anonKey: null }));
  return Boolean(config?.url && config?.anonKey);
}

async function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = await createSupabaseClientAsync(createClient);
  }
  return supabaseClient;
}

function shouldUseMockData() {
  // Check sync config (has build-time fallback)
  const hasConfig = Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
  const result = USE_CHAT_MOCKS || !hasConfig;
  if (result && N8N_CHAT_URL) {
    console.warn('[chat] ⚠️ Mock data will be used because:', 
      USE_CHAT_MOCKS ? 'VITE_USE_CHAT_MOCKS is true' : 'Supabase config missing');
  }
  return result;
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

  const client = await getSupabaseClient();
  if (!client) {
    const data = await loadMockChatData();
    return data.topics || [];
  }

  try {
    const { data, error } = await client
      .from('topics')
      .select('*')
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

  const client = await getSupabaseClient();
  if (!client) {
    const data = await loadMockChatData();
    return data.topics.find((topic) => topic.id === topicId) || null;
  }

  try {
    const { data, error } = await client
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .maybeSingle();

    if (error) {
      console.warn('[chat] Supabase topic query error:', error.message || error);
      // Fall back to mock data
      const mockData = await loadMockChatData();
      return mockData.topics.find((topic) => topic.id === topicId) || null;
    }
    
    if (!data) {
      // Topic not found in Supabase, try mock data
      const mockData = await loadMockChatData();
      return mockData.topics.find((topic) => topic.id === topicId) || null;
    }
    
    return data;
  } catch (error) {
    console.warn('[chat] Supabase topic fetch failed, reverting to mock data', error);
    const data = await loadMockChatData();
    return data.topics.find((topic) => topic.id === topicId) || null;
  }
}

async function getCurrentUserProfile() {
  const client = await getSupabaseClient();
  if (!client) return null;
  
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    
    const { data: profile } = await client
      .from('user_profiles')
      .select('id, grade_level')
      .eq('id', session.user.id)
      .maybeSingle();
    
    return profile;
  } catch (error) {
    console.warn('[chat] Failed to fetch user profile', error);
    return null;
  }
}

function getGuideName(topicName) {
  const guideMap = {
    'Photosynthesis': 'Mr. Chloro',
    'Nature & Animals': 'Flora the Forest Friend',
  };
  return guideMap[topicName] || `${topicName} Guide`;
}

async function getOrCreatePhotosynthesisTopic() {
  const client = await getSupabaseClient();
  if (!client) {
    // Return mock topic if Supabase not available
    return {
      id: 'photosynthesis',
      name: 'Photosynthesis',
      description: 'Learn how plants make their own food using sunlight, water, and air – photosynthesis!'
    };
  }

  try {
    // Try to find existing Photosynthesis topic
    const { data: existing } = await client
      .from('topics')
      .select('*')
      .or('name.ilike.Photosynthesis,name.ilike.plant power')
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Create new Photosynthesis topic
    const { data: newTopic, error } = await client
      .from('topics')
      .insert({
        name: 'Photosynthesis',
        description: 'Learn how plants make their own food using sunlight, water, and air – photosynthesis!'
      })
      .select()
      .single();

    if (error) throw error;
    return newTopic;
  } catch (error) {
    console.warn('[chat] Failed to get/create Photosynthesis topic', error);
      // Return fallback topic
      return {
        id: 'photosynthesis',
        name: 'Photosynthesis',
        description: 'Learn how plants make their own food using sunlight, water, and air – photosynthesis!'
      };
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

// Generate UUID v4 format
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function prepareN8nPayload(topicId, message, context, sessionId, messages) {
  // Resolve topic: use topicId OR fallback to Photosynthesis
  let topic;
  
  // Try to get topic by ID if provided
  if (topicId) {
    try {
      console.log('[chat] Attempting to get topic by ID:', topicId);
      topic = await getTopicById(topicId);
      if (topic) {
        console.log('[chat] Topic found:', topic.name || topic.title);
      }
    } catch (error) {
      console.warn('[chat] Failed to get topic by ID, using Photosynthesis fallback', error);
      topic = null;
    }
  }
  
  // Fallback to Photosynthesis topic if no topic found
  if (!topic) {
    try {
      console.log('[chat] Getting or creating Photosynthesis topic...');
      topic = await getOrCreatePhotosynthesisTopic();
      if (!topic) {
        throw new Error('getOrCreatePhotosynthesisTopic returned null');
      }
      console.log('[chat] Using Photosynthesis topic:', topic.name || topic.title);
    } catch (error) {
      console.error('[chat] Failed to get/create Photosynthesis topic, using hardcoded fallback', error);
      // Hardcoded fallback to ensure we always have a topic
      topic = {
        id: 'photosynthesis',
        name: 'Photosynthesis',
        title: 'Photosynthesis',
        description: 'Learn how plants make their own food using sunlight, water, and air – photosynthesis!'
      };
    }
  }
  
  // Ensure topic has required fields
  if (!topic || (!topic.name && !topic.title)) {
    console.error('[chat] Invalid topic object, using hardcoded fallback');
    topic = {
      id: 'photosynthesis',
      name: 'Photosynthesis',
      title: 'Photosynthesis',
      description: 'Learn how plants make their own food using sunlight, water, and air – photosynthesis!'
    };
  }
  
  // Get user profile
  const profile = await getCurrentUserProfile();
  const userId = profile?.id || 'guest-user';
  
  // Generate or extract conversation_id (UUID format)
  let conversationId;
  if (sessionId && sessionId.includes('_')) {
    // Extract conversation_id from existing sessionId format: {user_id}_{conversation_id}
    conversationId = sessionId.split('_').pop();
    // Validate it's a UUID format, if not generate new one
    if (!conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      conversationId = generateUUID();
    }
  } else if (sessionId) {
    // If sessionId exists but doesn't have underscore, check if it's a UUID
    if (sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      conversationId = sessionId;
    } else {
      conversationId = generateUUID();
    }
  } else {
    // Generate new UUID for conversation
    conversationId = generateUUID();
  }
  
  // Format sessionId as {user_id}_{conversation_id}
  const formattedSessionId = `${userId}_${conversationId}`;
  
  // Transform chat history (remove loading messages, map roles)
  const chatHistory = messages
    .filter(m => m.role !== 'ai' || m.content !== '...')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'guide',
      content: m.content,
      timestamp: m.timestamp
    }));
  
  const topicName = topic.name || topic.title || 'Photosynthesis';
  
  console.log('[chat] Preparing n8n payload with topic:', topicName);
  
  // Return payload as single object (not array) for n8n Chat Trigger node
  // The Chat Trigger node expects sessionId at the top level of the object
  return {
    sessionId: formattedSessionId,
    conversation_id: conversationId,
    user_message: message,
    topic: topicName,
    guide_name: getGuideName(topicName),
    grade_level: profile?.grade_level || '5',
    chat_history: chatHistory,
    timestamp: new Date().toISOString(),
    user_id: userId
  };
}

async function sendToN8n(payload) {
  if (!N8N_CHAT_URL) {
    throw new Error('N8N_CHAT_URL not configured');
  }
  
  try {
    console.log('[chat] Sending request to n8n:', N8N_CHAT_URL);
    const response = await fetch(N8N_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[chat] n8n API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`N8N API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log full response structure for debugging
    console.log('[chat] n8n raw response:', JSON.stringify(data, null, 2));
    console.log('[chat] n8n response keys:', Object.keys(data));
    
    // Extract AI response (handle various response formats)
    // Check multiple possible field names and nested structures
    let aiContent = null;
    
    // Direct fields
    if (data.response) aiContent = data.response;
    else if (data.content) aiContent = data.content;
    else if (data.message) aiContent = data.message;
    else if (data.answer) aiContent = data.answer;
    else if (data.ai_response) aiContent = data.ai_response;
    else if (data.text) aiContent = data.text;
    else if (data.output) aiContent = data.output;
    else if (data.result) aiContent = data.result;
    // Nested structures
    else if (data.data?.response) aiContent = data.data.response;
    else if (data.data?.content) aiContent = data.data.content;
    else if (data.data?.message) aiContent = data.data.message;
    else if (data.data?.output) aiContent = data.data.output;
    // Array responses (take first element)
    else if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      aiContent = firstItem.response || firstItem.content || firstItem.message || firstItem.output || firstItem.text || firstItem;
    }
    // If data itself is a string
    else if (typeof data === 'string') {
      aiContent = data;
    }
    
    // Fallback if nothing found
    if (!aiContent || (typeof aiContent === 'string' && aiContent.trim() === '')) {
      console.warn('[chat] ⚠️ Could not extract response from n8n. Full response structure:', data);
      console.warn('[chat] ⚠️ Available keys:', Object.keys(data));
      aiContent = "I'm here to help!";
    }
    
    // If aiContent is an object, try to stringify it or extract text
    if (typeof aiContent === 'object' && aiContent !== null) {
      if (aiContent.text) {
        aiContent = aiContent.text;
      } else if (aiContent.content) {
        aiContent = aiContent.content;
      } else {
        // Try to stringify the object
        aiContent = JSON.stringify(aiContent);
      }
    }
    
    console.log('[chat] ✅ Extracted AI content:', aiContent.substring(0, 100) + (aiContent.length > 100 ? '...' : ''));
    
    return {
      role: 'ai',
      content: aiContent,
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  } catch (error) {
    console.error('[chat] N8N API call failed', {
      error: error.message,
      url: N8N_CHAT_URL,
      payloadKeys: Object.keys(payload)
    });
    throw error;
  }
}

export async function sendMessage(topicId, message, context = {}, sessionId = null, messages = []) {
  // Validate message
  if (!message || !message.trim()) {
    return {
      role: 'ai',
      content: "Please ask me a question!",
      timestamp: new Date().toISOString(),
      safetyFlagged: false
    };
  }

  // Construct effective sessionId if missing
  const effectiveSessionId = sessionId || generateSessionId();

  // Safety check (existing logic)
  const safetyCheck = await applySafetyFilter(message);
  if (!safetyCheck.safe) {
    return {
      role: 'ai',
      content: "I can't answer that question right now. Would you like to ask a parent or teacher for help?",
      timestamp: new Date().toISOString(),
      safetyFlagged: true
    };
  }

  // FALLBACK CHAIN: Try n8n → Supabase → Mock

  // 1. TRY n8n (if URL configured and not in mock mode)
  if (N8N_CHAT_URL && !shouldUseMockData()) {
    try {
      console.log('[chat] Attempting n8n API call...', { topicId, messageLength: message.length, sessionId: effectiveSessionId });
      
      // Prepare payload with detailed error handling
      let payload;
      try {
        payload = await prepareN8nPayload(topicId, message, context, effectiveSessionId, messages);
        // Payload is now a single object (not array) for n8n Chat Trigger node
        console.log('[chat] n8n payload prepared successfully:', { 
          sessionId: payload.sessionId, 
          conversation_id: payload.conversation_id,
          topic: payload.topic,
          guide_name: payload.guide_name,
          grade_level: payload.grade_level,
          chat_history_length: payload.chat_history.length,
          user_id: payload.user_id,
          payload_format: 'object'
        });
        // Log full payload structure for debugging
        console.log('[chat] Full n8n payload (JSON):', JSON.stringify(payload, null, 2));
      } catch (payloadError) {
        console.error('[chat] Failed to prepare n8n payload:', payloadError);
        throw new Error(`Payload preparation failed: ${payloadError.message}`);
      }
      
      // Send to n8n
      const response = await sendToN8n(payload);
      console.log('[chat] ✅ n8n API call successful');
      return response;
    } catch (error) {
      console.error('[chat] ❌ N8N failed, trying Supabase fallback', {
        error: error.message,
        stack: error.stack
      });
      // Continue to Supabase fallback
    }
  } else if (!N8N_CHAT_URL) {
    console.log('[chat] n8n URL not configured, skipping n8n call');
    console.log('[chat] 💡 Set VITE_N8N_CHAT_URL in .env to enable n8n');
  } else if (shouldUseMockData()) {
    console.warn('[chat] ⚠️ Mock mode enabled, skipping n8n call');
    console.warn('[chat] ⚠️ To use n8n, set VITE_USE_CHAT_MOCKS=false in .env and restart dev server');
  }

  // 2. FALLBACK: Supabase RPC
  const client = await getSupabaseClient();
  if (client && !shouldUseMockData()) {
    try {
      // Resolve topic for RPC call
      let resolvedTopicId = topicId;
      if (!resolvedTopicId) {
        const photoTopic = await getOrCreatePhotosynthesisTopic();
        resolvedTopicId = photoTopic.id;
      }

      const { data, error } = await client.rpc('get_ai_response', {
        p_topic_id: resolvedTopicId,
        p_message: message,
        p_context: context
      });

      if (!error && data) {
        return {
          role: 'ai',
          content: data.response || "I'm not sure how to answer that. Can you try asking it differently?",
          timestamp: new Date().toISOString(),
          safetyFlagged: false
        };
      }
    } catch (error) {
      console.warn('[chat] Supabase RPC failed, using mock fallback', error);
      // Continue to mock fallback
    }
  }

  // 3. FINAL FALLBACK: Mock data
  const resolvedTopicId = topicId || 'photosynthesis';
  const response = await getMockResponse(resolvedTopicId, message);
  return {
    role: 'ai',
    content: response,
    timestamp: new Date().toISOString(),
    safetyFlagged: false
  };
}

export async function applySafetyFilter(message) {
  if (shouldUseMockData()) {
    return { safe: true };
  }

  const client = await getSupabaseClient();
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
    console.warn('[chat] Failed to get current user ID', error);
    return null;
  }
}

export async function saveTranscript(sessionId, transcript) {
  if (!sessionId) throw new Error('sessionId is required');
  const store = getStoredTranscripts();
  store[sessionId] = {
    ...transcript,
    updatedAt: new Date().toISOString()
  };
  persistTranscripts(store);

  const client = await getSupabaseClient();
  if (client && !shouldUseMockData()) {
    // Get actual user ID if not provided in transcript
    let userId = transcript.childId;
    if (!userId) {
      userId = await getCurrentUserId() || DEFAULT_CHILD_ID;
    }
    
    // Get the latest message timestamp for last_message_at
    const messages = transcript.messages || [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMessageAt = lastMessage?.timestamp || new Date().toISOString();
    
    try {
      await client
        .from('chat_sessions')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          topic_id: transcript.topicId,
          messages: transcript.messages || [],
          context: transcript.context || {},
          last_message_at: lastMessageAt,
          updated_at: new Date().toISOString(),
          created_at: transcript.createdAt || new Date().toISOString()
        }, {
          onConflict: 'session_id'
        });
      console.log('[chat] Transcript saved to Supabase successfully');
    } catch (error) {
      console.warn('[chat] Supabase transcript save failed', error);
      // Don't throw - localStorage backup already saved
    }
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

export function isN8nConfigured() {
  return Boolean(N8N_CHAT_URL);
}

export function getN8nStatus() {
  return {
    configured: Boolean(N8N_CHAT_URL),
    url: N8N_CHAT_URL || 'Not configured',
    mockMode: shouldUseMockData(),
    willUseN8n: Boolean(N8N_CHAT_URL && !shouldUseMockData())
  };
}

// Detailed diagnostic logging after all functions are defined
// This will run immediately with build-time values, then update after runtime config loads
(function logDiagnostics() {
  console.group('[chat] 🔍 Environment Configuration Diagnostics (Initial)');
  console.log('VITE_N8N_CHAT_URL (runtime):', N8N_CHAT_URL || 'empty');
  console.log('VITE_USE_CHAT_MOCKS (runtime):', USE_CHAT_MOCKS);
  console.log('hasSupabaseConfig():', hasSupabaseConfig());
  console.log('shouldUseMockData():', shouldUseMockData());
  console.log('Will use n8n:', Boolean(N8N_CHAT_URL && !shouldUseMockData()));
  console.groupEnd();
  
  // Re-log diagnostics after config is ready
  configReady.then(() => {
    console.group('[chat] 🔍 Environment Configuration Diagnostics (Runtime)');
    console.log('VITE_N8N_CHAT_URL (runtime):', getEnvVarAsync('VITE_N8N_CHAT_URL')?.trim() || 'empty');
    console.log('VITE_N8N_CHAT_URL (cached):', N8N_CHAT_URL || 'empty');
    console.log('VITE_USE_CHAT_MOCKS (runtime):', USE_CHAT_MOCKS);
    console.log('Will use n8n:', Boolean(N8N_CHAT_URL && !shouldUseMockData()));
    console.groupEnd();
  }).catch(() => {});
})();

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

  const client = await getSupabaseClient();
  if (client && !shouldUseMockData()) {
    // FIX: Use try/catch with await instead of .catch() on query builder
    try {
      await client
        .from('analytics_events')
        .insert({
          event_type: entry.eventType,
          payload: entry.payload,
          occurred_at: entry.timestamp
        });
    } catch (error) {
      console.warn('[chat] Supabase analytics insert failed', error);
      // Don't throw - analytics failures shouldn't break chat
    }
  }
}



