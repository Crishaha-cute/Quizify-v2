import { createClient } from '@supabase/supabase-js';
import type { Activity, ActivityAction, ActivityRange, ActivityStats } from '../services/activityService.ts';

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

const getEnv = (name: string): string | undefined => {
  return process.env[name] || process.env[`VITE_${name}`];
};

const getSupabaseAdmin = () => {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return null;
  }
  return createClient<any>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const getBearerToken = (req: VercelRequest): string | null => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return value.slice(7).trim();
};

const readBody = (body: unknown): any => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
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

const ALLOWED_ACTIONS = new Set<ActivityAction>([
  'login',
  'logout',
  'quiz_attempt',
  'quiz_completion',
]);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Allow', ['GET', 'POST']);
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Server misconfiguration: Supabase admin key is missing.' });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  if (req.method === 'POST') {
    const body = readBody(req.body);
    const action_type = typeof body?.action_type === 'string' ? body.action_type : null;
    const descriptionRaw = typeof body?.description === 'string' ? body.description.trim() : '';
    const description = descriptionRaw ? descriptionRaw.slice(0, 500) : null;

    if (!action_type || !ALLOWED_ACTIONS.has(action_type as ActivityAction)) {
      res.status(400).json({ error: 'Invalid action_type.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('admin_activity_log')
      .insert({
        user_id: userData.user.id,
        action_type,
        description,
      });

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to log activity.' });
      return;
    }

    res.status(200).json({ success: true });
    return;
  }

  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (adminError) {
    res.status(500).json({ error: 'Failed to verify admin access.' });
    return;
  }

  if (!adminProfile?.is_admin) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  try {
    const range = (req.query?.range as string) || '7days';
    if (!['3days', '7days', '30days'].includes(range)) {
      res.status(400).json({ error: 'Invalid range. Use 3days, 7days, or 30days.' });
      return;
    }

    const startDate = getRangeStartDate(range as ActivityRange);
    const endDate = new Date();

    const { data, error } = await supabaseAdmin
      .from('admin_activity_log')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to load activities.' });
      return;
    }

    const activities: Activity[] = (data ?? []).map((record: any) => ({
      id: record.id,
      user_id: record.user_id,
      action_type: record.action_type,
      description: record.description ?? undefined,
      created_at: record.created_at,
    }));

    const stats = buildActivityStats(activities);

    res.status(200).json({
      success: true,
      range,
      activities,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in activities API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
