import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// This page lives inside admin-web, so we can just navigate locally after login.
export default function AdminLogin() {
  const nav = useNavigate();
  const [emailOrUserId, setId] = useState('');
  const [password, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body: any = { password };
      if (emailOrUserId.includes('@')) body.email = emailOrUserId.trim();
      else body.userId = emailOrUserId.trim();

      // ✅ use the admin-specific endpoint
      await axios.post('/api/auth/admin/login', body, { withCredentials: true });

      // ✅ single redirect: go to admin dashboard home
      nav('/');
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="text-lg font-semibold mb-1">Admin Login</div>
        <div className="text-sm text-gray-600 mb-4">Sign in to Admin Dashboard</div>

        <label className="block text-sm text-gray-600 mb-1">Email or Admin User ID</label>
        <input
          value={emailOrUserId}
          onChange={e=>setId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-3"
          autoFocus
        />

        <label className="block text-sm text-gray-600 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPw(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-4"
        />

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <button disabled={busy} className="w-full px-4 py-2 rounded-xl bg-black text-white">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 text-center">
          <Link to="/kiosk" className="text-sm text-gray-600 underline">Back to Kiosk</Link>
        </div>
      </form>
    </div>
  );
}
