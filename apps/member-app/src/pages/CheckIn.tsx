import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { User, Phone, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export default function CheckIn() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [remember, setRemember] = useState<boolean>(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem("memberUserCode");
    if (savedCode) setCode(savedCode);

    const savedId = localStorage.getItem("memberId");
    if (savedId) navigate(`/me/${savedId}`);
  }, [navigate]);

  function onMobileChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setMobile(digits);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setErr("User ID required");
    if (mobile.length !== 4) return setErr("Mobile last 4 required");

    setBusy(true);
    setErr("");

    try {
      const { data } = await api.post("/attendance/mark-by-code", {
        userCode: code.trim(),
        mobile: mobile.trim(),
        method: "manual",
      });

      if (!data || !data.user) throw new Error(data?.error || "Check-in failed");

      const user = data.user;
      const mongoId = user._id || user.id;

      if (remember) {
        localStorage.setItem("memberUserCode", code.trim());
        localStorage.setItem("memberId", String(mongoId));
      }

      setSuccess(true);
      setTimeout(() => navigate(`/me/${mongoId}`), 1000);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || "Failed to check in");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = code.trim() && mobile.length === 4 && !busy;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-10 border border-slate-100 overflow-hidden relative">

          {success && (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/40">
                <CheckCircle2 size={40} className="text-white animate-in zoom-in-50 duration-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase underline decoration-emerald-500 underline-offset-8">Authenticated</h2>
              <p className="text-slate-400 mt-4 font-bold text-xs tracking-widest uppercase">Initializing Dashboard...</p>
            </div>
          )}

          <div className="text-center mb-10">
            <div className="w-12 h-1 bg-slate-900 mx-auto mb-6 rounded-full" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Enter the Lab</h1>
            <p className="text-slate-400 mt-3 font-medium text-sm flex items-center justify-center gap-1">
              <MapPin size={14} className="text-slate-300" />
              Main Facility Access
            </p>
          </div>

          <form onSubmit={submit} className="space-y-8">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-slate-900 transition-colors">Identification</label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-slate-900 transition-colors" />
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-slate-100 py-4 pl-8 text-2xl font-black tracking-widest focus:outline-none focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-100"
                  placeholder="USER_ID"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-slate-900 transition-colors">Verification Pin</label>
              <div className="relative">
                <Phone className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-slate-900 transition-colors" />
                <input
                  value={mobile}
                  onChange={(e) => onMobileChange(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-slate-100 py-4 pl-8 text-2xl font-black tracking-[0.5em] focus:outline-none focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-100"
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${remember ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}>
                  {remember && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Trust this source</span>
              </label>
            </div>

            {err && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-shake">
                <ShieldCheck size={16} />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-30 text-white py-5 rounded-2xl font-black uppercase italic tracking-tighter text-xl shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              {busy ? (
                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>INITIALIZE ACCESS</>
              )}
            </button>
          </form>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            Account Override
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
