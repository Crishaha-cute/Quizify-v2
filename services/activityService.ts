import { supabase } from './supabase.ts';
import { getSupabaseAuthUser } from './authService.ts';

export type ActivityAction = 'login' | 'quiz_attempt' | 'quiz_completion' | 'logout';
export type ActivityRange = '3days' | '7days' | '30days';

export interface Activity {
  id: string;
  user_id: string;
  action_type: ActivityAction;
  description?: string;
  created_at: string;
}

export interface ActivityStats {
  totalActivities: number;
  logins: number;
  quizAttempts: number;
  quizCompletions: number;
  logouts: number;
  uniqueUsers: number;
}

type ActivityBundle = {
  activities: Activity[];
  stats: ActivityStats | null;
};

const getRangeInDays = (range: ActivityRange) => {
  if (range === '3days') return 3;
  if (range === '7days') return 7;
  return 30;
};

const getRangeStartDate = (range: ActivityRange) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (getRangeInDays(range) - 1));
  return start;
};

const buildActivityStats = (activities: Activity[]): ActivityStats => ({
  totalActivities: activities.length,
  logins: activities.filter(a => a.action_type === 'login').length,
  quizAttempts: activities.filter(a => a.action_type === 'quiz_attempt').length,
  quizCompletions: activities.filter(a => a.action_type === 'quiz_completion').length,
  logouts: activities.filter(a => a.action_type === 'logout').length,
  uniqueUsers: new Set(activities.map(a => a.user_id)).size,
});

const getAccessToken = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Failed to read Supabase session for activity API:', error);
    return null;
  }
  return data.session?.access_token ?? null;
};

const fetchActivitiesFromApi = async (range: ActivityRange): Promise<ActivityBundle | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(`/api/activities?range=${range}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || 'Failed to load activity log.');
  }

  return {
    activities: Array.isArray(body?.activities) ? body.activities : [],
    stats: body?.stats ?? null,
  };
};

const postActivityToApi = async (action_type: ActivityAction, description?: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) return false;

  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action_type, description }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to log activity.');
  }

  return true;
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
    try {
      const loggedViaApi = await postActivityToApi(action_type, description);
      if (loggedViaApi) {
        return;
      }
    } catch (error) {
      console.warn('Activity API log failed, falling back to Supabase insert:', error);
    }

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
const getActivitiesFromSupabase = async (range: ActivityRange): Promise<Activity[]> => {
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
};

export const getActivities = async (range: ActivityRange = '7days'): Promise<Activity[]> => {
  try {
    try {
      const bundle = await fetchActivitiesFromApi(range);
      if (bundle) {
        return bundle.activities;
      }
    } catch (error) {
      console.warn('Activity API fetch failed, falling back to Supabase:', error);
    }

    return await getActivitiesFromSupabase(range);
  } catch (error: any) {
    console.error('Error in getActivities:', error);
    return [];
  }
};

export const getActivityBundle = async (range: ActivityRange = '7days'): Promise<ActivityBundle> => {
  try {
    const bundle = await fetchActivitiesFromApi(range);
    if (bundle) {
      return bundle;
    }
  } catch (error) {
    console.warn('Activity API bundle fetch failed, falling back to Supabase:', error);
  }

  const activities = await getActivitiesFromSupabase(range);
  return {
    activities,
    stats: buildActivityStats(activities),
  };
};

/**
 * Get activity statistics
 * @param range - Time range: '3days', '7days', or '30days'
 * @returns Statistics about activities
 */
export const getActivityStats = async (
  range: ActivityRange = '7days',
  preloadedActivities?: Activity[]
): Promise<ActivityStats | null> => {
  try {
    if (preloadedActivities) {
      return buildActivityStats(preloadedActivities);
    }

    const bundle = await getActivityBundle(range);
    return bundle.stats ?? buildActivityStats(bundle.activities);
  } catch (error: any) {
    console.error('Error in getActivityStats:', error);
    return null;
  }
};
