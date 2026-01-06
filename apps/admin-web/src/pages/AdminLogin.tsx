import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import loginBg from '../assets/login-bg.png';

export default function AdminLogin() {
  const nav = useNavigate();
  const [emailOrUserId, setId] = useState('');
  const [password, setPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBg}
          alt="Gym Background"
          className="w-full h-full object-cover opacity-60 scale-105"
          style={{ animation: 'zoom-out 20s infinite alternate linear' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-black/80" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 z-10" />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo / Branding */}
        <div className="mb-8 text-center animate-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600 mb-4 shadow-lg shadow-orange-600/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GYM<span className="text-orange-500">STACK</span></h1>
          <p className="text-gray-400 mt-2 font-medium">Administration Control Center</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 ml-1" htmlFor="admin-id">
                Admin Identifier
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {emailOrUserId.includes('@') ? (
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                  ) : (
                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                  )}
                </div>
                <input
                  id="admin-id"
                  type="text"
                  value={emailOrUserId}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Email or User ID"
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 ml-1" htmlFor="admin-pw">
                Security Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  id="admin-pw"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="group relative w-full overflow-hidden rounded-2xl bg-orange-600 py-4 text-white font-semibold shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 disabled:opacity-50 disabled:shadow-none transition-all duration-300 active:scale-[0.98]"
            >
              <div className="absolute inset-0 w-3 bg-white/20 skew-x-[45deg] -translate-x-full group-hover:animate-shine" />
              <div className="flex items-center justify-center gap-2">
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link
              to="/kiosk"
              className="text-sm text-gray-500 hover:text-orange-400 transition-colors inline-flex items-center gap-2"
            >
              <span>Back to Public Kiosk</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-gray-600 text-xs tracking-widest uppercase">
          &copy; {new Date().getFullYear()} GYMSTACK ENTERPRISE SECURITY
        </p>
      </div>

      <style>{`
        @keyframes zoom-out {
          from { transform: scale(1.1); }
          to { transform: scale(1); }
        }
        @keyframes shine {
          100% { transform: translateX(500%) skewX(45deg); }
        }
        .animate-shine {
          animation: shine 0.8s ease-in-out;
        }
      `}</style>
    </div>
  );
}

