import React, { useEffect, useState } from 'react';

type MembershipSummary = {
  packName?: string | null; startDate?: string; endDate?: string;
  remainingDays?: number | null; status?: string; paymentStatus?: string;
  durationType?: string | null; durationValue?: number | null;
};

type WeekPlan = {
  weekStart?: string;
  days: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', { name:string; sets?:number; reps?:string; notes?:string }[]>;
};

export default function CheckIn() {
  const [code, setCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ userId: string; name: string; at: string; id: string } | null>(null);
  const [membership, setMembership] = useState<MembershipSummary | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [err, setErr] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('memberUserCode'); if (saved) setCode(saved);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(''); setSuccess(null); setMembership(null); setPlan(null);
    try {
      const res = await fetch('/api/attendance/mark-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode: code.trim(), mobile: mobile.trim(), method: 'manual' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to check in');

      const name = [data?.user?.firstName, data?.user?.lastName].filter(Boolean).join(' ');
      const checkAt = new Date(data?.attendance?.timestamp || Date.now()).toLocaleString();
      const uid = String(data?.user?.id);
      setSuccess({ userId: data?.user?.userId, name, at: checkAt, id: uid });
      setMembership(data?.membership || null);

      // fetch weekly plan
      const pw = await fetch(`/api/workouts/week?userId=${encodeURIComponent(uid)}`).then(r => r.json());
      setPlan(pw);

      if (remember) localStorage.setItem('memberUserCode', code.trim());
      setCode(''); setMobile('');
    } catch (e:any) {
      setErr(e.message || 'Failed to check in');
    } finally { setBusy(false); }
  }

  const endStr = membership?.endDate ? new Date(membership.endDate).toLocaleDateString() : null;

  const order: Array<keyof NonNullable<WeekPlan>['days']> = ['mon','tue','wed','thu','fri','sat','sun'];
  const label: Record<string, string> = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday', sun:'Sunday' };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-bold mb-4 text-center">Mark Attendance</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Your User ID</label>
            <input autoFocus value={code} onChange={(e)=>setCode(e.target.value)} className="w-full rounded-xl border px-3 py-3 text-lg tracking-widest" placeholder="e.g., U00001" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile number (last 4 digits OK)</label>
            <input value={mobile} onChange={(e)=>setMobile(e.target.value)} className="w-full rounded-xl border px-3 py-3" placeholder="e.g., 1234" />
            <div className="mt-2 flex items-center gap-2">
              <input id="remember" type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <label htmlFor="remember" className="text-xs text-gray-600">Remember this device</label>
            </div>
          </div>

          {err && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{err}</div>}
          {success && (
            <div className="p-3 rounded-2xl bg-green-50 text-green-700 text-sm">
              Checked in: <span className="font-semibold">{success.userId}</span>{success.name ? ` — ${success.name}` : '' }
              <div className="text-xs text-green-800">at {success.at}</div>
            </div>
          )}

          <button type="submit" disabled={busy} className="w-full px-4 py-3 rounded-xl bg-black text-white">{busy ? 'Checking in…' : 'Check In'}</button>
        </form>

        {membership && (
          <div className="mt-6 rounded-2xl bg-gray-50 border p-4 text-sm">
            <div className="font-semibold mb-1">Your Membership</div>
            <div>Pack: <span className="font-medium">{membership.packName || '—'}</span></div>
            {endStr && <div>Ends on: <span className="font-medium">{endStr}</span></div>}
            {typeof membership.remainingDays === 'number' && membership.durationType !== 'sessions' && (
              <div>Days remaining: <span className="font-medium">{membership.remainingDays}</span></div>
            )}
          </div>
        )}

        {plan && (
          <div className="mt-6">
            <div className="font-semibold mb-2">This Week’s Workouts</div>
            <div className="space-y-3">
              {order.map(d => (
                <div key={d} className="rounded-2xl border p-3">
                  <div className="text-sm font-medium mb-1">{label[d]}</div>
                  {(plan.days?.[d] || []).length === 0 ? (
                    <div className="text-xs text-gray-500">Rest / no workout assigned</div>
                  ) : (
                    <ul className="text-sm list-disc pl-5">
                      {plan.days[d].map((ex, i) => (
                        <li key={i}>
                          {ex.name}{ex.sets ? ` · ${ex.sets} sets` : ''}{ex.reps ? ` × ${ex.reps}` : ''}{ex.notes ? ` — ${ex.notes}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
