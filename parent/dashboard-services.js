import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';

const USE_ANALYTICS_QUEUE = true;
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';
const DASHBOARD_PROGRESS_KEY = 'sqh_dashboard_progress_v1';

let supabaseClient = null;
let cachedMockDashboardData = null;


function hasSupabaseConfig() {
  return Boolean(supabaseConfig?.url && supabaseConfig?.anonKey);
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabaseClient;
}

function buildEmptyChildProgress(childId, reason = "fallback") {
   return {
    stories: aggregateStoryProgress([]),
    quizzes: aggregateQuizProgress([]),
    chat: aggregateChatProgress([]),
    streak: calculateStreak([], [], []),
    activity: aggregateActivity([], [], [])
  };
}

function getStoredDashboardProgress(childId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_PROGRESS_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    return store[childId] || null;
  } catch (error) {
    console.warn('[dashboard] Unable to read stored dashboard progress', error);
    return null;
  }
}

async function getMockDashboardProgress(childId) {
  if (cachedMockDashboardData) {
    return cachedMockDashboardData.progress?.[childId] || null;
  }

  try {
    const response = await fetch('/parent/mockDashboardData.json');
    if (!response.ok) {
      console.warn('[dashboard] Failed to load mock dashboard data');
      return null;
    }
    cachedMockDashboardData = await response.json();
    return cachedMockDashboardData.progress?.[childId] || null;
  } catch (error) {
    console.warn('[dashboard] Error loading mock dashboard data', error);
    return null;
  }
}

export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function getParentChildren(parentId) {
  if (!parentId) throw new Error('parentId is required');
  console.log('[dashboard] getParentChildren called for:', parentId);

  const client = getSupabaseClient();
  if (!client) {
    console.warn('[dashboard] No Supabase client available');
    return [];
  }

  try {
    console.log('[dashboard] Fetching children from Supabase...');
    const { data, error } = await client
      .rpc('get_parent_children', { parent_user_id: parentId });

    if (error) {
      console.error('[dashboard] Supabase RPC error:', error);
      throw error;
    }
    console.log('[dashboard] Supabase returned children:', data);

    // Map snake_case to camelCase for frontend
    return (data || []).map(child => ({
      ...child,
      firstName: child.first_name,
      avatarUrl: child.avatar_url,
      gradeLevel: child.grade_level
    }));
  } catch (error) {
    console.warn('[dashboard] Supabase children fetch failed', error);
    return [];
  }
}

