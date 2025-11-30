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
    
    // Query all records and filter manually to handle both user_id and child_id
    let storyProgress = [];
    
    if (allProgress && allProgress.length > 0) {
      // Check which field exists in the table
      const hasUserId = 'user_id' in allProgress[0];
      const hasChildId = 'child_id' in allProgress[0];
      
      // Filter records that match the childId
      storyProgress = allProgress.filter(record => {
        const recordUserId = hasUserId ? record.user_id : (hasChildId ? record.child_id : null);
        return recordUserId && String(recordUserId) === String(childId);
      });
      
      console.log('[dashboard] Filtered', storyProgress.length, 'matching records');
    } else {
      // If no records at all, try direct query
      const { data: directQuery, error: directError } = await client
        .from('story_progress')
        .select('*')
        .eq('user_id', childId);
      
      if (!directError && directQuery) {
        storyProgress = directQuery;
      } else {
        // Try child_id as fallback
        const { data: childIdQuery, error: childIdError } = await client
          .from('story_progress')
          .select('*')
          .eq('child_id', childId);
        
        if (!childIdError && childIdQuery) {
          storyProgress = childIdQuery;
        }
      }
    }
    
    console.log('[dashboard] Found story progress records:', storyProgress?.length || 0);
    
    // Get topic_tag and title from stories table for each story_id
    let mappedProgress = storyProgress || [];
    if (mappedProgress.length > 0) {
      const storyIds = [...new Set(mappedProgress.map(sp => sp.story_id))];
      try {
        const { data: stories } = await client
          .from('stories')
          .select('id, topic_tag, title')
          .in('id', storyIds);
        
        const storyMap = {};
        (stories || []).forEach(s => { 
          storyMap[s.id] = { topic_tag: s.topic_tag, title: s.title };
        });
        
        mappedProgress = mappedProgress.map(sp => ({
          ...sp,
          topic_tag: storyMap[sp.story_id]?.topic_tag || 'General',
          story_title: storyMap[sp.story_id]?.title || sp.story_id
        }));
        
        console.log('[dashboard] Mapped progress with story data:', mappedProgress.length, 'records');
        if (mappedProgress.length > 0) {
          console.log('[dashboard] Sample record:', {
            story_id: mappedProgress[0].story_id,
            story_title: mappedProgress[0].story_title,
            topic_tag: mappedProgress[0].topic_tag,
            last_panel_index: mappedProgress[0].last_panel_index,
            completed_at: mappedProgress[0].completed_at
          });
        }
      } catch (topicError) {
        console.warn('[dashboard] Failed to fetch story data, using defaults:', topicError);
        mappedProgress = mappedProgress.map(sp => ({
          ...sp,
          topic_tag: sp.topic_tag || 'General',
          story_title: sp.story_id
        }));
      }
    }

    // Aggregate quiz results
    const { data: quizResults, error: quizError } = await client
      .from('quiz_results')
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
    const quizData = quizResults || [];
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
  if (!storyProgress || storyProgress.length === 0) {
    return {
      completed: 0,
      inProgress: 0,
      total: 0,
      byTopic: []
    };
  }

  // Fixed: Use completed_at (timestamp) instead of completed (boolean)
  const completed = storyProgress.filter((sp) => sp.completed_at != null).length;
  const inProgress = storyProgress.filter((sp) => sp.completed_at == null && sp.last_panel_index > 0).length;

  // Group by topic and calculate completion percentage
  const byTopic = {};
  storyProgress.forEach((sp) => {
    const topic = sp.topic_tag || 'General';
    if (!byTopic[topic]) {
      byTopic[topic] = { 
        storiesRead: 0, 
        inProgress: 0, 
        lastOpened: null, 
        completionPercentage: 0,
        totalStories: 0,
        completedPanels: 0,
        totalPanels: 0
      };
    }
    
    byTopic[topic].totalStories++;
    
    // Count completed stories
    if (sp.completed_at != null) {
      byTopic[topic].storiesRead++;
    } 
    // Count in-progress stories (has progress but not completed)
    else if (sp.last_panel_index > 0) {
      byTopic[topic].inProgress++;
    }
    
    // Track panel progress for percentage
    const currentPanels = sp.last_panel_index || 0;
    byTopic[topic].completedPanels += currentPanels;
    // Assume stories have ~10 panels on average for percentage calculation
    byTopic[topic].totalPanels += 10;
    
    // Track most recent activity
    const recordDate = sp.updated_at || sp.created_at;
    if (recordDate && (!byTopic[topic].lastOpened || new Date(recordDate) > new Date(byTopic[topic].lastOpened))) {
      byTopic[topic].lastOpened = recordDate;
    }
  });

  // Calculate completion percentage for each topic
  const byTopicArray = Object.entries(byTopic).map(([topic, data]) => {
    // Calculate percentage based on panels completed vs total panels
    const completionPercent = data.totalPanels > 0 
      ? Math.min(100, Math.round((data.completedPanels / data.totalPanels) * 100))
      : 0;
    
    return {
      topic,
      icon: getTopicIcon(topic),
      storiesRead: data.storiesRead,
      inProgress: data.inProgress,
      lastOpened: data.lastOpened,
      completionPercentage: completionPercent
    };
  });

  return {
    completed,
    inProgress,
    total: storyProgress.length,
    byTopic: byTopicArray
  };
}

