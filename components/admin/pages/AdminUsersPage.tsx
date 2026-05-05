import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';
import { fetchAdminUsers, setAdminRole } from '../../../services/adminUserService.ts';
import type { Database } from '../../../database/types.ts';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type HistoryRow = Database['public']['Tables']['quiz_history']['Row'];

const PAGE_SIZE = 200;

const AdminUsersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const pageRef = useRef(0);

  const loadUsers = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true);
      setUsers([]);
      pageRef.current = 0;
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const nextPage = reset ? 0 : pageRef.current + 1;
      const start = nextPage * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const { data: rows, count } = await fetchAdminUsers(nextPage, PAGE_SIZE);
      setUsers((prev) => (reset ? rows : [...prev, ...rows]));
      pageRef.current = nextPage;
      setTotalCount(count ?? null);

      const loadedCount = start + rows.length;
      const moreAvailable = rows.length === PAGE_SIZE && (count == null || loadedCount < count);
      setHasMore(moreAvailable);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedUserId) {
        setHistory([]);
        return;
      }
      setHistoryLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('quiz_history')
          .select('id,user_id,topic,difficulty,score,points,total_questions,created_at,updated_at')
          .eq('user_id', selectedUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setHistory(data ?? []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load user history.');
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedUserId]);

  const filtered = users.filter((u) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      (u.display_name || '').toLowerCase().includes(needle) ||
      (u.user_id || '').toLowerCase().includes(needle)
    );
  });

  const toggleAdmin = async (u: ProfileRow) => {
    const ok = confirm(`${u.is_admin ? 'Remove admin' : 'Make admin'} for ${u.display_name || u.user_id}?`);
    if (!ok) return;
    setError(null);
    try {
      const updated = await setAdminRole(u.user_id, !u.is_admin);
      setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? updated : x)));
    } catch (e: any) {
      setError(e?.message || 'Failed to update admin role.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">User Management</div>
          <div className="text-2xl font-black">Users & Roles</div>
        </div>
        <button
          onClick={() => loadUsers(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-lg font-bold">All users</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or user id…"
              className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="text-left font-semibold py-2">User</th>
                  <th className="text-left font-semibold py-2">Role</th>
                  <th className="text-left font-semibold py-2">Created</th>
                  <th className="text-right font-semibold py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-6 text-slate-300">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-slate-300">No users found.</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.user_id} className="border-t border-slate-800">
                      <td className="py-3">
                        <button onClick={() => setSelectedUserId(u.user_id)} className="text-left">
                          <div className="font-semibold">{u.display_name || '—'}</div>
                          <div className="text-xs text-slate-400">{u.user_id}</div>
                        </button>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold border ${
                          u.is_admin ? 'bg-indigo-600/20 text-indigo-100 border-indigo-500/40' : 'bg-slate-800/40 text-slate-200 border-slate-700'
                        }`}>
                          {u.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => toggleAdmin(u)}
                          className="rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 px-3 py-2 text-xs font-semibold"
                        >
                          {u.is_admin ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !search && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {totalCount == null ? 'Showing loaded users' : `Showing ${users.length} of ${totalCount}`}
              </div>
              <button
                onClick={() => loadUsers(false)}
                disabled={!hasMore || loadingMore}
                className="rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 disabled:opacity-60 px-3 py-2 text-xs font-semibold"
              >
                {loadingMore ? 'Loading…' : hasMore ? 'Load more' : 'All users loaded'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
          <div className="text-lg font-bold">User quiz history</div>
          <div className="text-sm text-slate-400 mt-1">
            {selectedUserId ? `User: ${selectedUserId}` : 'Select a user from the table'}
          </div>

          <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {historyLoading ? (
              <div className="text-slate-300">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="text-slate-300">No history to show.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{h.topic}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {h.difficulty} • {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">{h.points} pts</div>
                      <div className="text-xs text-slate-400">{h.score}/{h.total_questions}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;


