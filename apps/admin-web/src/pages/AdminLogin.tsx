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
      const body: Record<string, string> = { password: password.trim() };
      const id = emailOrUserId.trim();
      if (id.includes('@')) body.email = id;
      else body.userId = id;

      // Hit the Render API (via axios client with baseURL)
      const { data } = await api.post('/auth/admin/login', body);
      if (!data?.ok) throw new Error(data?.error || 'Login failed');

      // Optionally confirm cookie
      await api.get('/auth/admin/me').catch(() => {});

      nav('/'); // go to admin dashboard
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

  const canSubmit = emailOrUserId.trim().length > 0 && password.trim().length > 0 && !busy;

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="text-lg font-semibold mb-1">Admin Login</div>
        <div className="text-sm text-gray-600 mb-4">Sign in to Admin Dashboard</div>

        <label className="block text-sm text-gray-600 mb-1">Email or Admin User ID</label>
        <input
          value={emailOrUserId}
          onChange={(e) => setId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-3"
          autoFocus
        />

        <label className="block text-sm text-gray-600 mb-1">Password</label>
        <input
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
          <Link to="/kiosk" className="text-sm text-gray-600 underline">
            Back to Kiosk
          </Link>
        </div>
      </form>
    </div>
  );
}
