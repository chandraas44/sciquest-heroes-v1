/**
 * Quiz Routing Utility
 * Routes users to appropriate quiz based on grade level for Photosynthesis stories
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { supabaseConfig } from '../config.js';

let userProfileCache = null;

/**
 * Gets user profile from Supabase to extract grade level
 * @returns {Promise<Object|null>} User profile or null if not found
 */
async function getUserProfile() {
  // Return cached profile if available
  if (userProfileCache) {
    return userProfileCache;
  }

  try {
    // Check if Supabase is configured
    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      console.warn('[quiz-routing] Supabase not configured, using default quiz');
      return null;
    }

    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.warn('[quiz-routing] No active session, using default quiz');
      return null;
    }

    // Fetch user profile - get age instead of grade_level since grade is derived from age
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('age, grade_level, account_type')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[quiz-routing] Failed to fetch profile:', profileError);
      return null;
    }

    // Cache the profile
    userProfileCache = profile;
    return profile;
  } catch (error) {
    console.warn('[quiz-routing] Error fetching user profile:', error);
    return null;
  }
}

/**
 * Maps age to quiz difficulty (grade level is derived from age)
 * Age mapping:
 * - Age 5-7: K-2 → beginner
 * - Age 8-9: 3-4 → intermediate
 * - Age 10-12: 5-6 → advanced
 * @param {number} age - User's age (5-12)
 * @param {string} gradeLevel - Optional grade_level from database (fallback if age not available)
 * @returns {string} Quiz difficulty: "beginner", "intermediate", or "advanced"
 */
function mapAgeToQuizDifficulty(age, gradeLevel = null) {
  // First, try to use age if available
  if (age && typeof age === 'number') {
    if (age >= 5 && age <= 7) {
      return 'beginner'; // K-2: Ages 5-7
    } else if (age >= 8 && age <= 9) {
      return 'intermediate'; // 3-4: Ages 8-9
    } else if (age >= 10 && age <= 12) {
      return 'advanced'; // 5-6: Ages 10-12
    }
  }

  // Fallback to grade_level if age is not available
  if (gradeLevel) {
    const grade = String(gradeLevel).toLowerCase().trim();

    // K-2 → beginner
    if (
      grade.includes('k') ||
      grade === 'k-2' ||
      grade === 'k' ||
      grade.includes('kindergarten') ||
      grade === 'grade k' ||
      grade === 'grade 1' ||
      grade === '1' ||
      grade === 'grade 2' ||
      grade === '2' ||
      grade.startsWith('k-')
    ) {
      return 'beginner';
    }

    // 3-4 → intermediate
    if (
      grade === '3-4' ||
      grade === 'grade 3' ||
      grade === '3' ||
      grade === 'grade 4' ||
      grade === '4'
    ) {
      return 'intermediate';
    }

    // 5-6 → advanced
    if (
      grade === '5-6' ||
      grade === 'grade 5' ||
      grade === '5' ||
      grade === 'grade 6' ||
      grade === '6'
    ) {
      return 'advanced';
    }
  }

  // Default to beginner if neither age nor grade_level is available
  console.warn('[quiz-routing] No age or grade_level available, defaulting to beginner');
  return 'beginner';
}

/**
 * Determines if a story is about Photosynthesis
 * @param {Object} story - Story object with topicTag or other metadata
 * @returns {boolean} True if story is about Photosynthesis
 */
function isPhotosynthesisStory(story) {
  if (!story) return false;

  // Check topicTag for Photosynthesis
  const topicTag = String(story.topicTag || '').toLowerCase();
  if (topicTag.includes('photosynthesis') || topicTag.includes('plant')) {
    return true;
  }

  // Check story ID for photosynthesis
  const storyId = String(story.id || '').toLowerCase();
  if (storyId.includes('photosynthesis') || storyId.includes('photosynth')) {
    return true;
  }

  // Check title for photosynthesis
  const title = String(story.title || '').toLowerCase();
  if (title.includes('photosynthesis') || title.includes('plant')) {
    return true;
  }

  return false;
}

/**
 * Gets the quiz URL based on grade level for Photosynthesis stories
 * @param {Object} story - Story object
 * @returns {Promise<string>} Quiz URL
 */
export async function getQuizUrl(story) {
  // Check if story is about Photosynthesis
  if (!isPhotosynthesisStory(story)) {
    // For non-Photosynthesis stories, return default/fallback URL
    // Currently returns the old route format as fallback
    return `/stories/${story?.id || 'unknown'}/quiz`;
  }

  // Get user profile to determine quiz difficulty (prefer age, fallback to grade_level)
  const profile = await getUserProfile();
  const age = profile?.age || null;
  const gradeLevel = profile?.grade_level || null;

  // Map age (or grade_level) to quiz difficulty
  const difficulty = mapAgeToQuizDifficulty(age, gradeLevel);

  // Return the appropriate quiz URL
  return `/quizzes/photosynthesis-quiz-${difficulty}.html`;
}

/**
 * Clears the cached user profile (useful for testing or after profile updates)
 */
export function clearProfileCache() {
  userProfileCache = null;
}

