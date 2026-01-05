import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, CheckCircle, XCircle, Info, Monitor, Lock, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

export default function Kiosk() {
  const [code, setCode] = useState('');
  const [deviceId, setDeviceId] = useState(
    localStorage.getItem('kioskDeviceId') || 'FrontDesk-1'
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('kioskDeviceId', deviceId);
  }, [deviceId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;

    setBusy(true);
    setMsg('');
    setErr('');

    try {
      const { data } = await api.post('/attendance/mark-by-code', {
        userCode: code.trim(),
        method: 'kiosk',
        deviceId,
      });

      const u = data?.user;
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ');
      setMsg(`Welcome back, ${name || u?.userId}! Check-in successful.`);
      setCode('');
      // Auto-clear message after 4s
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) {
      const m =
        e?.response?.data?.error ??
        (typeof e?.response?.data === 'string' ? e.response.data : '') ??
        e?.message ??
        'Failed to check in';
      setErr(String(m));
      setTimeout(() => setErr(''), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <UserCheck size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Member Check-in</h1>
          <p className="text-slate-300 mt-2">Enter your User ID to check in</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-3xl font-bold text-center text-white placeholder:text-white/20 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
              placeholder="USER ID"
            />
          </div>

          {err && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
              <XCircle size={20} className="shrink-0" />
              {err}
            </div>
          )}
          {msg && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle size={20} className="shrink-0" />
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="w-full px-6 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-lg shadow-lg shadow-brand-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {busy ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Check In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/30 hover:text-white/50 text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <Monitor size={12} />
            {showSettings ? 'Hide Device Settings' : 'Kiosk Settings'}
          </button>

          {showSettings && (
            <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-left">Device Identifier</label>
              <input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                placeholder="e.g. FrontDesk"
              />
              <div className="mt-4 pt-4 border-t border-white/5">
                <Link to="/admin-login" className="flex items-center justify-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  <Lock size={14} /> Go to Admin Panel
                </Link>
              </div>
            </div>
          )}

          {!showSettings && (
            <div className="mt-6">
              <Link to="/admin-login" className="text-white/20 hover:text-white/40 text-xs transition-colors">
                Staff Login
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 text-center w-full z-0">
        <p className="text-white/10 text-xs uppercase tracking-[0.2em] font-medium">Gym Management System</p>
      </div>
    </div>
  );
}