function aggregateQuizProgress(quizResults) {
  if (!quizResults || !quizResults.length) {
    return { attempts: 0, averageScore: 0, byTopic: [] };
  }

  const totalScore = quizResults.reduce((sum, result) => sum + (result.score || 0), 0);
  const averageScore = Math.round(totalScore / quizResults.length);

  // Group by topic (quiz_results uses quiz_topic, map to topic_tag for consistency)
  const byTopic = {};
  quizResults.forEach((result) => {
    // Use quiz_topic from quiz_results table, fallback to 'Unknown'
    const topic = result.quiz_topic || 'Unknown';
    if (!byTopic[topic]) {
      byTopic[topic] = { attempts: 0, scores: [], lastAttempt: null };
    }
    byTopic[topic].attempts++;
    byTopic[topic].scores.push(result.score || 0);
    // Use completed_at from quiz_results (preferred) or created_at as fallback
    const attemptDate = result.completed_at || result.created_at;
    if (!byTopic[topic].lastAttempt || new Date(attemptDate) > new Date(byTopic[topic].lastAttempt)) {
      byTopic[topic].lastAttempt = attemptDate;
    }
  });

  return {
    attempts: quizResults.length,
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

function calculateStreak(storyProgress, quizResults, chatInteractions) {
  // Simple streak calculation based on last activity
  const allActivities = [
    ...storyProgress.map((sp) => new Date(sp.updated_at || sp.created_at)),
    ...quizResults.map((qr) => new Date(qr.completed_at || qr.created_at)),
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

function aggregateActivity(storyProgress, quizResults, chatInteractions) {
  const last7Days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const activities = [
      ...storyProgress.filter((sp) => (sp.updated_at || sp.created_at)?.startsWith(dateStr)),
      ...quizResults.filter((qr) => (qr.completed_at || qr.created_at)?.startsWith(dateStr)),
      ...chatInteractions.filter((ci) => ci.created_at?.startsWith(dateStr))
    ];

    last7Days.push({
      date: dateStr,
      sessions: new Set(activities.map((a) => a.user_id || a.id)).size
    });
  }

  // Topics explored
  const topicsExplored = {};
  [...storyProgress, ...quizResults, ...chatInteractions].forEach((activity) => {
    // Handle quiz_results which uses quiz_topic instead of topic_tag
    const topic = activity.topic_tag || activity.quiz_topic || activity.topic_id || 'Unknown';
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

