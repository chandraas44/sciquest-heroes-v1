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
export async function getUserProfile() {
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

    // Fetch user profile - get grade_level (primary) and age (fallback for backward compatibility)
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
 * Maps grade_level to quiz difficulty (age is fallback for backward compatibility)
 * Grade mapping:
 * - Grades 1-2: beginner
 * - Grades 3-4: intermediate
 * - Grades 5-6: advanced
 * @param {string} gradeLevel - User's grade level (primary)
 * @param {number} age - User's age (5-12) - fallback for backward compatibility
 * @returns {string} Quiz difficulty: "beginner", "intermediate", or "advanced"
 */
function mapGradeLevelToQuizDifficulty(gradeLevel = null, age = null) {
  // First, try to use grade_level if available (primary)
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

  // Fallback to age if grade_level is not available (backward compatibility)
  if (age && typeof age === 'number') {
    if (age >= 5 && age <= 7) {
      return 'beginner'; // K-2: Ages 5-7
    } else if (age >= 8 && age <= 9) {
      return 'intermediate'; // 3-4: Ages 8-9
    } else if (age >= 10 && age <= 12) {
      return 'advanced'; // 5-6: Ages 10-12
    }
  }

  // Default to beginner if neither grade_level nor age is available
  console.warn('[quiz-routing] No grade_level or age available, defaulting to beginner');
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

  // Get user profile to determine quiz difficulty (prefer grade_level, fallback to age for backward compatibility)
  const profile = await getUserProfile();
  const gradeLevel = profile?.grade_level || null;
  const age = profile?.age || null;

  // Map grade_level (or age as fallback) to quiz difficulty
  const difficulty = mapGradeLevelToQuizDifficulty(gradeLevel, age);

  // Return the appropriate quiz URL
  return `/quizzes/photosynthesis-quiz-${difficulty}.html`;
}

/**
 * Clears the cached user profile (useful for testing or after profile updates)
 */
export function clearProfileCache() {
  userProfileCache = null;
}

