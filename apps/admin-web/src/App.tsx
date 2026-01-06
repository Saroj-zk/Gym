// apps/admin-web/src/App.tsx
import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { AppLayout } from './components/AppLayout';

import Dashboard from './pages/Dashboard';
import Packs from './pages/Packs';
import Users from './pages/Users';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import Kiosk from './pages/Kiosk';
import Workouts from './pages/Workouts';
import UserProfile from './pages/UserProfile';
import Supplements from './pages/Supplements';
import Sales from './pages/Sales';
import AdminLogin from './pages/AdminLogin';
import Leaderboard from './pages/Leaderboard';
import DietFoods from './pages/DietFoods';
import Appointments from './pages/Appointments';

type Me =
  | { _id: string; userId: string; firstName?: string; lastName?: string; email?: string; role: 'admin' }
  | null;

export default function App() {
  const location = useLocation();
  const nav = useNavigate();
  const [me, setMe] = useState<Me | undefined>(undefined); // undefined = checking

  const onKioskOrLogin =
    location.pathname.startsWith('/kiosk') ||
    location.pathname.startsWith('/admin-login');

  async function fetchMe() {
    try {
      const res = await api.get('/auth/admin/me', {
        // Accept 304 (Not Modified) as a “success” status too
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      });
      // If 304, keep previous value (don’t clobber to null)
      setMe((prev) => (res.status === 304 ? (prev ?? null) : (res.data || null)));
    } catch {
      setMe(null);
    }
  }

  // Initial check
  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check after SPA navigations (e.g. right after login nav('/'))
  useEffect(() => {
    if (!onKioskOrLogin) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const showHeader = !!me && me.role === 'admin' && !onKioskOrLogin;

  async function logout() {
    try { await api.post('/auth/admin/logout', {}); } catch { }
    setMe(null);
    nav('/kiosk');
  }

  // Guard: unauthenticated → push to /admin-login (but allow kiosk)
  useEffect(() => {
    if (me === null && !onKioskOrLogin) {
      nav('/admin-login', { replace: true });
    }
  }, [me, onKioskOrLogin, nav]);

  // If already logged in and on the login page, send to dashboard
  useEffect(() => {
    if (me && location.pathname === '/admin-login') {
      nav('/', { replace: true });
    }
  }, [me, location.pathname, nav]);

  // While checking session, avoid flashing protected pages
  if (me === undefined && !onKioskOrLogin) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const routes = (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/users" element={<Users />} />
      <Route path="/packs" element={<Packs />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/workouts" element={<Workouts />} />
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/users/:id" element={<UserProfile />} />
      <Route path="/supplements" element={<Supplements />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/diet-foods" element={<DietFoods />} />
      <Route path="/appointments" element={<Appointments />} />
    </Routes>
  );

  if (showHeader) {
    return (
      <AppLayout onLogout={logout} user={me}>
        {routes}
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main>
        {routes}
      </main>
    </div>
  );
}
