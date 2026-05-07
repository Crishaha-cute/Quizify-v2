import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase.ts';

type TopicCount = { topic: string; count: number; percentage: number };

const COLORS = [
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#84cc16', // lime-500
];

const AdminAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostPlayed, setMostPlayed] = useState<TopicCount[]>([]);

  const load = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: history, error: hErr } = await supabase
          .from('quiz_history')
          .select('topic')
          .order('created_at', { ascending: false })
          .limit(2000);
        if (hErr) throw hErr;
        
        const topicMap = new Map<string, number>();
        let total = 0;
        for (const r of history ?? []) {
          const t = (r as any).topic as string;
          if (t) {
            topicMap.set(t, (topicMap.get(t) ?? 0) + 1);
            total++;
          }
        }
        
        const topics = Array.from(topicMap.entries())
          .map(([topic, count]) => ({ topic, count, percentage: total > 0 ? count / total : 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
          
        setMostPlayed(topics);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Generate conic gradient string
  let currentPct = 0;
  const gradientStops = mostPlayed.map((item, index) => {
    const start = currentPct;
    const end = currentPct + (item.percentage * 100);
    currentPct = end;
    return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
  }).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Analytics</div>
          <div className="text-2xl font-black">Usage & performance</div>
        </div>
        <button
          onClick={load}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-red-200">{error}</div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl max-w-4xl">
        <div className="text-xl font-bold mb-1">Most Played by Topic</div>
        <div className="text-sm text-slate-400 mb-8">Overall distribution of quiz topics in recent activity</div>
        
        {loading ? (
          <div className="text-slate-300">Loading...</div>
        ) : mostPlayed.length === 0 ? (
          <div className="text-slate-300">No data available.</div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Pie Chart */}
            <div 
              className="w-64 h-64 rounded-full shadow-2xl relative"
              style={{
                background: `conic-gradient(${gradientStops || 'transparent'})`,
              }}
            >
              {/* Inner circle for donut styling */}
              <div className="absolute inset-4 rounded-full bg-slate-900/90 shadow-inner flex items-center justify-center flex-col">
                <span className="text-3xl font-black">{mostPlayed.reduce((sum, item) => sum + item.count, 0)}</span>
                <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {mostPlayed.map((item, i) => (
                <div key={item.topic} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                      className="w-4 h-4 rounded shadow-sm shrink-0" 
                      style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                    />
                    <div className="truncate font-medium text-slate-200 pr-2" title={item.topic}>
                      {item.topic}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-100">{item.count}</div>
                    <div className="text-xs text-slate-500">{Math.round(item.percentage * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;