export async function getChildProgress(childId) {
  if (!childId) throw new Error('childId is required');

  const client = getSupabaseClient();
  if (!client) {
    return buildEmptyChildProgress(childId, "no_supabase_client");
  }
  
  try {
    // Aggregate story progress
    console.log('[dashboard] ===== STORY PROGRESS DEBUG =====');
    console.log('[dashboard] Querying for childId (user_id):', childId);
    console.log('[dashboard] childId type:', typeof childId);
    
    // First, check what columns exist and what data is in the table
    const { data: allProgress, error: allError } = await client
      .from('story_progress')
      .select('*')
      .limit(10);
    
    console.log('[dashboard] ALL story_progress records (sample):', allProgress);
    console.log('[dashboard] Total records in table:', allProgress?.length || 0);
    
    if (allProgress && allProgress.length > 0) {
      const firstRecord = allProgress[0];
      console.log('[dashboard] Sample record structure:', Object.keys(firstRecord));
      console.log('[dashboard] Sample record user_id:', firstRecord.user_id, 'Type:', typeof firstRecord.user_id);
      console.log('[dashboard] Sample record child_id:', firstRecord.child_id, 'Type:', typeof firstRecord.child_id);
      console.log('[dashboard] Comparing - Querying for:', childId, 'Type:', typeof childId);
      allProgress.forEach((record, idx) => {
        const recordUserId = record.user_id || record.child_id;
        console.log(`[dashboard] Record ${idx}: user_id=${record.user_id}, child_id=${record.child_id}, matches=${String(recordUserId) === String(childId)}`);
      });
    }
    
    // Try querying with user_id first
    let storyProgress = null;
    let storyError = null;
    
    const { data: progressByUserId, error: errorByUserId } = await client
      .from('story_progress')
      .select('*')
      .eq('user_id', childId);
    
    if (!errorByUserId && progressByUserId) {
      storyProgress = progressByUserId;
      console.log('[dashboard] Found', storyProgress.length, 'records with user_id match');
    } else {
      console.warn('[dashboard] Query by user_id failed or returned empty, trying child_id...');
      // Fallback: try child_id if user_id doesn't work
      const { data: progressByChildId, error: errorByChildId } = await client
        .from('story_progress')
        .select('*')
        .eq('child_id', childId);
      
      if (!errorByChildId && progressByChildId) {
        storyProgress = progressByChildId;
        console.log('[dashboard] Found', storyProgress.length, 'records with child_id match');
      } else {
        storyError = errorByChildId || errorByUserId;
        console.error('[dashboard] Both queries failed');
      }
    }
    
    if (storyError) {
      console.error('[dashboard] ❌ Story progress query error:', storyError);
      throw storyError;
    }
    
    console.log('[dashboard] Found story progress records:', storyProgress?.length || 0);
    
    // Get topic_tag from stories table for each story_id
    let mappedProgress = storyProgress || [];
    if (mappedProgress.length > 0) {
      const storyIds = [...new Set(mappedProgress.map(sp => sp.story_id))];
      try {
        const { data: stories } = await client
          .from('stories')
          .select('id, topic_tag')
          .in('id', storyIds);
        
        const topicMap = {};
        (stories || []).forEach(s => { topicMap[s.id] = s.topic_tag; });
        
        mappedProgress = mappedProgress.map(sp => ({
          ...sp,
          topic_tag: topicMap[sp.story_id] || null
        }));
      } catch (topicError) {
        console.warn('[dashboard] Failed to fetch topic_tags, continuing without them:', topicError);
      }
      
      if (mappedProgress.length > 0) {
        console.log('[dashboard] Sample record:', mappedProgress[0]);
      }
    }

    // Aggregate quiz attempts
    const { data: quizAttempts, error: quizError } = await client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', childId);

    if (quizError) throw quizError;

    // Aggregate chat interactions from chat_sessions
    // Chat sessions store messages as JSON array, so we need to extract them
    const { data: chatSessions, error: chatError } = await client
      .from('chat_sessions')
      .select('*')
      .eq('user_id', childId);

    if (chatError) throw chatError;
    
    // Extract individual messages from chat sessions for dashboard aggregation
    const chatInteractions = [];
    if (chatSessions) {
      chatSessions.forEach((session) => {
        if (session.messages && Array.isArray(session.messages)) {
          session.messages.forEach((msg) => {
            chatInteractions.push({
              role: msg.role,
              topic_id: session.topic_id,
              created_at: msg.timestamp || session.updated_at || session.created_at
            });
          });
        }
      });
    }

    // Check if all arrays are empty (Supabase available but no data)
    const storyData = mappedProgress || [];
    const quizData = quizAttempts || [];
    const chatData = chatInteractions || [];
    
    const isEmpty = storyData.length === 0 && quizData.length === 0 && chatData.length === 0;
    
    if (isEmpty) {
      // Fallback order: localStorage -> mock data -> empty progress
      console.log('[dashboard] Supabase returned empty arrays, checking fallbacks...');
      
      // a) Check localStorage
      const storedProgress = getStoredDashboardProgress(childId);
      if (
        storedProgress &&
        storedProgress.stories &&
        storedProgress.quizzes &&
        storedProgress.chat &&
        storedProgress.streak &&
        storedProgress.activity
      ) {
        console.log('[dashboard] Using stored dashboard progress from localStorage');
        return storedProgress;
      }
            
      // b) Check mock data
      const mockProgress = await getMockDashboardProgress(childId);
      if (
        mockProgress &&
        mockProgress.stories &&
        mockProgress.quizzes &&
        mockProgress.chat &&
        mockProgress.streak &&
        mockProgress.activity
      ) {
        console.log('[dashboard] Using mock dashboard progress');
        return mockProgress;
      }
            
      // c) Return empty fallback
      console.log('[dashboard] Using empty progress fallback');
      return buildEmptyChildProgress(childId, "empty_data_fallback");
    }

    // Transform to match mock structure
    return {
      stories: aggregateStoryProgress(storyData),
      quizzes: aggregateQuizProgress(quizData),
      chat: aggregateChatProgress(chatData),
      streak: calculateStreak(storyData, quizData, chatData),
      activity: aggregateActivity(storyData, quizData, chatData)
    };
  } catch (err) {
    console.warn("getChildProgress fallback:", err);
    return buildEmptyChildProgress(childId, "supabase_error");
  }
  }

