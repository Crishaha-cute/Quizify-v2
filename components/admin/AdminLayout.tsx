import React, { useState } from 'react';
import { AdminSection } from '../../types.ts';

const nav: { id: AdminSection | string; label: string; icon?: React.ReactNode }[] = [
  { id: AdminSection.DASHBOARD, label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: AdminSection.QUIZZES, label: 'Quiz Management', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  { id: AdminSection.USERS, label: 'Users', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { id: AdminSection.LEADERBOARD, label: 'Leaderboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
  { id: AdminSection.SEASONS, label: 'Seasons', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { id: AdminSection.UPLOADED_FILES, label: 'Uploaded Files', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> },
  { id: AdminSection.ANALYTICS, label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { id: AdminSection.AUDIT_LOG, label: 'Audit Log', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> },
  { id: AdminSection.SETTINGS, label: 'Settings', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

const AdminLayout: React.FC<{
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  children: React.ReactNode;
}> = ({ section, onSectionChange, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-slate-800 bg-slate-950 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex flex-shrink-0 items-center justify-center">
                <span className="font-black text-indigo-400">QF</span>
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">QuiziFy</div>
                <div className="text-xs text-slate-400">Admin Console</div>
              </div>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="px-4 pb-6 space-y-1.5 flex-1 overflow-y-auto mt-2">
            {nav.map((item) => {
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id as AdminSection);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                    active
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-sm'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                  }`}
                >
                  <div className={`${active ? 'text-indigo-400' : 'text-slate-500'}`}>{item.icon}</div>
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto p-4 border-t border-slate-800/50">
            <a
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Exit to app
            </a>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 md:ml-72 min-w-0 transition-all duration-300 ease-in-out">
          {/* Top bar */}
          <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
            <div className="px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="md:hidden text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div>
                  <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Admin Panel</div>
                  <div className="text-xl sm:text-2xl font-black text-white">{section}</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 hidden lg:block bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                System Operational
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


