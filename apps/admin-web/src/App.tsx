import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

type Me =
  | { _id: string; userId: string; firstName?: string; lastName?: string; email?: string; role: 'admin' }
  | null;

export default function App() {
  const location = useLocation();
  const nav = useNavigate();
  const [me, setMe] = useState<Me | undefined>(undefined); // undefined = loading

  useEffect(() => {
    axios
      .get('/api/auth/admin/me', { withCredentials: true })
      .then((r) => setMe(r.data || null))
      .catch(() => setMe(null));
  }, []);

  const onKioskOrLogin =
    location.pathname.startsWith('/kiosk') ||
    location.pathname.startsWith('/admin-login');

  const showHeader = !!me && me.role === 'admin' && !onKioskOrLogin;

  async function logout() {
    try {
      await axios.post('/api/auth/admin/logout', {}, { withCredentials: true });
    } catch {}
    setMe(null);
    nav('/kiosk'); // send back to kiosk/login
  }

  // NEW: guard — if unauthenticated and not on kiosk/login, push to /admin-login
  useEffect(() => {
    if (me === null && !onKioskOrLogin) {
      nav('/admin-login', { replace: true });
    }
  }, [me, onKioskOrLogin, nav]);

  // While checking session, avoid flashing content on protected pages
  if (me === undefined && !onKioskOrLogin) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white shadow">
          <div className="max-w-6xl mx-auto p-4 flex gap-4 items-center">
            <h1 className="font-bold">Gym Admin</h1>
            <nav className="flex gap-4 text-sm">
              <Link to="/">Dashboard</Link>
              <Link to="/users">Users</Link>
              <Link to="/packs">Packs</Link>
              <Link to="/payments">Payments</Link>
              <Link to="/attendance">Attendance</Link>
              <Link to="/workouts">Workouts</Link>
              <Link to="/supplements">Supplements</Link>
              <Link to="/kiosk">Kiosk</Link>
              <Link to="/sales">Orders</Link>
              <Link to="/leaderboard">Leaderboard</Link>
            </nav>
            <div className="ml-auto">
              <button onClick={logout} className="px-3 py-2 rounded-xl border text-sm">
                Log out
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto">
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
        </Routes>
      </main>
    </div>
  );
}