export async function getChildBadges(childId) {
  if (!childId) throw new Error('childId is required');

  // Use badge-services.js for consistency (handles both mock and real data)
  try {
    const { getChildBadges: getBadgesFromService, getBadgeAwards } = await import('../badges/badge-services.js');
    const badges = await getBadgesFromService(childId);
    const awards = getBadgeAwards(childId);

    // Map to dashboard format
    return {
      coreBadges: badges.map((badge) => ({
        ...badge,
        unlocked: badge.unlocked || false,
        awardedAt: badge.awardedAt || null,
        // Keep hint and description for display
        hint: badge.hint || badge.description
      }))
    };
  } catch (error) {
    console.warn('[dashboard] Badge service unavailable, using fallback', error);

    // Fallback to mock data directly
    const client = getSupabaseClient();
    if (!client) {
      return { coreBadges: [] };
    }

    try {
      const { data, error } = await client
        .from('badge_awards')
        .select('badge_id, awarded_at')
        .eq('user_id', childId);

      if (error) throw error;

      // Fetch badge definitions
      const { data: badgeDefs, error: defError } = await client
        .from('badges')
        .select('*');

      if (defError) throw defError;

      const unlockedIds = new Set((data || []).map((award) => award.badge_id));

      return {
        coreBadges: (badgeDefs || []).map((badge) => ({
          ...badge,
          unlocked: unlockedIds.has(badge.id),
          awardedAt: unlockedIds.has(badge.id)
            ? (data || []).find((a) => a.badge_id === badge.id)?.awarded_at
            : null
        }))
      };
    } catch (dbError) {
      console.warn('[dashboard] Supabase badges fetch failed', dbError);
      return { coreBadges: [] };
    }
  }
}

// Helper functions for Supabase aggregation (future use)
function aggregateStoryProgress(storyProgress) {
  // Fixed: Use completed_at (timestamp) instead of completed (boolean)
  const completed = storyProgress.filter((sp) => sp.completed_at != null).length;
  const inProgress = storyProgress.filter((sp) => sp.completed_at == null && sp.last_panel_index > 0).length;

  // Group by topic
  const byTopic = {};
  storyProgress.forEach((sp) => {
    const topic = sp.topic_tag || 'Unknown';
    if (!byTopic[topic]) {
      byTopic[topic] = { storiesRead: 0, inProgress: 0, lastOpened: null, completionPercentage: 0 };
    }
    if (sp.completed_at != null) {
      byTopic[topic].storiesRead++;
    } else if (sp.last_panel_index > 0) {
      byTopic[topic].inProgress++;
    }
    if (!byTopic[topic].lastOpened || new Date(sp.updated_at) > new Date(byTopic[topic].lastOpened)) {
      byTopic[topic].lastOpened = sp.updated_at;
    }
  });

  return {
    completed,
    inProgress,
    total: storyProgress.length,
    byTopic: Object.entries(byTopic).map(([topic, data]) => ({
      topic,
      icon: getTopicIcon(topic),
      ...data
    }))
  };
}

