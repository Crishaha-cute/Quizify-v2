import { supabase } from './supabase.ts';
import { getSupabaseAuthUser } from './authService.ts';

export type ActivityAction = 'login' | 'quiz_attempt' | 'quiz_completion' | 'logout';

export interface Activity {
  id: string;
  user_id: string;
  action_type: ActivityAction;
  description?: string;
  created_at: string;
}

const getRangeInDays = (range: '3days' | '7days' | '30days') => {
  if (range === '3days') return 3;
  if (range === '7days') return 7;
  return 30;
};

const getRangeStartDate = (range: '3days' | '7days' | '30days') => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (getRangeInDays(range) - 1));
  return start;
};

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
 * Log a user activity
 * @param action_type - The type of action (login, quiz_attempt, quiz_completion, logout)
 * @param description - Optional description of the activity
 * @throws Error if logging fails
 */
export const logActivity = async (
  action_type: ActivityAction,
  description?: string
): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('Cannot log activity: no user is logged in.');
      return;
    }

    const { error } = await supabase
      .from('admin_activity_log')
      .insert({
        user_id: userId,
        action_type,
        description,
      });

    if (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should not break the app
    }
  } catch (error: any) {
    console.error('Error in logActivity:', error);
    // Silently fail - activity logging should not break the app
  }
};

/**
 * Get filtered activities based on time range
 * @param range - Time range: '3days', '7days', or '30days'
 * @returns Array of activities sorted by newest first
 */
export const getActivities = async (range: '3days' | '7days' | '30days' = '7days'): Promise<Activity[]> => {
  try {
    const startDate = getRangeStartDate(range);
    const endDate = new Date();

    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      throw new Error('Failed to retrieve activities. Please try again.');
    }

    if (!data) {
      return [];
    }

    // Map database records to Activity format
    const activities: Activity[] = data.map((record) => ({
      id: record.id,
      user_id: record.user_id,
      action_type: record.action_type,
      description: record.description,
      created_at: record.created_at,
    }));

    return activities;
  } catch (error: any) {
    console.error('Error in getActivities:', error);
    return [];
  }
};

/**
 * Get activity statistics
 * @param range - Time range: '3days', '7days', or '30days'
 * @returns Statistics about activities
 */
export const getActivityStats = async (
  range: '3days' | '7days' | '30days' = '7days',
  preloadedActivities?: Activity[]
) => {
  try {
    const activities = preloadedActivities ?? await getActivities(range);
    
    const stats = {
      totalActivities: activities.length,
      logins: activities.filter(a => a.action_type === 'login').length,
      quizAttempts: activities.filter(a => a.action_type === 'quiz_attempt').length,
      quizCompletions: activities.filter(a => a.action_type === 'quiz_completion').length,
      logouts: activities.filter(a => a.action_type === 'logout').length,
      uniqueUsers: new Set(activities.map(a => a.user_id)).size,
    };

    return stats;
  } catch (error: any) {
    console.error('Error in getActivityStats:', error);
    return null;
  }
};
