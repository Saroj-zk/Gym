import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Smartphone, User, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function MemberLogin() {
  const nav = useNavigate();
  const [userId, setUserId] = useState("");
  const [mobileLast4, setMobileLast4] = useState("");
  const [status, setStatus] = useState<"idle" | "authenticating" | "success" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("authenticating");
    setErr("");

    try {
      // Artificial delay for the "sequence" effect
      await new Promise(r => setTimeout(r, 1500));

      const res = await api.post("/auth/member/login", {
        userId: userId.trim(),
        mobileLast4: mobileLast4.trim()
      });

      if (res.data?.token) {
        localStorage.setItem('member_token', res.data.token);
      }

      const uid = res.data?.user?._id;
      if (!uid) throw new Error("No user id");

      setStatus("success");
      setTimeout(() => {
        nav(`/me/${uid}`);
      }, 1000);

    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || "Invalid Credentials");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const isValid = userId.length > 0 && mobileLast4.length === 4;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-['Rajdhani'] relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-200 via-slate-900 to-slate-200" />
      <div className="absolute bottom-0 right-0 p-12 opacity-5 pointer-events-none">
        <h1 className="text-9xl font-black text-slate-900">GYM</h1>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-white p-10 relative z-10 transition-all duration-500 ease-out">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-wider mb-1">MEMBER ACCESS</h2>
          <p className="text-slate-400 font-sans text-xs tracking-widest uppercase">Secure Gateway</p>
        </div>

        <form onSubmit={submit} className="space-y-8">
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300 transition-all group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">User ID</label>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-300 group-focus-within:text-slate-900" />
                <input
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  className="bg-transparent w-full text-lg font-bold text-slate-900 placeholder-slate-300 focus:outline-none font-sans"
                  placeholder="ID"
                  autoFocus
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300 transition-all group">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Security Pin</label>
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-slate-300 group-focus-within:text-slate-900" />
                <input
                  value={mobileLast4}
                  onChange={e => {
                    if (e.target.value.length <= 4 && /^\d*$/.test(e.target.value)) setMobileLast4(e.target.value);
                  }}
                  type="text"
                  inputMode="numeric"
                  className="bg-transparent w-full text-xl font-bold text-slate-900 placeholder-slate-300 focus:outline-none tracking-[0.5em] font-sans"
                  placeholder="••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || status !== 'idle'}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2
              ${isValid
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-[1.02] hover:bg-black"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"}
            `}
          >
            <span>Enter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">GymStack Systems v2.1</p>
        </div>
      </div>

      {/* Authentication Overlay */}
      {status !== 'idle' && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          {status === 'authenticating' && (
            <>
              <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-6" />
              <p className="text-xl font-bold tracking-widest animate-pulse">VERIFYING IDENTITY</p>
              <p className="text-xs text-slate-500 mt-2 font-mono">HANDSHAKE_INITIATED...</p>
            </>
          )}

          {status === 'success' && (
            <div className="animate-in zoom-in-90 duration-300 text-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/50">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold tracking-widest mb-2">ACCESS GRANTED</h2>
              <p className="text-emerald-400 font-mono text-sm">WELCOME BACK</p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-in zoom-in-90 duration-300 text-center">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/50">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold tracking-widest mb-2">ACCESS DENIED</h2>
              <p className="text-red-400 font-mono text-sm uppercase">{err}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