function aggregateQuizProgress(quizAttempts) {
  if (!quizAttempts.length) {
    return { attempts: 0, averageScore: 0, byTopic: [] };
  }

  const totalScore = quizAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
  const averageScore = Math.round(totalScore / quizAttempts.length);

  // Group by topic
  const byTopic = {};
  quizAttempts.forEach((attempt) => {
    const topic = attempt.topic_tag || 'Unknown';
    if (!byTopic[topic]) {
      byTopic[topic] = { attempts: 0, scores: [], lastAttempt: null };
    }
    byTopic[topic].attempts++;
    byTopic[topic].scores.push(attempt.score || 0);
    if (!byTopic[topic].lastAttempt || new Date(attempt.created_at) > new Date(byTopic[topic].lastAttempt)) {
      byTopic[topic].lastAttempt = attempt.created_at;
    }
  });

  return {
    attempts: quizAttempts.length,
    averageScore,
    byTopic: Object.entries(byTopic).map(([topic, data]) => ({
      topic,
      attempts: data.attempts,
      bestScore: Math.max(...data.scores),
      lastAttempt: data.lastAttempt,
      averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
    }))
  };
}

function aggregateChatProgress(chatInteractions) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const questionsThisWeek = chatInteractions.filter(
    (msg) => msg.role === 'user' && new Date(msg.created_at) >= weekAgo
  ).length;

  const topicsExplored = new Set(chatInteractions.map((msg) => msg.topic_id).filter(Boolean)).size;

  return {
    questionsThisWeek,
    totalQuestions: chatInteractions.filter((msg) => msg.role === 'user').length,
    topicsExplored
  };
}

function calculateStreak(storyProgress, quizAttempts, chatInteractions) {
  // Simple streak calculation based on last activity
  const allActivities = [
    ...storyProgress.map((sp) => new Date(sp.updated_at)),
    ...quizAttempts.map((qa) => new Date(qa.created_at)),
    ...chatInteractions.map((ci) => new Date(ci.created_at))
  ];

  if (!allActivities.length) {
    return { days: 0, lastActivity: null };
  }

  const lastActivity = new Date(Math.max(...allActivities.map((d) => d.getTime())));

  // Calculate consecutive days with activity (simplified)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    const hasActivity = allActivities.some((activityDate) => {
      const activityDay = new Date(activityDate);
      activityDay.setHours(0, 0, 0, 0);
      return activityDay.getTime() === checkDate.getTime();
    });

    if (hasActivity) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    days: streak,
    lastActivity: lastActivity.toISOString()
  };
}

function aggregateActivity(storyProgress, quizAttempts, chatInteractions) {
  const last7Days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const activities = [
      ...storyProgress.filter((sp) => sp.updated_at?.startsWith(dateStr)),
      ...quizAttempts.filter((qa) => qa.created_at?.startsWith(dateStr)),
      ...chatInteractions.filter((ci) => ci.created_at?.startsWith(dateStr))
    ];

    last7Days.push({
      date: dateStr,
      sessions: new Set(activities.map((a) => a.user_id || a.id)).size
    });
  }

  // Topics explored
  const topicsExplored = {};
  [...storyProgress, ...quizAttempts, ...chatInteractions].forEach((activity) => {
    const topic = activity.topic_tag || activity.topic_id || 'Unknown';
    topicsExplored[topic] = (topicsExplored[topic] || 0) + 1;
  });

  return {
    last7Days,
    topicsExplored: Object.entries(topicsExplored).map(([topic, count]) => ({
      topic,
      count
    }))
  };
}

function getTopicIcon(topic) {
  const iconMap = {
    'Photosynthesis': '🌱',
    'Solar System': '🪐',
    'Moon & Gravity': '🌙',
    'Ocean Life': '🌊',
    'Dinosaurs': '🦖',
    'Robotics': '🤖'
  };
  return iconMap[topic] || '📚';
}

export function logAnalyticsEvent(eventName, eventData = {}) {
  if (!USE_ANALYTICS_QUEUE) return;

  const event = {
    event_name: eventName,
    event_data: eventData,
    timestamp: new Date().toISOString(),
    source: 'parent_dashboard'
  };

  try {
    const queue = JSON.parse(localStorage.getItem(ANALYTICS_QUEUE_KEY) || '[]');
    queue.push(event);
    localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[dashboard] Failed to queue analytics event', error);
  }

  // If Supabase is configured, also try direct send (future)
  if (EDGE_ANALYTICS_URL && hasSupabaseConfig()) {
    fetch(EDGE_ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch((error) => {
      console.warn('[dashboard] Analytics send failed, queued only', error);
    });
  }
}

