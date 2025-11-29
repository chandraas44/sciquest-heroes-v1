import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '/config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';
const USE_BADGES_MOCKS = (import.meta.env?.VITE_USE_BADGES_MOCKS ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const BADGE_AWARDS_STORAGE_KEY = 'sqh_badge_awards_v1';
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

let supabaseClient = null;
let cachedMockBadgeData = null;
let cachedBadgeRules = null;

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
  if (USE_BADGES_MOCKS) return true;
  return !hasSupabaseConfig();
}

export function isUsingBadgesMocks() {
  return shouldUseMockData();
}

async function loadMockBadgeData() {
  if (cachedMockBadgeData) return cachedMockBadgeData;
  const res = await fetch(new URL('./mockBadgeData.json', import.meta.url));
  if (!res.ok) {
    throw new Error('Unable to load mock badge data');
  }
  const data = await res.json();
  cachedMockBadgeData = data;
  return cachedMockBadgeData;
}

async function loadBadgeRules() {
  if (cachedBadgeRules) return cachedBadgeRules;
  
  if (shouldUseMockData()) {
    const res = await fetch(new URL('./badge-rules.json', import.meta.url));
    if (!res.ok) {
      throw new Error('Unable to load badge rules');
    }
    const data = await res.json();
    cachedBadgeRules = data.rules || [];
    return cachedBadgeRules;
  }

  const client = getSupabaseClient();
  if (!client) {
    const res = await fetch(new URL('./badge-rules.json', import.meta.url));
    if (!res.ok) {
      throw new Error('Unable to load badge rules');
    }
    const data = await res.json();
    cachedBadgeRules = data.rules || [];
    return cachedBadgeRules;
  }

  try {
    const { data, error } = await client
      .from('badge_rules')
      .select('*')
      .order('priority');

    if (error) throw error;
    cachedBadgeRules = data || [];
    return cachedBadgeRules;
  } catch (error) {
    console.warn('[badges] Supabase badge rules fetch failed, reverting to mock data', error);
    const res = await fetch(new URL('./badge-rules.json', import.meta.url));
    if (!res.ok) {
      throw new Error('Unable to load badge rules');
    }
    const data = await res.json();
    cachedBadgeRules = data.rules || [];
    return cachedBadgeRules;
  }
}

export async function loadBadgeCatalog() {
  if (shouldUseMockData()) {
    const data = await loadMockBadgeData();
    return data.badges || [];
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockBadgeData();
    return data.badges || [];
  }

  try {
    const { data, error } = await client
      .from('badges')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[badges] Supabase badges fetch failed, reverting to mock data', error);
    const data = await loadMockBadgeData();
    return data.badges || [];
  }
}

export async function getBadgeById(badgeId) {
  if (!badgeId) throw new Error('badgeId is required');
  
  const catalog = await loadBadgeCatalog();
  return catalog.find((badge) => badge.id === badgeId) || null;
}

function getBadgeAwardsFromStorage(childId) {
  try {
    const awardsData = JSON.parse(localStorage.getItem(BADGE_AWARDS_STORAGE_KEY) || '{}');
    return awardsData[childId] || [];
  } catch (error) {
    console.warn('[badges] Failed to load badge awards from storage', error);
    return [];
  }
}

function saveBadgeAwardToStorage(childId, badgeId, context) {
  try {
    const awardsData = JSON.parse(localStorage.getItem(BADGE_AWARDS_STORAGE_KEY) || '{}');
    if (!awardsData[childId]) {
      awardsData[childId] = [];
    }
    
    // Check if badge already awarded
    const existingIndex = awardsData[childId].findIndex((a) => a.badgeId === badgeId);
    if (existingIndex >= 0) {
      return; // Already awarded, skip
    }
    
    awardsData[childId].push({
      badgeId,
      awardedAt: new Date().toISOString(),
      context
    });
    
    localStorage.setItem(BADGE_AWARDS_STORAGE_KEY, JSON.stringify(awardsData));
  } catch (error) {
    console.warn('[badges] Failed to save badge award to storage', error);
  }
}

