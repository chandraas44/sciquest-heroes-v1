import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

const EDGE_ANALYTICS_URL = import.meta.env?.VITE_EDGE_ANALYTICS_URL || '';
const USE_DASHBOARD_MOCKS = (import.meta.env?.VITE_USE_DASHBOARD_MOCKS ?? 'true') === 'true';
const USE_ANALYTICS_QUEUE = true;
const ANALYTICS_QUEUE_KEY = 'sqh_analytics_queue_v1';

let supabaseClient = null;
let cachedMockDashboardData = null;

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
  if (USE_DASHBOARD_MOCKS) return true;
  return !hasSupabaseConfig();
}

export function isUsingDashboardMocks() {
  return shouldUseMockData();
}

async function loadMockDashboardData() {
  if (cachedMockDashboardData) return cachedMockDashboardData;
  const res = await fetch(new URL('./mockDashboardData.json', import.meta.url));
  if (!res.ok) {
    throw new Error('Unable to load mock dashboard data');
  }
  const data = await res.json();
  cachedMockDashboardData = data;
  return cachedMockDashboardData;
}

export async function getParentChildren(parentId) {
  if (!parentId) throw new Error('parentId is required');
  
  if (shouldUseMockData()) {
    const data = await loadMockDashboardData();
    return data.children.filter((child) => child.parentId === parentId) || [];
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockDashboardData();
    return data.children.filter((child) => child.parentId === parentId) || [];
  }

  try {
    const { data, error } = await client
      .rpc('get_parent_children', { parent_user_id: parentId })
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[dashboard] Supabase children fetch failed, reverting to mock data', error);
    const data = await loadMockDashboardData();
    return data.children.filter((child) => child.parentId === parentId) || [];
  }
}

export async function getChildProgress(childId) {
  if (!childId) throw new Error('childId is required');
  
  if (shouldUseMockData()) {
    const data = await loadMockDashboardData();
    return data.progress[childId] || null;
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockDashboardData();
    return data.progress[childId] || null;
  }

  try {
    // Aggregate story progress
    const { data: storyProgress, error: storyError } = await client
      .from('story_progress')
      .select('*')
      .eq('user_id', childId);

    if (storyError) throw storyError;

    // Aggregate quiz attempts
    const { data: quizAttempts, error: quizError } = await client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', childId);

    if (quizError) throw quizError;

    // Aggregate chat interactions
    const { data: chatInteractions, error: chatError } = await client
      .from('chat_messages')
      .select('*')
      .eq('user_id', childId);

    if (chatError) throw chatError;

    // Transform to match mock structure
    return {
      stories: aggregateStoryProgress(storyProgress || []),
      quizzes: aggregateQuizProgress(quizAttempts || []),
      chat: aggregateChatProgress(chatInteractions || []),
      streak: calculateStreak(storyProgress || [], quizAttempts || [], chatInteractions || []),
      activity: aggregateActivity(storyProgress || [], quizAttempts || [], chatInteractions || [])
    };
  } catch (error) {
    console.warn('[dashboard] Supabase progress fetch failed, reverting to mock data', error);
    const data = await loadMockDashboardData();
    return data.progress[childId] || null;
  }
}

export async function getChildBadges(childId) {
  if (!childId) throw new Error('childId is required');
  
  if (shouldUseMockData()) {
    const data = await loadMockDashboardData();
    const childProgress = data.progress[childId] || null;
    const coreBadges = data.badges?.coreBadges || [];
    
    return {
      coreBadges: coreBadges.map((badge) => ({
        ...badge,
        unlocked: badge.unlockedFor?.includes(childId) || false
      }))
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    const data = await loadMockDashboardData();
    const coreBadges = data.badges?.coreBadges || [];
    return {
      coreBadges: coreBadges.map((badge) => ({
        ...badge,
        unlocked: badge.unlockedFor?.includes(childId) || false
      }))
    };
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
  } catch (error) {
    console.warn('[dashboard] Supabase badges fetch failed, reverting to mock data', error);
    const data = await loadMockDashboardData();
    const coreBadges = data.badges?.coreBadges || [];
    return {
      coreBadges: coreBadges.map((badge) => ({
        ...badge,
        unlocked: badge.unlockedFor?.includes(childId) || false
      }))
    };
  }
}

// Helper functions for Supabase aggregation (future use)
function aggregateStoryProgress(storyProgress) {
  const completed = storyProgress.filter((sp) => sp.completed).length;
  const inProgress = storyProgress.filter((sp) => !sp.completed && sp.last_panel_index > 0).length;
  
  // Group by topic
  const byTopic = {};
  storyProgress.forEach((sp) => {
    const topic = sp.topic_tag || 'Unknown';
    if (!byTopic[topic]) {
      byTopic[topic] = { storiesRead: 0, inProgress: 0, lastOpened: null, completionPercentage: 0 };
    }
    if (sp.completed) {
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

