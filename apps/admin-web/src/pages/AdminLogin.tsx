import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function AdminLogin() {
  const nav = useNavigate();
  const [emailOrUserId, setId] = useState('');
  const [password, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const id = emailOrUserId.trim();
      const body: Record<string, string> = { password: password.trim() };
      if (id.includes('@')) body.email = id; else body.userId = id;

      // 1) Login to API (must be the API origin from VITE_API_URL)
      await api.post('/auth/admin/login', body);

      // 2) Confirm the cookie works
      await api.get('/auth/admin/me');

      // 3) Go to dashboard
      nav('/');
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Login failed';
      setErr(String(msg));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = emailOrUserId.trim() && password.trim() && !busy;

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="text-lg font-semibold mb-1">Admin Login</div>
        <div className="text-sm text-gray-600 mb-4">Sign in to Admin Dashboard</div>

        <label className="block text-sm text-gray-600 mb-1" htmlFor="admin-id">
          Email or Admin User ID
        </label>
        <input
          id="admin-id"
          value={emailOrUserId}
          onChange={(e) => setId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-3"
          autoFocus
        />

        <label className="block text-sm text-gray-600 mb-1" htmlFor="admin-pw">
          Password
        </label>
        <input
          id="admin-pw"
          type="password"
          value={password}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-4"
        />

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 text-center">
          <Link to="/kiosk" className="text-sm text-gray-600 underline">Back to Kiosk</Link>
        </div>
      </form>
    </div>
  );
}
