import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function MemberLogin() {
  const nav = useNavigate();
  const [userId, setUserId] = useState('');
  const [mobileLast4, setMobileLast4] = useState('');
  const [password, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body: any = { userId: userId.trim() };
      if (password.trim()) body.password = password.trim();
      else body.mobileLast4 = mobileLast4.trim();
      const res = await axios.post('/api/auth/member/login', body, { withCredentials: true });
      const uid = res.data?.user?._id;
      nav(`/me/${uid}`);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = userId.trim() && (mobileLast4.trim() || password.trim());

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="text-lg font-semibold mb-1">Member Login</div>
        <div className="text-sm text-gray-600 mb-4">Use your User ID + mobile last 4 (or password)</div>

        <label className="block text-sm text-gray-600 mb-1">User ID</label>
        <input value={userId} onChange={e=>setUserId(e.target.value)} className="w-full rounded-xl border px-3 py-2 mb-3" autoFocus />

        <div className="grid grid-cols-1 gap-2 mb-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile last 4</label>
            <input value={mobileLast4} onChange={e=>setMobileLast4(e.target.value)} className="w-full rounded-xl border px-3 py-2" inputMode="numeric" pattern="[0-9]*" />
          </div>
          <div className="text-xs text-gray-500 text-center">— or —</div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password (optional)</label>
            <input type="password" value={password} onChange={e=>setPw(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
          </div>
        </div>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <button disabled={busy || !canSubmit} className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-gray-600 underline">Back to Check-in</Link>
        </div>
      </form>
    </div>
  );
}
