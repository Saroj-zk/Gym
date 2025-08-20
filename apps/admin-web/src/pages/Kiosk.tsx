import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// Explicitly target the member app host
const MEMBER_URL = import.meta.env.VITE_MEMBER_URL || 'http://localhost:5174';

export default function Kiosk() {
  const [code, setCode] = useState('');
  const [deviceId, setDeviceId] = useState(localStorage.getItem('kioskDeviceId') || 'FrontDesk-1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('kioskDeviceId', deviceId);
  }, [deviceId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    try {
      const res = await axios.post('/api/attendance/mark-by-code', {
        userCode: code.trim(),
        method: 'kiosk',
        deviceId,
      });

      const u = res.data?.user;
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ');
      const uid = u?.id || u?._id;

      setMsg(`Checked in: ${u?.userId}${name ? ' — ' + name : ''}`);
      setCode('');

      if (uid) {
        // Open MEMBER APP — avoids any admin routing
        // Same tab:
        // window.location.assign(`${MEMBER_URL}/me/${uid}`);

        // New tab (recommended for kiosks):
        window.open(`${MEMBER_URL}/me/${uid}`, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || 'Failed to check in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Kiosk Check-in</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">User ID</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-2xl border px-4 py-4 text-2xl tracking-widest"
              placeholder="Enter member User ID"
            />
          </div>

          <div className="mt-2 text-center">
            <Link to="/admin-login" className="text-sm text-gray-600 underline">Admin login</Link>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Device ID</label>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Used to identify the front-desk kiosk in logs.</p>
          </div>

          {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{err}</div>}
          {msg && <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm">{msg}</div>}

          <button type="submit" disabled={busy} className="w-full px-4 py-3 rounded-xl bg-black text-white">
            {busy ? 'Checking in…' : 'Check In'}
          </button>
        </form>
      </div>
    </div>
  );
}
