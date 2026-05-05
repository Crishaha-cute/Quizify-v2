import { QuizHistory, Difficulty } from '../types.ts';
import { supabase } from './supabase.ts';
import { getSupabaseAuthUser } from './authService.ts';

/**
 * History Service using Supabase Database
 * 
 * This service handles quiz history storage and retrieval using Supabase.
 * All operations are secured by Row Level Security (RLS) policies.
 */

/**
 * Get the current user's ID from Supabase Auth
 * @returns User ID (UUID) if authenticated, null otherwise
 */
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const user = await getSupabaseAuthUser();
    if (!user) return null;
    return user.id;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Retrieve quiz history for the current user
 * @returns Array of QuizHistory objects, sorted by date (newest first)
 */
export const getHistory = async (): Promise<QuizHistory[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('Cannot get history: no user is logged in.');
      return [];
    }

    // Query quiz_history table for the current user
    const { data, error } = await supabase
      .from('quiz_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quiz history:', error);
      throw new Error('Failed to retrieve quiz history. Please try again.');
    }

    if (!data) {
      return [];
    }

    // Convert database records to QuizHistory format
    const history: QuizHistory[] = data.map((record) => ({
      id: record.id,
      topic: record.topic,
      difficulty: record.difficulty,
      score: record.score,
      totalQuestions: record.total_questions,
      date: new Date(record.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));

    return history;
  } catch (error: any) {
    console.error('Error in getHistory:', error);
    // Return empty array on error to prevent app crash
    return [];
  }
};

/**
 * Save a quiz attempt to the database
 * @param topic - The quiz topic
 * @param difficulty - The difficulty level
 * @param score - The score achieved
 * @param totalQuestions - Total number of questions
 * @throws Error if save fails
 * @param rating - Optional rating (1-5 stars)
 */
export const saveHistory = async (
  topic: string,
  difficulty: Difficulty,
  score: number,
  points: number,
  totalQuestions: number,
  rating?: number
): Promise<string> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('Cannot save history: no user is logged in.');
      throw new Error('You must be logged in to save quiz history.');
    }

    // Insert new quiz history record
    const { data, error } = await supabase
      .from('quiz_history')
      .insert({
        user_id: userId,
        topic,
        difficulty,
        score,
        points,
        total_questions: totalQuestions,
        rating,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz history:', error);
      throw new Error('Failed to save quiz history. Please try again.');
    }

    if (!data) {
      throw new Error('Failed to save quiz history. No data returned.');
    }

    console.log('Quiz history saved successfully:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('Error in saveHistory:', error);
    // Re-throw with user-friendly message
    if (error.message) {
      throw error;
    }
    throw new Error('An unexpected error occurred while saving quiz history.');
  }
};

/**
 * Delete a quiz history entry
 * @param historyId - The ID of the history entry to delete
 * @throws Error if deletion fails
 */
export const deleteHistory = async (historyId: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to delete quiz history.');
    }

    const { error } = await supabase
      .from('quiz_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', userId); // Ensure user can only delete their own history

    if (error) {
      console.error('Error deleting quiz history:', error);
      throw new Error('Failed to delete quiz history. Please try again.');
    }
  } catch (error: any) {
    console.error('Error in deleteHistory:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('An unexpected error occurred while deleting quiz history.');
  }
};


/**
 * Update the rating for a quiz history entry
 * @param historyId - The ID of the history entry to update
 * @param rating - The new rating (1-5)
 * @throws Error if update fails
 */
export const updateHistoryRating = async (historyId: string, rating: number): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to rate a quiz.');
    }
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars.');
    }

    const { error } = await supabase
      .from('quiz_history')
      .update({ rating })
      .eq('id', historyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating quiz rating:', error);
      throw new Error('Failed to save rating. Please try again.');
    }
  } catch (error: any) {
    console.error('Error in updateHistoryRating:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('An unexpected error occurred while saving rating.');
  }
};

/**
 * Get quiz statistics for the current user
 * @returns Object with statistics (total quizzes, average score, etc.)
 */
export const getQuizStats = async (): Promise<{
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  totalQuestions: number;
} | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    // Use the database view for statistics
    const { data, error } = await supabase
      .from('user_quiz_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // If view doesn't exist or returns no data, calculate manually
      const history = await getHistory();
      if (history.length === 0) {
        return {
          totalQuizzes: 0,
          averageScore: 0,
          bestScore: 0,
          totalQuestions: 0,
        };
      }

      const totalQuizzes = history.length;
      const totalScore = history.reduce((sum, h) => sum + (h.score / h.totalQuestions) * 100, 0);
      const averageScore = totalScore / totalQuizzes;
      const bestScore = Math.max(...history.map((h) => (h.score / h.totalQuestions) * 100));
      const totalQuestions = history.reduce((sum, h) => sum + h.totalQuestions, 0);

      return {
        totalQuizzes,
        averageScore: Math.round(averageScore * 100) / 100,
        bestScore: Math.round(bestScore * 100) / 100,
        totalQuestions,
      };
    }

    return {
      totalQuizzes: data.total_quizzes || 0,
      averageScore: data.average_score_percentage ? Math.round(data.average_score_percentage * 100) / 100 : 0,
      bestScore: data.best_score ? Math.round((data.best_score / data.max_questions) * 100 * 100) / 100 : 0,
      totalQuestions: data.max_questions || 0,
    };
  } catch (error) {
    console.error('Error getting quiz stats:', error);
    return null;
  }
};