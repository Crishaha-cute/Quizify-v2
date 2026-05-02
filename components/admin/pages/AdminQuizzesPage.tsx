import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';
import type { Database } from '../../../database/types.ts';

type QuizRow = Database['public']['Tables']['quizzes']['Row'];
type QuizHistoryRow = Database['public']['Tables']['quiz_history']['Row'];
type QuizAttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];

const AdminQuizzesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QuizRow[]>([]);
  const [q, setQ] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<QuizHistoryRow[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);

  const load = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const query = supabase
          .from('quizzes')
          .select('id,title,description,created_by,is_published,created_at,updated_at')
          .order('created_at', { ascending: false })
          .limit(200);

        const { data, error } = await query;
        if (error) throw error;
        setItems(data ?? []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load quizzes.');
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('quiz_history')
        .select('id,user_id,topic,difficulty,score,points,total_questions,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setHistoryItems(data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load quiz history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const loadAttempts = async () => {
      if (!selectedHistoryId) {
        setAttempts([]);
        return;
      }
      setAttemptsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id,quiz_history_id,question_number,question_text,selected_answer,correct_answer,is_correct,created_at')
          .eq('quiz_history_id', selectedHistoryId)
          .order('question_number', { ascending: true });
        if (error) throw error;
        setAttempts(data ?? []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load quiz attempts.');
      } finally {
        setAttemptsLoading(false);
      }
    };
    loadAttempts();
  }, [selectedHistoryId]);

  const filtered = items.filter((x) => {
    const t = (x.title || '').toLowerCase();
    const d = (x.description || '').toLowerCase();
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return t.includes(needle) || d.includes(needle);
  });

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
    setItems((prev) => prev.map((x) => (x.id === quiz.id ? data : x)));
  };

  const remove = async (quiz: QuizRow) => {
    const ok = confirm(`Delete quiz "${quiz.title}"? This will delete its questions.`);
    if (!ok) return;
    setError(null);
    const { error } = await supabase.from('quizzes').delete().eq('id', quiz.id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== quiz.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Quiz Management</div>
          <div className="text-2xl font-black">Quizzes</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={loadHistory}
            className="rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 px-4 py-2 font-semibold"
          >
            Refresh history
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-lg font-bold">All quizzes</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title/description…"
              className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="text-left font-semibold py-2">Title</th>
                  <th className="text-left font-semibold py-2">Status</th>
                  <th className="text-left font-semibold py-2">Updated</th>
                  <th className="text-right font-semibold py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="py-6 text-slate-300" colSpan={4}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="py-6 text-slate-300" colSpan={4}>No quizzes found.</td></tr>
                ) : (
                  filtered.map((quiz) => (
                    <tr key={quiz.id} className="border-t border-slate-800">
                      <td className="py-3">
                        <div className="font-semibold">{quiz.title}</div>
                        {quiz.description && <div className="text-slate-400 text-xs mt-1 line-clamp-1">{quiz.description}</div>}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold border ${
                          quiz.is_published
                            ? 'bg-emerald-500/10 text-emerald-200 border-emerald-600/30'
                            : 'bg-slate-800/40 text-slate-200 border-slate-700'
                        }`}>
                          {quiz.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {quiz.updated_at ? new Date(quiz.updated_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => togglePublish(quiz)}
                          className="rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 px-3 py-2 text-xs font-semibold"
                        >
                          {quiz.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => remove(quiz)}
                          className="rounded-lg border border-red-900/60 bg-red-950/20 hover:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
          <div className="text-lg font-bold">Taken quizzes</div>
          <div className="text-xs text-slate-400 mt-1">
            Showing latest quiz attempts
          </div>

          <div className="mt-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {historyLoading ? (
              <div className="text-slate-300">Loading history…</div>
            ) : historyItems.length === 0 ? (
              <div className="text-slate-300">No quiz history found.</div>
            ) : (
              historyItems.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHistoryId(h.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    selectedHistoryId === h.id
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{h.topic}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {h.difficulty} • {new Date(h.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">User: {h.user_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">{h.points} pts</div>
                      <div className="text-xs text-slate-400">{h.score}/{h.total_questions}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-slate-200">Attempt details</div>
            <div className="text-xs text-slate-400 mt-1">
              {selectedHistoryId ? `Attempt: ${selectedHistoryId}` : 'Select a quiz attempt to view details'}
            </div>

            <div className="mt-3 max-h-[30vh] overflow-y-auto pr-2 space-y-2">
              {attemptsLoading ? (
                <div className="text-slate-300">Loading attempts…</div>
              ) : attempts.length === 0 ? (
                <div className="text-slate-300">No attempt details to show.</div>
              ) : (
                attempts.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Q{a.question_number}</div>
                        <div className="font-semibold text-sm mt-1 line-clamp-2">{a.question_text}</div>
                        <div className="text-xs text-slate-400 mt-2">
                          Selected: {a.selected_answer || '—'}
                        </div>
                        <div className="text-xs text-slate-400">Correct: {a.correct_answer}</div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                        a.is_correct
                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-600/30'
                          : 'bg-red-500/10 text-red-200 border-red-600/30'
                      }`}>
                        {a.is_correct ? 'CORRECT' : 'WRONG'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuizzesPage;


