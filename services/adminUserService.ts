import { supabase } from './supabase.ts';
import type { Database } from '../database/types.ts';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type AdminUsersResponse = {
  success: boolean;
  data: ProfileRow[];
  count: number | null;
  page: number;
  pageSize: number;
  error?: string;
};

const getAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('You must be signed in to access admin data.');
  }
  return data.session.access_token;
};

const parseResponse = async (res: Response): Promise<AdminUsersResponse> => {
  const body = (await res.json()) as AdminUsersResponse;
  if (!res.ok) {
    throw new Error(body?.error || 'Admin request failed.');
  }
  return body;
};

export const fetchAdminUsers = async (
  page: number,
  pageSize: number,
  countOnly = false
): Promise<{ data: ProfileRow[]; count: number | null }> => {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (countOnly) {
    params.set('countOnly', 'true');
  }

  const res = await fetch(`/api/admin-users?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await parseResponse(res);
  return {
    data: body.data ?? [],
    count: typeof body.count === 'number' ? body.count : null,
  };
};

export const fetchAdminUserCount = async (): Promise<number> => {
  const { count } = await fetchAdminUsers(0, 1, true);
  return count ?? 0;
};

export const setAdminRole = async (
  userId: string,
  isAdmin: boolean
): Promise<ProfileRow> => {
  const token = await getAccessToken();
  const res = await fetch('/api/admin-users', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, is_admin: isAdmin }),
  });

  const body = await parseResponse(res);
  const updated = body.data?.[0];
  if (!updated) {
    throw new Error('Admin update failed to return a user row.');
  }
  return updated;
};
