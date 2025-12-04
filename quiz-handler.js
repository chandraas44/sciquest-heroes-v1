import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';
import { createSupabaseClientAsync } from './config.js';

let supabase = null;

async function getSupabaseClient() {
  if (!supabase) {
    supabase = await createSupabaseClientAsync(createClient);
  }
  return supabase;
}

/**
 * Determines the appropriate quiz level based on grade level
 * @param {string|number} gradeLevel - The student's grade level (K, 0-6, or string representation)
 * @returns {string} - Returns 'beginner', 'intermediate', or 'advanced'
 */
export function determineQuizLevel(gradeLevel) {
    if (!gradeLevel) {
        return 'beginner'; // Default fallback
    }

    // Handle 'K' or 'Kindergarten' as grade 0
    const gradeStr = String(gradeLevel).toLowerCase().trim();
    if (gradeStr === 'k' || gradeStr === 'kindergarten') {
        return 'beginner';
    }

    const grade = parseInt(gradeLevel);
    
    // K-6 split into three levels
    if (grade === 0 || grade === 1 || grade === 2) {
        return 'beginner'; // K, 1st, 2nd grade
    }
    if (grade === 3 || grade === 4) {
        return 'intermediate'; // 3rd, 4th grade
    }
    if (grade === 5 || grade === 6) {
        return 'advanced'; // 5th, 6th grade
    }
    
    return 'beginner'; // Default fallback for any other value
}

/**
 * Saves quiz results to the database
 * @param {string} userId - The user's UUID
 * @param {string} topic - The quiz topic (e.g., "photosynthesis")
 * @param {string} level - The quiz level ("beginner", "intermediate", "advanced")
 * @param {number} score - The number of correct answers (0-10)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveQuizResult(userId, topic, level, score) {
    try {
        const { data, error } = await supabase
            .from('quiz_results')
            .insert([
                {
                    user_id: userId,
                    quiz_topic: topic,
                    quiz_level: level,
                    score: score,
                    total_questions: 10,
                    completed_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('Error saving quiz result:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Exception saving quiz result:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Gets the current authenticated user's ID
 * @returns {Promise<string|null>} - Returns user ID or null if not authenticated
 */
export async function getCurrentUserId() {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return null;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
            return null;
        }
        return session.user.id;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Gets quiz results for the current user
 * @param {string} topic - Optional topic filter
 * @returns {Promise<Array>} - Returns array of quiz results
 */
export async function getUserQuizResults(topic = null) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return [];
        }

        let query = supabase
            .from('quiz_results')
            .select('*')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false });

        if (topic) {
            query = query.eq('quiz_topic', topic);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching quiz results:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Exception fetching quiz results:', error);
        return [];
    }
}

