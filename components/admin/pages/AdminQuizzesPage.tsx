import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';
import type { Database } from '../../../database/types.ts';

type QuizHistoryRow = Database['public']['Tables']['quiz_history']['Row'];
type QuizAttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];

const AdminQuizzesPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<QuizHistoryRow[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Quiz Management</div>
          <div className="text-2xl font-black">Taken quizzes</div>
        </div>
        <button
          onClick={loadHistory}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">{error}</div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="lg:w-5/12 xl:w-4/12">
            <div className="text-lg font-bold">Recent attempts</div>
            <div className="text-xs text-slate-400 mt-1">
              Showing latest quiz attempts
            </div>

            <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-2">
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
          </div>

          <div className="lg:w-7/12 xl:w-8/12 border-t border-slate-800/60 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <div className="text-lg font-bold">Attempt details</div>
            <div className="text-xs text-slate-400 mt-1">
              {selectedHistoryId ? `Attempt: ${selectedHistoryId}` : 'Select a quiz attempt to view details'}
            </div>

            <div className="mt-4 max-h-[55vh] overflow-y-auto pr-2 space-y-2">
              {attemptsLoading ? (
                <div className="text-slate-300">Loading attempts…</div>
              ) : attempts.length === 0 ? (
                <div className="text-slate-300">No attempt details to show.</div>
              ) : (
                attempts.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
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


