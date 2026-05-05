import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/types.ts';

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
  return createClient<Database>(url, serviceKey, {
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

const parseNumber = (value: string | string[] | undefined, fallback: number): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw || '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseBoolean = (value: string | string[] | undefined): boolean => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return false;
  return raw === 'true' || raw === '1';
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Allow', ['GET', 'PATCH']);
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed. Use GET or PATCH.' });
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

  if (req.method === 'PATCH') {
    const body = readBody(req.body);
    const userId = typeof body?.user_id === 'string' ? body.user_id : null;
    const isAdmin = typeof body?.is_admin === 'boolean' ? body.is_admin : null;

    if (!userId || isAdmin === null) {
      res.status(400).json({ error: 'Invalid request body. Provide user_id and is_admin.' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: userId, is_admin: isAdmin }, { onConflict: 'user_id' })
      .select('user_id,display_name,is_admin,created_at,updated_at');

    if (error) {
      res.status(500).json({ error: error.message || 'Failed to update user role.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: data ?? [],
      count: null,
      page: 0,
      pageSize: 0,
    });
    return;
  }

  const page = Math.max(0, parseNumber(req.query?.page, 0));
  const pageSize = Math.min(500, Math.max(1, parseNumber(req.query?.pageSize, 200)));
  const countOnly = parseBoolean(req.query?.countOnly);

  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: page + 1,
    perPage: pageSize,
  });

  if (listError || !listData) {
    res.status(500).json({ error: listError?.message || 'Failed to load users.' });
    return;
  }

  if (countOnly) {
    res.status(200).json({
      success: true,
      data: [],
      count: listData.total ?? null,
      page,
      pageSize,
    });
    return;
  }

  const authUsers = listData.users ?? [];
  const ids = authUsers.map((u) => u.id);

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('user_id,display_name,is_admin,created_at,updated_at')
    .in('user_id', ids);

  if (profilesError) {
    res.status(500).json({ error: profilesError.message || 'Failed to load profiles.' });
    return;
  }

  const profileMap = new Map<string, Database['public']['Tables']['profiles']['Row']>();
  for (const p of profiles ?? []) {
    profileMap.set(p.user_id, p);
  }

  const merged = authUsers.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      user_id: u.id,
      display_name: profile?.display_name ?? (u.user_metadata as any)?.display_name ?? u.email ?? null,
      is_admin: profile?.is_admin ?? false,
      created_at: profile?.created_at ?? u.created_at ?? new Date().toISOString(),
      updated_at: profile?.updated_at ?? u.updated_at ?? u.created_at ?? new Date().toISOString(),
    };
  });

  res.status(200).json({
    success: true,
    data: merged,
    count: listData.total ?? null,
    page,
    pageSize,
  });
}
