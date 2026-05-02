import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase.ts';
import type { Database } from '../database/types.ts';
import { getSupabaseAuthUser } from '../services/authService.ts';
import * as leaderboardService from '../services/leaderboardService.ts';

type QuizRow = Database['public']['Tables']['quizzes']['Row'];
type QuestionRow = Database['public']['Tables']['questions']['Row'];
type SeasonRow = Database['public']['Tables']['seasons']['Row'];
type QuizHistoryRow = Database['public']['Tables']['quiz_history']['Row'];

const AdminDashboardScreen: React.FC = () => {
  type Tab = 'overview' | 'users' | 'quizzes' | 'seasons' | 'activity';
  const [tab, setTab] = useState<Tab>('overview');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Analytics / overview data
  const [overview, setOverview] = useState<{
    totalUsers: number;
    totalQuizzesTaken: number;
    totalPointsAwarded: number;
    activeSeason: SeasonRow | null;
    activePlayersThisSeason: number;
    pointsThisSeason: number;
    topPerformers: leaderboardService.LeaderboardRow[];
  }>({
    totalUsers: 0,
    totalQuizzesTaken: 0,
    totalPointsAwarded: 0,
    activeSeason: null,
    activePlayersThisSeason: 0,
    pointsThisSeason: 0,
    topPerformers: [],
  });

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [users, setUsers] = useState<Database['public']['Tables']['profiles']['Row'][]>([]);
  const [recentActivity, setRecentActivity] = useState<(QuizHistoryRow & { user_email?: string | null })[]>([]);

  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');

  const [newItemNo, setNewItemNo] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionRow['question_type']>('Multiple Choice');
  const [newDifficulty, setNewDifficulty] = useState<QuestionRow['difficulty']>('Easy');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptionsRaw, setNewOptionsRaw] = useState(''); // newline-separated
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');

  const checkAdminAndLoad = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const authUser = await getSupabaseAuthUser();
        const userId = authUser?.id;
        if (!userId) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        setIsAdmin(!!profile?.is_admin);

        if (!profile?.is_admin) {
          setLoading(false);
          return;
        }

        // Load core admin datasets in parallel
        const [
          quizRes,
          usersRes,
          historyRes,
        ] = await Promise.all([
          supabase.from('quizzes').select('id,title,description,created_by,is_published,created_at,updated_at').order('created_at', { ascending: false }),
          supabase.from('profiles').select('user_id,display_name,is_admin,created_at,updated_at').order('created_at', { ascending: false }).limit(200),
          supabase.from('quiz_history').select('id,user_id,topic,difficulty,score,points,total_questions,created_at').order('created_at', { ascending: false }).limit(25),
        ]);

        if (quizRes.error) throw quizRes.error;
        if (usersRes.error) throw usersRes.error;
        if (historyRes.error) throw historyRes.error;

        setQuizzes(quizRes.data ?? []);
        setUsers(usersRes.data ?? []);
        setRecentActivity((historyRes.data as any[]) ?? []);

        // Overview/analytics
        const seasonId = await leaderboardService.ensureActiveSeason();
        const [topPerformers, activeSeasonRes, totalUsersRes, totalQuizzesTakenRes, totalPointsRes, seasonPointsRes] = await Promise.all([
          leaderboardService.getTop10CurrentSeason(),
          supabase.from('seasons').select('id,name,start_at,end_at,is_closed,created_at,updated_at').eq('id', seasonId).maybeSingle(),
          supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
          supabase.from('quiz_history').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_history').select('points').limit(1000), // soft aggregation in client (kept small)
          supabase.from('season_points').select('points').eq('season_id', seasonId).limit(5000),
        ]);

        const totalUsers = totalUsersRes.count ?? 0;
        const totalQuizzesTaken = totalQuizzesTakenRes.count ?? 0;
        const totalPointsAwarded = (totalPointsRes.data ?? []).reduce((sum, r: any) => sum + (r.points ?? 0), 0);
        const pointsThisSeason = (seasonPointsRes.data ?? []).reduce((sum, r: any) => sum + (r.points ?? 0), 0);
        const activePlayersThisSeason = (seasonPointsRes.data ?? []).length;

        setOverview({
          totalUsers,
          totalQuizzesTaken,
          totalPointsAwarded,
          activeSeason: activeSeasonRes.data ?? null,
          activePlayersThisSeason,
          pointsThisSeason,
          topPerformers,
        });

      } catch (e: any) {
        setError(e?.message || 'Failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    checkAdminAndLoad();
  }, [checkAdminAndLoad]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!selectedQuizId) {
        setQuestions([]);
        return;
      }
      const { data, error } = await supabase
        .from('questions')
        .select('id,quiz_id,item_no,question_type,difficulty,question_text,options,correct_answer,explanation,created_at,updated_at')
        .eq('quiz_id', selectedQuizId)
        .order('item_no', { ascending: true });
      if (error) {
        setError(error.message);
        return;
      }
      setQuestions(data ?? []);
    };
    loadQuestions();
  }, [selectedQuizId]);

  const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
    <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
      <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{subtitle}</div>}
    </div>
  );

  const TabButton = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
        tab === id
          ? 'bg-purple-600 text-white border-purple-600'
          : 'bg-white/40 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-purple-200 dark:border-purple-500/30 hover:bg-purple-500/10'
      }`}
    >
      {label}
    </button>
  );

  // Existing code below (createQuiz/togglePublish/addQuestion) stays mostly the same,
  // but we avoid SELECT * to reduce payload.

  const createQuiz = async () => {
    setError(null);
    const title = newQuizTitle.trim();
    if (!title) {
      setError('Quiz title is required.');
      return;
    }

    const authUser = await getSupabaseAuthUser();
    const createdBy = authUser?.id ?? null;

    const { data, error } = await supabase
      .from('quizzes')
      .insert({ title, description: newQuizDescription.trim() || null, created_by: createdBy, is_published: false })
      .select('id,title,description,created_by,is_published,created_at,updated_at')
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setQuizzes((prev) => [data, ...prev]);
    setNewQuizTitle('');
    setNewQuizDescription('');
    setSelectedQuizId(data.id);
  };

  const togglePublish = async (quiz: QuizRow) => {
    setError(null);
    const { data, error } = await supabase
      .from('quizzes')
      .update({ is_published: !quiz.is_published })
      .eq('id', quiz.id)
      .select('id,title,description,created_by,is_published,created_at,updated_at')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? data : q)));
  };

  const addQuestion = async () => {
    setError(null);
    if (!selectedQuizId) {
      setError('Select a quiz first.');
      return;
    }

    const itemNo = newItemNo.trim();
    if (!itemNo) {
      setError('Item number is required (unique per quiz).');
      return;
    }

    const questionText = newQuestionText.trim();
    const correctAnswer = newCorrectAnswer.trim();
    if (!questionText || !correctAnswer) {
      setError('Question text and correct answer are required.');
      return;
    }

    let options: string[] = [];
    if (newQuestionType === 'Multiple Choice') {
      options = newOptionsRaw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length !== 4) {
        setError('Multiple Choice requires exactly 4 options (one per line).');
        return;
      }
    } else if (newQuestionType === 'True or False') {
      options = ['True', 'False'];
      if (!['true', 'false'].includes(correctAnswer.toLowerCase())) {
        setError('True or False correct answer must be "True" or "False".');
        return;
      }
    } else {
      options = [];
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: selectedQuizId,
        item_no: itemNo,
        question_type: newQuestionType,
        difficulty: newDifficulty,
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
      })
      .select('id,quiz_id,item_no,question_type,difficulty,question_text,options,correct_answer,explanation,created_at,updated_at')
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setQuestions((prev) => [...prev, data].sort((a, b) => a.item_no.localeCompare(b.item_no)));
    setNewItemNo('');
    setNewQuestionText('');
    setNewOptionsRaw('');
    setNewCorrectAnswer('');
  };

  // UI helpers
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pt-8 md:pt-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-purple-600 dark:text-purple-300">Analytics, users, quizzes, and seasonal leaderboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabButton id="overview" label="Overview" />
          <TabButton id="users" label="Users" />
          <TabButton id="quizzes" label="Quizzes & Questions" />
          <TabButton id="seasons" label="Seasons & Leaderboard" />
          <TabButton id="activity" label="Recent Activity" />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/80 text-white p-4 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-700 dark:text-gray-200 py-10">Loading…</div>
      ) : isAdmin === false ? (
        <div className="text-center text-gray-700 dark:text-gray-200 py-10">
          You don’t have admin access.
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total users" value={String(overview.totalUsers)} />
                <StatCard title="Quizzes taken (all time)" value={String(overview.totalQuizzesTaken)} />
                <StatCard title="Points awarded (all time)" value={String(overview.totalPointsAwarded)} subtitle="From quiz_history.points" />
                <StatCard
                  title="Active season"
                  value={overview.activeSeason ? overview.activeSeason.name : '—'}
                  subtitle={overview.activeSeason ? `${formatDate(overview.activeSeason.start_at)} → ${formatDate(overview.activeSeason.end_at)}` : 'No season loaded'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <StatCard title="Active players (this season)" value={String(overview.activePlayersThisSeason)} />
                <StatCard title="Points in season" value={String(overview.pointsThisSeason)} subtitle="Sum of season_points" />
                <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Top performers (this season)</div>
                  <div className="mt-3 space-y-2">
                    {overview.topPerformers.length === 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-300">No scores yet.</div>
                    ) : (
                      overview.topPerformers.map((r) => (
                        <div key={r.user_id} className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 border border-purple-200/70 dark:border-purple-500/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 text-center font-bold text-purple-700 dark:text-purple-200">#{r.rank}</span>
                            <span className="font-semibold truncate">{r.display_name || r.user_id}</span>
                          </div>
                          <span className="font-bold">{r.points}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Users</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">Showing last {users.length} profiles</div>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                {users.map((u) => (
                  <div key={u.user_id} className="p-3 rounded-lg bg-gray-200/40 dark:bg-white/5 border border-purple-200 dark:border-purple-500/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{u.display_name || u.user_id}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">User ID: {u.user_id}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.is_admin ? 'bg-purple-600 text-white' : 'bg-gray-300/70 dark:bg-white/10 text-gray-800 dark:text-gray-200'}`}>
                        {u.is_admin ? 'ADMIN' : 'USER'}
                      </span>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <div className="text-center text-gray-600 dark:text-gray-300 py-6">No users found.</div>}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Recent quiz activity</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">Last {recentActivity.length} attempts</div>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                {recentActivity.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg bg-gray-200/40 dark:bg-white/5 border border-purple-200 dark:border-purple-500/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{h.topic}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {h.difficulty} • {formatDate(h.created_at)} • User: {h.user_id}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold">{h.points} pts</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{h.score}/{h.total_questions}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && <div className="text-center text-gray-600 dark:text-gray-300 py-6">No activity yet.</div>}
              </div>
            </div>
          )}

          {tab === 'seasons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
                <h3 className="text-xl font-semibold mb-2">Current season</h3>
                {overview.activeSeason ? (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">Name:</span> {overview.activeSeason.name}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">Start:</span> {formatDate(overview.activeSeason.start_at)}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">End:</span> {formatDate(overview.activeSeason.end_at)}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">Players:</span> {overview.activePlayersThisSeason}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">Total points:</span> {overview.pointsThisSeason}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Season auto-rotates via `rotate_season_if_needed()` when the end date passes.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No season loaded.</div>
                )}
              </div>

              <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
                <h3 className="text-xl font-semibold mb-3">Leaderboard (top 10)</h3>
                <div className="space-y-2">
                  {overview.topPerformers.map((r) => (
                    <div key={r.user_id} className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 border border-purple-200/70 dark:border-purple-500/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 text-center font-bold text-purple-700 dark:text-purple-200">#{r.rank}</span>
                        <span className="font-semibold truncate">{r.display_name || r.user_id}</span>
                      </div>
                      <span className="font-bold">{r.points}</span>
                    </div>
                  ))}
                  {overview.topPerformers.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">No scores yet.</div>}
                </div>
              </div>
            </div>
          )}

          {tab === 'quizzes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
                <h3 className="text-xl font-semibold mb-3">Quizzes</h3>

                <div className="space-y-2 mb-4">
                  <input
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                    placeholder="New quiz title"
                  />
                  <input
                    value={newQuizDescription}
                    onChange={(e) => setNewQuizDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                    placeholder="Description (optional)"
                  />
                  <button
                    onClick={createQuiz}
                    className="w-full py-3 px-6 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all"
                  >
                    Create Quiz
                  </button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      className={`p-3 rounded-lg border transition-all ${
                        selectedQuizId === q.id
                          ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-500/20'
                          : 'border-purple-200 dark:border-purple-500/30 bg-gray-200/40 dark:bg-white/5'
                      }`}
                    >
                      <button className="w-full text-left" onClick={() => setSelectedQuizId(q.id)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{q.title}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              {q.is_published ? 'Published' : 'Draft'} • Updated {formatDate(q.updated_at)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePublish(q);
                            }}
                            className="text-sm font-semibold text-purple-700 dark:text-purple-200 hover:text-purple-900 dark:hover:text-white"
                          >
                            {q.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                        </div>
                      </button>
                    </div>
                  ))}

                  {quizzes.length === 0 && (
                    <div className="text-center text-gray-600 dark:text-gray-300 py-6">No quizzes yet.</div>
                  )}
                </div>
              </div>

              <div className="bg-white/60 dark:bg-black/30 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-purple-300 dark:border-purple-500/30">
                <h3 className="text-xl font-semibold mb-3">Questions</h3>
                {!selectedQuizId ? (
                  <div className="text-center text-gray-600 dark:text-gray-300 py-10">Select a quiz to manage questions.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      <input
                        value={newItemNo}
                        onChange={(e) => setNewItemNo(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                        placeholder="Item number (e.g., 1, 1.1, Q-001)"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newQuestionType}
                          onChange={(e) => setNewQuestionType(e.target.value as QuestionRow['question_type'])}
                          className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                        >
                          <option value="Multiple Choice">Multiple Choice</option>
                          <option value="Identification">Identification</option>
                          <option value="True or False">True or False</option>
                        </select>
                        <select
                          value={newDifficulty}
                          onChange={(e) => setNewDifficulty(e.target.value as QuestionRow['difficulty'])}
                          className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <textarea
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                        placeholder="Question text"
                        rows={3}
                      />
                      {newQuestionType === 'Multiple Choice' && (
                        <textarea
                          value={newOptionsRaw}
                          onChange={(e) => setNewOptionsRaw(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                          placeholder={'Options (exactly 4 lines)\nOption A\nOption B\nOption C\nOption D'}
                          rows={4}
                        />
                      )}
                      <input
                        value={newCorrectAnswer}
                        onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-purple-400/50 rounded-lg"
                        placeholder="Correct answer"
                      />
                      <button
                        onClick={addQuestion}
                        className="w-full py-3 px-6 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-all"
                      >
                        Add Question
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 rounded-lg bg-gray-200/40 dark:bg-white/5 border border-purple-200 dark:border-purple-500/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-purple-700 dark:text-purple-200">
                                Item {q.item_no} • {q.question_type} • {q.difficulty}
                              </div>
                              <div className="font-semibold mt-1 truncate">{q.question_text}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {questions.length === 0 && (
                        <div className="text-center text-gray-600 dark:text-gray-300 py-6">No questions yet.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboardScreen;
