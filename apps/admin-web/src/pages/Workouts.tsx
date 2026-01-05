import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Calendar, Copy, Plus, Trash2, Save, Search, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

type Exercise = { name: string; sets?: number; reps?: string; notes?: string };
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Days = Record<DayKey, Exercise[]>;
type User = { _id: string; userId: string; firstName?: string; lastName?: string; email?: string; mobile?: string };

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
  const diff = (day + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}
function isoDate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function mondayOf(dateLike: string) {
  return startOfWeek(new Date(dateLike + 'T00:00:00'));
}

const emptyPlan: Days = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

export default function Workouts() {
  const [pickedUser, setPickedUser] = useState<User | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userOptions, setUserOptions] = useState<User[]>([]);

  const [week, setWeek] = useState<Date>(startOfWeek());
  const [days, setDays] = useState<Days>({ ...emptyPlan });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Copy-week UI
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyDate, setCopyDate] = useState<string>(() => {
    const d = new Date(week);
    d.setDate(d.getDate() + 7);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const weekStr = useMemo(() => week.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), [week]);

  useEffect(() => {
    if (pickedUser) loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedUser, week]);

  async function searchUsers(q: string) {
    setUserQuery(q);
    if (q.trim().length < 2) {
      setUserOptions([]);
      return;
    }
    try {
      const res = await api.get('/users', { params: { q } });
      setUserOptions(res.data || []);
    } catch { }
  }
  function selectUser(u: User) {
    setPickedUser(u);
    setUserOptions([]);
    setUserQuery('');
  }
  function clearUser() {
    setPickedUser(null);
    setUserQuery('');
    setDays({ ...emptyPlan });
  }

  async function loadPlan() {
    if (!pickedUser) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/workouts/week', {
        params: { userId: pickedUser._id, weekStart: week.toISOString() },
      });
      const got = res.data?.days || {};
      setDays({ ...emptyPlan, ...got });
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }

  function setDay(d: DayKey, updater: (arr: Exercise[]) => Exercise[]) {
    setDays((prev) => ({ ...prev, [d]: updater(prev[d] || []) }));
  }
  function addRow(d: DayKey) {
    setDay(d, (arr) => [...arr, { name: '', sets: undefined, reps: '', notes: '' }]);
  }
  function removeRow(d: DayKey, i: number) {
    setDay(d, (arr) => arr.filter((_, idx) => idx !== i));
  }
  function updateRow(d: DayKey, i: number, key: keyof Exercise, val: any) {
    setDay(d, (arr) =>
      arr.map((ex, idx) =>
        idx === i ? { ...ex, [key]: key === 'sets' ? (Number(val) || undefined) : val } : ex
      )
    );
  }
  function clearDay(d: DayKey) {
    setDay(d, () => []);
  }
  function copyDay(from: DayKey, to: DayKey[] | DayKey) {
    const targets = Array.isArray(to) ? to : [to];
    setDays((prev) => {
      const next = { ...prev };
      for (const t of targets) next[t] = JSON.parse(JSON.stringify(prev[from] || []));
      return next;
    });
    setNote(`Copied ${dayLabels[from]} → ${Array.isArray(to) ? 'selected days' : dayLabels[to]}`);
    setTimeout(() => setNote(''), 3000);
  }

  function prevWeek() {
    const d = new Date(week);
    d.setDate(d.getDate() - 7);
    setWeek(startOfWeek(d));
  }
  function nextWeek() {
    const d = new Date(week);
    d.setDate(d.getDate() + 7);
    setWeek(startOfWeek(d));
  }
  function todayWeek() {
    setWeek(startOfWeek(new Date()));
  }

  async function save() {
    if (!pickedUser) {
      setError('Please select a member first');
      return;
    }
    setSaving(true);
    setError('');
    setNote('');
    try {
      await api.post('/workouts/assign', { userId: pickedUser._id, weekStart: isoDate(week), days });
      setNote('Plan saved successfully');
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to save plan');
    } finally {
      setSaving(false);
      setTimeout(() => setNote(''), 3000);
    }
  }

  async function copyToWeek(destMonday: Date) {
    if (!pickedUser) {
      setError('Please select a member first');
      return;
    }
    const hasAny = Object.values(days).some((list) => (list?.length || 0) > 0);
    if (!hasAny) {
      setError('Nothing to copy — this week has no exercises');
      return;
    }
    setSaving(true);
    setError('');
    setNote('');
    try {
      await api.post('/workouts/assign', { userId: pickedUser._id, weekStart: isoDate(destMonday), days });
      setWeek(destMonday); // switch view to the destination week
      setNote('Copied plan to new week');
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to copy');
    } finally {
      setSaving(false);
      setTimeout(() => setNote(''), 3000);
    }
  }

  const templates: Record<string, Partial<Days>> = {
    'Push/Pull/Legs (3d)': {
      mon: [
        { name: 'Bench Press', sets: 4, reps: '6–8' },
        { name: 'Overhead Press', sets: 3, reps: '8–10' },
      ],
      wed: [
        { name: 'Barbell Row', sets: 4, reps: '6–8' },
        { name: 'Lat Pulldown', sets: 3, reps: '10–12' },
      ],
      fri: [
        { name: 'Back Squat', sets: 5, reps: '5' },
        { name: 'Leg Curl', sets: 3, reps: '10–12' },
      ],
    },
    'Full Body (5x5)': {
      mon: [
        { name: 'Squat', sets: 5, reps: '5' },
        { name: 'Bench Press', sets: 5, reps: '5' },
        { name: 'Barbell Row', sets: 5, reps: '5' },
      ],
      wed: [
        { name: 'Squat', sets: 5, reps: '5' },
        { name: 'Overhead Press', sets: 5, reps: '5' },
        { name: 'Deadlift', sets: 1, reps: '5' },
      ],
      fri: [
        { name: 'Squat', sets: 5, reps: '5' },
        { name: 'Bench Press', sets: 5, reps: '5' },
        { name: 'Barbell Row', sets: 5, reps: '5' },
      ],
    },
  };
  function applyTemplate(key: string) {
    const tpl = templates[key];
    if (!tpl) return;
    setDays((prev) => ({ ...prev, ...tpl } as Days));
  }

  const weekInputValue = new Date(week.getTime() - week.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Workouts</h1>
          <p className="text-slate-500 mt-1">Design training plans for members.</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
          <button onClick={prevWeek} className="p-2 hover:bg-slate-50 rounded-md text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={todayWeek} className="px-3 text-sm font-medium text-slate-700 hover:text-brand-600 transition-colors">
            This Week
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <button onClick={nextWeek} className="p-2 hover:bg-slate-50 rounded-md text-slate-600 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Member</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={
                pickedUser
                  ? `${pickedUser.firstName || ''} ${pickedUser.lastName || ''} (${pickedUser.userId})`
                  : userQuery
              }
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search member by name..."
              className="w-full pl-9 pr-8 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              disabled={!!pickedUser}
            />
            {pickedUser && (
              <button
                type="button"
                onClick={clearUser}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            )}

            {userOptions.length > 0 && !pickedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {userOptions.slice(0, 10).map((u) => (
                  <div
                    key={u._id}
                    onClick={() => selectUser(u)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
                  >
                    <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-500">ID: {u.userId} {u.mobile ? `• ${u.mobile}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Week of (Monday)</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              value={weekInputValue}
              onChange={(e) => {
                setWeek(mondayOf(e.target.value));
              }}
              className="w-full pl-9 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            />
          </div>
          <div className="text-xs text-slate-400 mt-1 text-right">Week starts: <span className="font-medium text-slate-600">{weekStr}</span></div>
        </div>
      </div>

      {pickedUser ? (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Quick Templates:</span>
              {Object.keys(templates).map((k) => (
                <button
                  key={k}
                  onClick={() => applyTemplate(k)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors bg-white"
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {note && <span className="text-sm text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-lg animate-in fade-in">{note}</span>}
              {error && <span className="text-sm text-red-600 font-medium px-2 py-1 bg-red-50 rounded-lg animate-in fade-in">{error}</span>}

              <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

              <button
                onClick={() => setCopyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white"
              >
                <Copy size={16} />
                Copy Week
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-70"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(Object.keys(dayLabels) as DayKey[]).map((d) => {
                const sourceHas = (days[d]?.length || 0) > 0;
                return (
                  <div key={d} className="rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col overflow-hidden group/card hover:shadow-md transition-shadow">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <div className="font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand-500 rounded-full"></span>
                        {dayLabels[d]}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">

                        <div className="relative group/copy">
                          <button
                            disabled={!sourceHas}
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-30"
                            title="Copy day"
                          >
                            <Copy size={14} />
                          </button>

                          {sourceHas && (
                            <div className="absolute right-0 mt-2 z-50 w-48 bg-white border border-slate-100 shadow-xl rounded-xl hidden group-hover/copy:block p-1 animate-in zoom-in-95 duration-200 origin-top-right">
                              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">Copy to...</div>
                              {(Object.keys(dayLabels) as DayKey[])
                                .filter((x) => x !== d)
                                .map((t) => (
                                  <button
                                    key={t}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      copyDay(d, t);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                  >
                                    {dayLabels[t]}
                                  </button>
                                ))}
                              <div className="my-1 border-t border-slate-50"></div>
                              <button
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  copyDay(d, (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].filter((x) => x !== d) as DayKey[]));
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              >
                                All Other Days
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => clearDay(d)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Clear day"
                        >
                          <Trash2 size={14} />
                        </button>

                        <button
                          onClick={() => addRow(d)}
                          className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-md hover:border-brand-300 hover:text-brand-600 transition-colors shadow-sm ml-2"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      {/* Mobile visible add button only if desktop hover is hidden */}
                      <button
                        onClick={() => addRow(d)}
                        className="lg:hidden p-1.5 bg-slate-100 text-slate-600 rounded-md"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="p-4 flex-1 min-h-[120px]">
                      {(days[d] || []).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-xl">
                          <Dumbbell size={24} className="mb-2 opacity-50" />
                          <span className="text-xs">Rest Day</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {days[d].map((ex, i) => (
                            <div key={i} className="group/row relative bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-50 transition-colors">
                              <div className="grid grid-cols-12 gap-2 mb-2">
                                <div className="col-span-8">
                                  <input
                                    value={ex.name}
                                    onChange={(e) => updateRow(d, i, 'name', e.target.value)}
                                    placeholder="Exercise Name"
                                    className="w-full bg-transparent font-medium text-slate-900 border-none p-0 placeholder:text-slate-400 focus:ring-0 text-sm"
                                  />
                                </div>
                                <div className="col-span-4 flex justify-end">
                                  <button
                                    onClick={() => removeRow(d, i)}
                                    className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                    tabIndex={-1}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div className='bg-white rounded-lg px-2 py-1.5 border border-slate-200 flex items-center gap-2 shadow-sm'>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sets</span>
                                  <input
                                    type="number"
                                    value={ex.sets ?? ''}
                                    onChange={(e) => updateRow(d, i, 'sets', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-xs font-semibold text-slate-700 focus:ring-0 text-right"
                                    placeholder="-"
                                  />
                                </div>
                                <div className='bg-white rounded-lg px-2 py-1.5 border border-slate-200 flex items-center gap-2 shadow-sm'>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reps</span>
                                  <input
                                    value={ex.reps || ''}
                                    onChange={(e) => updateRow(d, i, 'reps', e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-xs font-semibold text-slate-700 focus:ring-0 text-right"
                                    placeholder="-"
                                  />
                                </div>
                              </div>

                              <div>
                                <input
                                  value={ex.notes || ''}
                                  onChange={(e) => updateRow(d, i, 'notes', e.target.value)}
                                  placeholder="Add notes..."
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-300 p-0 text-[11px] text-slate-500 focus:ring-0 transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Search size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a Member</h3>
          <p className="text-slate-500 max-w-sm">
            Search and select a member above to view and edit their weekly workout plan.
          </p>
        </div>
      )}

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Copy Current Week To...</h2>
              <button onClick={() => setCopyOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination Week (Select any day)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={copyDate}
                    onChange={(e) => setCopyDate(e.target.value)}
                    className="w-full pl-9 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
                  Warning: This will overwrite any existing workout plan for the selected destination week.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCopyOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 text-slate-700">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCopyOpen(false);
                    const dest = mondayOf(copyDate);
                    copyToWeek(dest);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                >
                  Copy Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
