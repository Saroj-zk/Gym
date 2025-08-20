import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckIn() {
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(true);

  // If a member was remembered earlier, send them straight to their page
  useEffect(() => {
    const savedCode = localStorage.getItem('memberUserCode');
    if (savedCode) setCode(savedCode);

    const savedId = localStorage.getItem('memberId');
    if (savedId) navigate(`/me/${savedId}`);
  }, [navigate]);

  function onMobileChange(v: string) {
    // digits only, max length 4
    const digits = v.replace(/\D/g, '').slice(0, 4);
    setMobile(digits);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setErr('User ID is required'); return; }
    if (mobile.length !== 4) { setErr('Enter last 4 digits of your mobile'); return; }

    setBusy(true); setErr('');

    try {
      const res = await fetch('/api/attendance/mark-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCode: code.trim(),
          mobile: mobile.trim(),     // server accepts full or last-4; we send last-4
          method: 'manual',
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to check in');

      const user = data?.user;
      const mongoId = user?._id || user?.id;
      if (!mongoId) throw new Error('User ID not returned by server');

      if (remember) {
        localStorage.setItem('memberUserCode', code.trim());
        localStorage.setItem('memberId', String(mongoId));
      } else {
        localStorage.removeItem('memberUserCode');
        localStorage.removeItem('memberId');
      }

      // 🚀 Go to member home (workouts + supplements)
      navigate(`/me/${mongoId}`);
    } catch (e: any) {
      setErr(e.message || 'Failed to check in');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = code.trim() && mobile.length === 4 && !busy;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-bold mb-4 text-center">Member Check-in</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Your User ID</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border px-3 py-3 text-lg tracking-widest"
              placeholder="e.g., U00001"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile last 4 (required)</label>
            <input
              value={mobile}
              onChange={(e) => onMobileChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-3"
              placeholder="e.g., 1234"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember" className="text-xs text-gray-600">
                Remember this device
              </label>
            </div>
          </div>

          {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full px-4 py-3 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {busy ? 'Checking in…' : 'Check In'}
          </button>
        </form>
      </div>
    </div>
  );
}
