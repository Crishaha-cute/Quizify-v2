import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';
import * as leaderboardService from '../../../services/leaderboardService.ts';

const Card: React.FC<{ title: string; value: string | number; subtitle?: string; icon?: React.ReactNode }> = ({ title, value, subtitle, icon }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg transition-all hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-indigo-500/10">
    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl"></div>
    <div className="flex justify-between items-start mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {icon && <div className="text-indigo-400/70 p-2 bg-indigo-500/10 rounded-xl">{icon}</div>}
    </div>
    <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">{value}</div>
    {subtitle && <div className="text-sm text-slate-400 font-medium">{subtitle}</div>}
  </div>
);

const AdminDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalQuizzes: number;
    totalQuestions: number;
    quizAttempts: number;
    activeSeasonName: string;
    totalPointsAllTime: number;
  }>({
    totalUsers: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    quizAttempts: 0,
    activeSeasonName: '—',
    totalPointsAllTime: 0,
  });
  const [top10, setTop10] = useState<leaderboardService.LeaderboardRow[]>([]);

  const load = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const seasonId = await leaderboardService.ensureActiveSeason();

        const [
          top10Res,
          usersCountRes,
          quizzesCountRes,
          questionsCountRes,
          attemptsCountRes,
          seasonRes,
          pointsRes,
        ] = await Promise.all([
          leaderboardService.getTop10CurrentSeason(),
          supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
          supabase.from('quizzes').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_history').select('id', { count: 'exact', head: true }),
          supabase.from('seasons').select('name').eq('id', seasonId).maybeSingle(),
          supabase.from('quiz_history').select('points').limit(2000),
        ]);

        const totalPointsAllTime = (pointsRes.data ?? []).reduce((sum, r: any) => sum + (r.points ?? 0), 0);

        setTop10(top10Res);
        setStats({
          totalUsers: usersCountRes.count ?? 0,
          totalQuizzes: quizzesCountRes.count ?? 0,
          totalQuestions: questionsCountRes.count ?? 0,
          quizAttempts: attemptsCountRes.count ?? 0,
          activeSeasonName: seasonRes.data?.name ?? '—',
          totalPointsAllTime,
        });
      } catch (e: any) {
        setError(e?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Overview</div>
          <div className="text-2xl font-black">System snapshot</div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 px-4 py-2 font-semibold transition-colors"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <Card 
          title="Total Users" 
          value={stats.totalUsers.toLocaleString()} 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <Card 
          title="Total Quizzes" 
          value={stats.totalQuizzes.toLocaleString()}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <Card 
          title="Total Questions" 
          value={stats.totalQuestions.toLocaleString()} 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <Card 
          title="Quiz Attempts" 
          value={stats.quizAttempts.toLocaleString()} 
          subtitle="Total completions"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <Card 
          title="Active Season" 
          value={stats.activeSeasonName}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <Card 
          title="Points Pool" 
          value={stats.totalPointsAllTime.toLocaleString()} 
          subtitle="Sum of earned points"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Leaderboard Table Re-style */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl flex flex-col h-full">
          <div className="border-b border-slate-800/80 px-6 py-5 flex items-center justify-between bg-slate-950/40">
            <div>
              <h3 className="text-lg font-bold text-white">Active Season Leaderboard</h3>
              <p className="text-sm text-slate-400 mt-1">{stats.activeSeasonName}</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 font-semibold tracking-wider sticky top-0">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {top10.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500 bg-slate-900/20 italic">No players in this season yet.</td>
                  </tr>
                ) : (
                  top10.map((r, i) => (
                    <tr key={r.user_id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs
                          ${r.rank === 1 ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50' : 
                            r.rank === 2 ? 'bg-slate-300/20 text-slate-300 ring-1 ring-slate-300/50' : 
                            r.rank === 3 ? 'bg-amber-700/20 text-amber-600 ring-1 ring-amber-700/50' : 
                            'text-slate-400 group-hover:text-slate-200'}`}>
                          {r.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-shrink-0 items-center justify-center text-xs font-bold text-white shadow-inner">
                            {(r.display_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[150px] sm:max-w-xs">{r.display_name || r.user_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-300">{r.points.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Quick Actions</div>
              <div className="text-xl font-bold text-white">System Tools</div>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-auto">
            <button className="flex flex-col items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all p-4 text-center group">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">New Quiz</span>
            </button>
            <button className="flex flex-col items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-emerald-600/20 hover:border-emerald-500/30 transition-all p-4 text-center group">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Manage Users</span>
            </button>
            <button className="flex flex-col items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-amber-600/20 hover:border-amber-500/30 transition-all p-4 text-center group">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-amber-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Audit Logs</span>
            </button>
            <button className="flex flex-col items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-sky-600/20 hover:border-sky-500/30 transition-all p-4 text-center group">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-sky-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Export Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;