export function checkBadgeAward(childId, badgeId) {
  const awards = getBadgeAwardsFromStorage(childId);
  return awards.some((a) => a.badgeId === badgeId);
}

export function getBadgeAwards(childId) {
  return getBadgeAwardsFromStorage(childId);
}

async function initializeDefaultAwards(childId) {
  try {
    const mockData = await loadMockBadgeData();
    const defaultAwards = mockData.defaultAwards?.[childId] || [];
    if (defaultAwards.length > 0) {
      const awardsData = JSON.parse(localStorage.getItem(BADGE_AWARDS_STORAGE_KEY) || '{}');
      if (!awardsData[childId] || awardsData[childId].length === 0) {
        // Initialize with default awards
        awardsData[childId] = defaultAwards.map((badgeId) => ({
          badgeId,
          awardedAt: new Date().toISOString(),
          context: { trigger: 'default_init' }
        }));
        localStorage.setItem(BADGE_AWARDS_STORAGE_KEY, JSON.stringify(awardsData));
      }
    }
  } catch (error) {
    console.warn('[badges] Failed to initialize default awards', error);
  }
}

async function evaluateRule(rule, childId, context) {
  // Check if badge already awarded
  if (checkBadgeAward(childId, rule.badgeId)) {
    return { awarded: false, badgeId: rule.badgeId, alreadyAwarded: true };
  }

  const evaluation = rule.evaluation;
  
  if (evaluation.type === 'count') {
    // Load data from localStorage or context
    let count = 0;
    
    if (evaluation.source === 'chat_messages') {
      // Check chat transcripts from localStorage
      try {
        const transcripts = JSON.parse(localStorage.getItem('sqh_chat_transcripts_v1') || '{}');
        const childMessages = Object.values(transcripts).flatMap((session) => 
          (session.messages || []).filter((msg) => 
            msg.role === evaluation.filter?.role || true
          )
        );
        count = childMessages.length;
      } catch (error) {
        console.warn('[badges] Failed to load chat messages for evaluation', error);
      }
    } else if (evaluation.source === 'story_progress') {
      // Check story progress from localStorage
      try {
        const progress = JSON.parse(localStorage.getItem('sqh_story_progress_v1') || '{}');
        const childProgress = Object.values(progress).filter((sp) => {
          if (evaluation.filter?.completed !== undefined) {
            return sp.completed === evaluation.filter.completed;
          }
          if (evaluation.filter?.topicTag) {
            return sp.topicTag === evaluation.filter.topicTag;
          }
          return true;
        });
        count = childProgress.length;
      } catch (error) {
        console.warn('[badges] Failed to load story progress for evaluation', error);
      }
    }
    
    if (count >= evaluation.threshold) {
      return { awarded: true, badgeId: rule.badgeId, progress: { current: count, required: evaluation.threshold } };
    }
    
    return { awarded: false, badgeId: rule.badgeId, progress: { current: count, required: evaluation.threshold } };
  }
  
  if (evaluation.type === 'max_score') {
    // For quiz scores (mock for now)
    if (context?.score && context.score >= evaluation.threshold) {
      return { awarded: true, badgeId: rule.badgeId };
    }
    return { awarded: false, badgeId: rule.badgeId };
  }
  
  if (evaluation.type === 'streak') {
    // Calculate streak from all activities
    try {
      const progress = JSON.parse(localStorage.getItem('sqh_story_progress_v1') || '{}');
      const transcripts = JSON.parse(localStorage.getItem('sqh_chat_transcripts_v1') || '{}');
      
      const allActivities = [
        ...Object.values(progress).map((sp) => sp.lastViewedAt || sp.updatedAt),
        ...Object.values(transcripts).flatMap((session) => session.messages?.map((msg) => msg.timestamp) || [])
      ].filter(Boolean);
      
      // Simple streak calculation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      
      for (let i = 0; i < evaluation.threshold; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const hasActivity = allActivities.some((activityDate) => {
          const activityStr = new Date(activityDate).toISOString().split('T')[0];
          return activityStr === dateStr;
        });
        
        if (hasActivity) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      
      if (streak >= evaluation.threshold) {
        return { awarded: true, badgeId: rule.badgeId, progress: { current: streak, required: evaluation.threshold } };
      }
      
      return { awarded: false, badgeId: rule.badgeId, progress: { current: streak, required: evaluation.threshold } };
    } catch (error) {
      console.warn('[badges] Failed to calculate streak', error);
      return { awarded: false, badgeId: rule.badgeId };
    }
  }
  
  return { awarded: false, badgeId: rule.badgeId };
}

export async function evaluateBadgeRules(childId, triggerType, triggerData) {
  // Initialize default awards if needed
  await initializeDefaultAwards(childId);
  
  const rules = await loadBadgeRules();
  const triggerRules = rules.filter((rule) => rule.trigger.type === triggerType);
  
  // Sort by priority (lower number = higher priority)
  triggerRules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  
  const newlyAwarded = [];
  
  for (const rule of triggerRules) {
    // Check if already awarded (prevent duplicates)
    if (checkBadgeAward(childId, rule.badgeId)) {
      continue;
    }
    
    // Merge context - avoid duplicate context entries
    const context = {
      trigger: triggerType,
      ...triggerData,
      triggers: triggerData.triggers || [triggerType]
    };
    
    const result = await evaluateRule(rule, childId, context);
    
    if (result.awarded && !result.alreadyAwarded) {
      await awardBadge(childId, rule.badgeId, context);
      newlyAwarded.push({
        badgeId: rule.badgeId,
        awardedAt: new Date().toISOString(),
        context
      });
    }
  }
  
  return newlyAwarded;
}

export async function awardBadge(childId, badgeId, context) {
  // Atomic badge awarding - save to localStorage
  saveBadgeAwardToStorage(childId, badgeId, context);
  
  // Queue Supabase insert if available
  if (!shouldUseMockData() && hasSupabaseConfig()) {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('badge_awards').insert({
          user_id: childId,
          badge_id: badgeId,
          awarded_at: new Date().toISOString(),
          context: context
        });
      } catch (error) {
        console.warn('[badges] Supabase badge award insert failed, stored locally only', error);
      }
    }
  }
  
  // Log analytics event
  await logBadgeEvent('badge_awarded', {
    childId,
    badgeId,
    trigger: context.trigger || 'unknown',
    sourceFeature: context.sourceFeature || 'badge_system'
  });
  
  return {
    badgeId,
    awardedAt: new Date().toISOString(),
    context
  };
}

