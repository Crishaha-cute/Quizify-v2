import React from 'react';
import { AdminSection } from '../../types.ts';

const nav: { id: AdminSection | string; label: string }[] = [
  { id: AdminSection.DASHBOARD, label: 'Dashboard' },
  { id: AdminSection.QUIZZES, label: 'Quiz Management' },
  { id: AdminSection.QUESTIONS, label: 'Questions' },
  { id: AdminSection.USERS, label: 'Users' },
  { id: AdminSection.LEADERBOARD, label: 'Leaderboard' },
  { id: AdminSection.SEASONS, label: 'Seasons' },
  { id: AdminSection.UPLOADED_FILES, label: 'Uploaded Files' },
  { id: AdminSection.ANALYTICS, label: 'Analytics' },
  { id: 'Audit', label: 'Audit Log' },
  { id: AdminSection.SETTINGS, label: 'Settings' },
];

const AdminLayout: React.FC<{
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  children: React.ReactNode;
}> = ({ section, onSectionChange, children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-slate-800 bg-slate-950">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
                <span className="font-black text-indigo-200">QF</span>
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">QuiziFy</div>
                <div className="text-xs text-slate-400">Admin Console</div>
              </div>
            </div>
          </div>

          <nav className="px-3 pb-6 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                    active
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-100'
                      : 'bg-slate-950 border-slate-900 text-slate-200 hover:bg-slate-900/40 hover:border-slate-800'
                  }`}
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  {active && <span className="text-xs text-indigo-200">Active</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto p-4 border-t border-slate-800">
            <a
              href="/"
              className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-4 py-3 text-sm font-semibold transition-colors"
            >
              Back to app
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:ml-72">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800">
            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Admin</div>
                <div className="text-xl font-bold">{section}</div>
              </div>
              <div className="text-xs text-slate-400 hidden sm:block">
                Tip: Use search + filters in each tool to manage data quickly.
              </div>
            </div>
          </div>

          <div className="px-4 md:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;


