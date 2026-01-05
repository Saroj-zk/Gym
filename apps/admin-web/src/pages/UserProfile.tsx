import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, CreditCard, Dumbbell, Clipboard, Save, Clock, ArrowLeft, History, UserCheck, FileText, ChevronLeft, ChevronRight, Mail, Phone, User, CheckCircle, Smartphone } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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
  const [tab, setTab] = useState<'memberships' | 'payments' | 'attendance' | 'workouts' | 'notes'>('memberships');
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

  // Stat counters
  const [stats, setStats] = useState({
    attendanceCount: 0,
    totalSpent: 0,
    activePlan: ''
  });

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

      // attendance (last 90 days for stats, but list covers 30 by default in other views, we'll fetch full for profile)
      const since = new Date();
      since.setDate(since.getDate() - 60);
      const ares = await api.get('/attendance', {
        params: { userId: id, from: since.toISOString().slice(0, 10) },
      });
      setAttendance(ares.data || []);

      // Calculate Stats
      const totalSpent = pp.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const activeM = mm.find(m => m.status === 'active');
      const activePlanName = activeM && typeof activeM.packId === 'object' ? (activeM.packId as any).name : 'No Active Plan';

      setStats({
        attendanceCount: ares.data?.length || 0,
        totalSpent,
        activePlan: activePlanName
      });

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link to="/users" className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="text-sm text-slate-500">Member Profile</div>
          <h1 className="text-2xl font-bold text-slate-900">{fullName || 'Loading...'}</h1>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => nav('/workouts')} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
            <Dumbbell size={16} />
            Manage Workouts
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar / Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4 text-3xl font-bold border-4 border-slate-50">
                {(user?.firstName?.[0] || user?.userId?.[0] || '?').toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm text-slate-500 mb-4">ID: {user?.userId}</p>
              <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                user?.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                  user?.status === 'inactive' ? "bg-slate-100 text-slate-600" :
                    "bg-amber-100 text-amber-700"
              )}>
                {user?.status || 'Unknown'}
              </span>

              <div className="w-full mt-6 pt-6 border-t border-slate-50 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span className="truncate">{user?.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{user?.mobile || 'No mobile'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span className="capitalize">{user?.gender || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs text-slate-500 uppercase font-semibold">Spent</div>
                <div className="text-lg font-bold text-slate-900">₹{stats.totalSpent.toLocaleString()}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs text-slate-500 uppercase font-semibold">Attendance</div>
                <div className="text-lg font-bold text-slate-900">{stats.attendanceCount} <span className="text-xs font-normal text-slate-400">days</span></div>
              </div>
              <div className="col-span-2 bg-brand-50 p-4 rounded-xl border border-brand-100">
                <div className="text-xs text-brand-600 uppercase font-semibold">Active Plan</div>
                <div className="text-base font-bold text-brand-900 mt-1">{stats.activePlan}</div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
              {[
                { id: 'memberships', label: 'Memberships', icon: CreditCard },
                { id: 'payments', label: 'Payments', icon: History },
                { id: 'attendance', label: 'Attendance', icon: Clock },
                { id: 'workouts', label: 'Workouts', icon: Dumbbell },
                { id: 'notes', label: 'Notes', icon: FileText },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    tab === t.id ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
              {tab === 'memberships' && (
                <div className="overflow-x-auto p-2">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left rounded-lg text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-l-lg">Plan Name</th>
                        <th className="px-4 py-3 font-semibold">Start Date</th>
                        <th className="px-4 py-3 font-semibold">End Date</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Payment</th>
                        <th className="px-4 py-3 font-semibold rounded-r-lg">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {memberships.map((m) => {
                        const packName =
                          typeof m.packId === 'object' ? (m.packId as any)?.name : m.packId || '—';
                        const end =
                          m.endDate
                            ? new Date(m.endDate).toLocaleDateString()
                            : (m as any)?.packId?.durationType === 'sessions'
                              ? 'Sessions-based'
                              : '—';
                        return (
                          <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">{packName || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {m.startDate ? new Date(m.startDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{end}</td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                m.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                                  m.status === 'expired' ? "bg-red-50 text-red-600" :
                                    "bg-slate-100 text-slate-600"
                              )}>
                                {m.status || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                m.paymentStatus === 'paid' ? "bg-emerald-100 text-emerald-700" :
                                  m.paymentStatus === 'pending' ? "bg-amber-100 text-amber-700" :
                                    "bg-slate-100 text-slate-600"
                              )}>
                                {m.paymentStatus || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {memberships.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            No membership history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'payments' && (
                <div className="overflow-x-auto p-2">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left rounded-lg text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-l-lg">Date</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Method</th>
                        <th className="px-4 py-3 font-semibold rounded-r-lg">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-600">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">₹{p.amount?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">
                              {p.method || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.description || '—'}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                            No payment history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'attendance' && (
                <div className="overflow-x-auto p-2">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left rounded-lg text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-l-lg">Date & Time</th>
                        <th className="px-4 py-3 font-semibold rounded-r-lg">Check-in Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendance.map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 font-medium">{new Date(a.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 capitalize bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">
                              {a.method === 'qr' && <Smartphone size={12} />}
                              {a.method === 'manual' && <UserCheck size={12} />}
                              {a.method || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-12 text-center text-slate-400">
                            No recent attendance records.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'workouts' && (
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <button onClick={prevWeek} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                        <ChevronLeft size={16} />
                      </button>
                      <input
                        type="date"
                        value={weekInputValue}
                        onChange={(e) => {
                          const w = startOfWeek(new Date(e.target.value + 'T00:00:00'));
                          setWeek(w);
                          loadPlan(w);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                      />
                      <button onClick={nextWeek} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                        <ChevronRight size={16} />
                      </button>
                      <button onClick={todayWeek} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-brand-600">
                        Today
                      </button>
                    </div>
                    <div className="text-sm text-slate-500">
                      Viewing plan for week of <span className="font-semibold text-slate-900">{week.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((d) => (
                      <div key={d} className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
                        <div className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <div className="w-1 h-4 bg-brand-400 rounded-full"></div>
                          {dayLabels[d]}
                        </div>
                        {(plan?.[d] || []).length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2">No exercises planned</div>
                        ) : (
                          <ul className="space-y-2">
                            {plan?.[d]?.map((ex, i) => (
                              <li key={i} className="text-sm bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                <div className="font-medium text-slate-900">{ex.name}</div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {ex.sets && <span className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">{ex.sets} sets</span>}
                                  {ex.reps && <span className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">{ex.reps} reps</span>}
                                </div>
                                {ex.notes && <div className="text-xs text-slate-500 mt-1 italic border-t border-slate-50 pt-1">{ex.notes}</div>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'notes' && (
                <div className="p-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Trainer Notes / Medical Info</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={12}
                    className="w-full rounded-xl border border-slate-200 p-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="Add notes about injuries, goals, or general observations..."
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-70"
                    >
                      <Save size={16} />
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