export async function getChildBadges(childId) {
  // Initialize default awards if needed
  await initializeDefaultAwards(childId);
  
  const catalog = await loadBadgeCatalog();
  const awards = getBadgeAwardsFromStorage(childId);
  const awardedIds = new Set(awards.map((a) => a.badgeId));
  
  // Merge catalog with award status
  const badgesWithStatus = catalog.map((badge) => {
    const award = awards.find((a) => a.badgeId === badge.id);
    return {
      ...badge,
      unlocked: awardedIds.has(badge.id),
      awardedAt: award?.awardedAt || null,
      progress: null // Will be calculated if needed
    };
  });
  
  return badgesWithStatus;
}

export async function getBadgeProgress(childId, badgeId) {
  const rule = (await loadBadgeRules()).find((r) => r.badgeId === badgeId);
  if (!rule) return null;
  
  const result = await evaluateRule(rule, childId, {});
  return result.progress || null;
}

export function logBadgeEvent(eventName, eventData = {}) {
  if (!USE_ANALYTICS_QUEUE) return;

  const event = {
    event_name: eventName,
    event_data: {
      ...eventData,
      timestamp: new Date().toISOString(),
      source: 'badge_system'
    },
    timestamp: new Date().toISOString(),
    source: 'badge_system'
  };

  try {
    const queue = JSON.parse(localStorage.getItem(ANALYTICS_QUEUE_KEY) || '[]');
    queue.push(event);
    localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[badges] Failed to queue analytics event', error);
  }

  // If Supabase is configured, also try direct send (future)
  if (EDGE_ANALYTICS_URL && hasSupabaseConfig()) {
    fetch(EDGE_ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch((error) => {
      console.warn('[badges] Analytics send failed, queued only', error);
    });
  }
}



