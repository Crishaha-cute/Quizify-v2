import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';
import * as leaderboardService from '../../../services/leaderboardService.ts';
import * as activityService from '../../../services/activityService.ts';

interface Activity {
  id: string;
  user_id: string;
  action_type: string;
  description?: string;
  created_at: string;
}

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
  const [activityRange, setActivityRange] = useState<'3days' | '7days' | '30days'>('7days');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalQuizzes: number;
    quizAttempts: number;
    activeSeasonName: string;
    totalPointsAllTime: number;
  }>({
    totalUsers: 0,
    totalQuizzes: 0,
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
          attemptsCountRes,
          seasonRes,
          pointsRes,
        ] = await Promise.all([
          leaderboardService.getTop10CurrentSeason(),
          supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
          supabase.from('quizzes').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_history').select('id', { count: 'exact', head: true }),
          supabase.from('seasons').select('name').eq('id', seasonId).maybeSingle(),
          supabase.from('quiz_history').select('points').limit(2000),
        ]);

        const totalPointsAllTime = (pointsRes.data ?? []).reduce((sum, r: any) => sum + (r.points ?? 0), 0);

        setTop10(top10Res);
        setStats({
          totalUsers: usersCountRes.count ?? 0,
          totalQuizzes: quizzesCountRes.count ?? 0,
          // totalQuestions: questionsCountRes.count ?? 0,
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

  const loadActivities = useMemo(() => {
    return async (range: '3days' | '7days' | '30days') => {
      setLoadingActivities(true);
      try {
        const data = await activityService.getActivities(range);
        const stats = await activityService.getActivityStats(range);
        setActivities(data);
        setActivityStats(stats);
      } catch (e: any) {
        console.error('Failed to load activities:', e);
      } finally {
        setLoadingActivities(false);
      }
    };
  }, []);

  const handleActivityRangeChange = (range: '3days' | '7days' | '30days') => {
    setActivityRange(range);
    loadActivities(range);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login':
        return <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM5 10a1 1 0 01-1-1V8a1 1 0 012 0v1a1 1 0 01-1 1zM5.757 5.757a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" /></svg>;
      case 'logout':
        return <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4.5C3 3.119 4.119 2 5.5 2h5a.75.75 0 010 1.5h-5a.25.25 0 00-.25.25v11a.25.25 0 00.25.25h5a.75.75 0 010 1.5h-5A1.5 1.5 0 013 15.5v-11zm6.378.5a.75.75 0 00-1.06 1.061L9.44 9.5H6a.75.75 0 000 1.5h3.44l-1.122 1.439a.75.75 0 101.06 1.061l2.5-3.2a.75.75 0 000-.942l-2.5-3.2z" clipRule="evenodd" /></svg>;
      case 'quiz_attempt':
        return <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm11-4a1 1 0 10-2 0v5a1 1 0 102 0V6z" /></svg>;
      case 'quiz_completion':
        return <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
      default:
        return <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /></svg>;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'logout': 'Logout',
      'quiz_attempt': 'Quiz Attempted',
      'quiz_completion': 'Quiz Completed',
    };
    return labels[actionType] || actionType;
  };

  const getActionBgColor = (actionType: string) => {
    switch (actionType) {
      case 'login': return 'bg-blue-500/10 text-blue-300';
      case 'logout': return 'bg-red-500/10 text-red-300';
      case 'quiz_attempt': return 'bg-yellow-500/10 text-yellow-300';
      case 'quiz_completion': return 'bg-green-500/10 text-green-300';
      default: return 'bg-slate-500/10 text-slate-300';
    }
  };

  useEffect(() => {
    load();
    loadActivities(activityRange);
  }, [load, loadActivities, activityRange]);

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
          value="N/A" 
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

      <div className="grid grid-cols-1 gap-6 mt-8">
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

        {/* User Activities Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl flex flex-col h-full">
          <div className="border-b border-slate-800/80 px-6 py-5 flex items-center justify-between bg-slate-950/40">
            <div>
              <h3 className="text-lg font-bold text-white">User Activity Log</h3>
              <p className="text-sm text-slate-400 mt-1">
                {activityStats ? `${activityStats.totalActivities} activities` : 'Loading...'}
              </p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="px-6 py-4 flex gap-2 bg-slate-950/20 border-b border-slate-800/60 flex-wrap">
            {(['3days', '7days', '30days'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleActivityRangeChange(range)}
                disabled={loadingActivities}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activityRange === range
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                } disabled:opacity-50`}
              >
                {range === '3days' ? 'Last 3 Days' : range === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Activities Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 font-semibold tracking-wider sticky top-0">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingActivities ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 bg-slate-900/20 italic">Loading activities...</td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 bg-slate-900/20 italic">No activities found in this time range.</td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium text-xs ${getActionBgColor(activity.action_type)}`}>
                          {getActionIcon(activity.action_type)}
                          {getActionLabel(activity.action_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs truncate max-w-xs">
                        {activity.user_id}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(activity.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {activity.description || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Stats Summary */}
          {activityStats && (
            <div className="border-t border-slate-800/60 px-6 py-4 bg-slate-950/20 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Logins</div>
                <div className="text-lg font-bold text-blue-400">{activityStats.logins}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Attempts</div>
                <div className="text-lg font-bold text-yellow-400">{activityStats.quizAttempts}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Completions</div>
                <div className="text-lg font-bold text-green-400">{activityStats.quizCompletions}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Logouts</div>
                <div className="text-lg font-bold text-red-400">{activityStats.logouts}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Unique Users</div>
                <div className="text-lg font-bold text-purple-400">{activityStats.uniqueUsers}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboardPage;


