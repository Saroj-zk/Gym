import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

type User = {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  status?: string;
  dob?: string;
  gender?: string;
  createdAt?: string;
  notes?: string;
};

type Pack = { _id: string; name: string; durationType: 'days' | 'months' | 'sessions'; durationValue: number };
type Membership = {
  _id: string;
  packId?: Pack | string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
};
type Payment = { _id: string; amount: number; method?: string; description?: string; createdAt?: string };
type Attendance = { _id: string; timestamp: string; method?: string };

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Exercise = { name: string; sets?: number; reps?: string; notes?: string };
type Days = Record<DayKey, Exercise[]>;

const dayLabels: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function startOfWeek(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function getErr(e: any, fallback = 'Request failed') {
  return (
    e?.response?.data?.error ??
    (typeof e?.response?.data === 'string' ? e.response.data : '') ??
    e?.message ??
    fallback
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<'memberships' | 'payments' | 'attendance' | 'workouts' | 'notes'>(
    'memberships'
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // workouts
  const [week, setWeek] = useState<Date>(startOfWeek());
  const [plan, setPlan] = useState<Days | null>(null);

  // notes
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const weekInputValue = new Date(week.getTime() - week.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      setError('');

      // user
      const ures = await api.get(`/users/${id}`);
      setUser(ures.data);
      setNotes(ures.data?.notes || '');

      // memberships + payments
      const [mres, pres] = await Promise.all([
        api.get('/memberships', { params: { userId: id } }),
        api.get('/payments', { params: { userId: id, limit: 200 } }),
      ]);

      const mm: Membership[] = mres.data || [];
      mm.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setMemberships(mm);

      const pp: Payment[] = pres.data || [];
      pp.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setPayments(pp);

      // attendance (last 30 days)
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const ares = await api.get('/attendance', {
        params: { userId: id, from: since.toISOString().slice(0, 10) },
      });
      setAttendance(ares.data || []);

      await loadPlan(week);
    } catch (e: any) {
      setError(getErr(e, 'Failed to load profile'));
    } finally {
      setLoading(false);
    }
  }

  async function loadPlan(weekDate: Date) {
    if (!id) return;
    try {
      const res = await api.get('/workouts/week', {
        params: { userId: id, weekStart: new Date(weekDate).toISOString() },
      });
      const days: Days = res.data?.days || {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      };
      setPlan(days);
    } catch {
      setPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }
  }

  async function saveNotes() {
    if (!id) return;
    setSavingNotes(true);
    try {
      await api.patch(`/users/${id}`, { notes });
    } catch (e: any) {
      alert(getErr(e, 'Failed to save notes'));
    } finally {
      setSavingNotes(false);
    }
  }

  function prevWeek() {
    const d = new Date(week);
    d.setDate(d.getDate() - 7);
    const w = startOfWeek(d);
    setWeek(w);
    loadPlan(w);
  }
  function nextWeek() {
    const d = new Date(week);
    d.setDate(d.getDate() + 7);
    const w = startOfWeek(d);
    setWeek(w);
    loadPlan(w);
  }
  function todayWeek() {
    const w = startOfWeek(new Date());
    setWeek(w);
    loadPlan(w);
  }

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' '),
    [user]
  );

  if (!id) return <div className="p-6">Invalid user id</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">
            <Link to="/users" className="hover:underline">
              Users
            </Link>{' '}
            / Profile
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold">
            {fullName || 'User'}{' '}
            <span className="text-gray-400 font-normal">({user?.userId})</span>
          </h1>
          <div className="text-sm text-gray-600 mt-1">
            {user?.email || '—'} · {user?.mobile || '—'}
          </div>
        </div>
        <button onClick={() => nav('/workouts')} className="px-3 py-2 rounded-xl border">
          Open Workouts Editor
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['memberships', 'payments', 'attendance', 'workouts', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-xl border text-sm ${
              tab === t ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading && <div className="text-gray-500">Loading…</div>}

      {!loading && tab === 'memberships' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Pack</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => {
                const packName =
                  typeof m.packId === 'object' ? (m.packId as any)?.name : m.packId || '—';
                const end =
                  m.endDate
                    ? new Date(m.endDate).toLocaleDateString()
                    : (m as any)?.packId?.durationType === 'sessions'
                    ? 'sessions-based'
                    : '—';
                return (
                  <tr key={m._id} className="border-t">
                    <td className="px-4 py-3">{packName || '—'}</td>
                    <td className="px-4 py-3">
                      {m.startDate ? new Date(m.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">{end}</td>
                    <td className="px-4 py-3">{m.status || '—'}</td>
                    <td className="px-4 py-3">{m.paymentStatus || '—'}</td>
                    <td className="px-4 py-3">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'payments' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="px-4 py-3">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">₹{p.amount}</td>
                  <td className="px-4 py-3">{p.method || '—'}</td>
                  <td className="px-4 py-3">{p.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'attendance' && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Method</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a) => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-3">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.method || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'workouts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="px-3 py-2 rounded-xl border">
              ◀ Prev
            </button>
            <button onClick={todayWeek} className="px-3 py-2 rounded-xl border">
              This Week
            </button>
            <button onClick={nextWeek} className="px-3 py-2 rounded-xl border">
              Next ▶
            </button>
            <input
              type="date"
              value={weekInputValue}
              onChange={(e) => {
                const w = startOfWeek(new Date(e.target.value + 'T00:00:00'));
                setWeek(w);
                loadPlan(w);
              }}
              className="rounded-xl border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((d) => (
              <div key={d} className="rounded-2xl bg-white shadow p-4">
                <div className="font-medium mb-2">{dayLabels[d]}</div>
                {(plan?.[d] || []).length === 0 ? (
                  <div className="text-xs text-gray-500">No exercises</div>
                ) : (
                  <ul className="list-disc text-sm pl-5">
                    {plan?.[d]?.map((ex, i) => (
                      <li key={i}>
                        {ex.name}
                        {ex.sets ? ` · ${ex.sets} sets` : ''}
                        {ex.reps ? ` × ${ex.reps}` : ''}
                        {ex.notes ? ` — ${ex.notes}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tab === 'notes' && (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            className="w-full rounded-2xl border p-3"
            placeholder="Trainer notes, injuries, preferences…"
          />
          <div className="flex justify-end">
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-4 py-2 rounded-xl bg-black text-white"
            >
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
