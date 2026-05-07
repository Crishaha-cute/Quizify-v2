import React, { useEffect, useMemo, useState } from 'react';
import { AdminSection } from '../../types.ts';
import * as profileService from '../../services/profileService.ts';
import * as authService from '../../services/authService.ts';
import * as activityService from '../../services/activityService.ts';
import AdminLayout from './AdminLayout.tsx';
import AdminDashboardPage from './pages/AdminDashboardPage.tsx';
import AdminQuizzesPage from './pages/AdminQuizzesPage.tsx';
import AdminUsersPage from './pages/AdminUsersPage.tsx';
import AdminLeaderboardPage from './pages/AdminLeaderboardPage.tsx';
import AdminSeasonsPage from './pages/AdminSeasonsPage.tsx';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.tsx';

const AdminApp: React.FC = () => {
  const [section, setSection] = useState<AdminSection>(AdminSection.DASHBOARD);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useMemo(() => {
    return async () => {
      setChecking(true);
      setError(null);
      try {
        const admin = await profileService.getIsAdmin();
        setIsAdmin(admin);
      } catch (e: any) {
        setError(e?.message || 'Failed to verify admin access.');
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const handleLogout = async () => {
    activityService.logActivity('logout', 'Admin logged out').catch(() => undefined);
    await authService.logout();
    profileService.clearIsAdminCache();
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-2xl font-bold">Admin Panel</div>
          <div className="text-slate-300 mt-2">Checking access…</div>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="text-xl font-bold">Access denied</div>
          <div className="text-slate-300 mt-2">You don’t have admin privileges for this app.</div>
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
          <a
            href="/"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors px-4 py-3 font-semibold"
          >
            Back to app
          </a>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout section={section} onSectionChange={setSection} onLogout={handleLogout}>
      {section === AdminSection.DASHBOARD && <AdminDashboardPage />}
      {section === AdminSection.QUIZZES && <AdminQuizzesPage />}
      {section === AdminSection.USERS && <AdminUsersPage />}
      {section === AdminSection.LEADERBOARD && <AdminLeaderboardPage />}
      {section === AdminSection.SEASONS && <AdminSeasonsPage />}
      {section === AdminSection.ANALYTICS && <AdminAnalyticsPage />}
    </AdminLayout>
  );
};

export default AdminApp;


