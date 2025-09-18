import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

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
  const weekStr = useMemo(() => week.toLocaleDateString(), [week]);

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
    } catch {}
  }
  function selectUser(u: User) {
    setPickedUser(u);
    setUserOptions([]);
  }
  function clearUser() {
    setPickedUser(null);
    setUserQuery('');
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
    setTimeout(() => setNote(''), 1500);
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
      setError('Pick a user');
      return;
    }
    setSaving(true);
    setError('');
    setNote('');
    try {
      await api.post('/workouts/assign', { userId: pickedUser._id, weekStart: isoDate(week), days });
      setNote('Saved ✓');
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to save plan');
    } finally {
      setSaving(false);
      setTimeout(() => setNote(''), 1500);
    }
  }

  async function copyToWeek(destMonday: Date) {
    if (!pickedUser) {
      setError('Pick a user');
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
      setNote('Copied to next week ✓');
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to copy');
    } finally {
      setSaving(false);
      setTimeout(() => setNote(''), 1500);
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
    'Full Body (3d)': {
      mon: [
        { name: 'Squat', sets: 3, reps: '5' },
        { name: 'Bench', sets: 3, reps: '5' },
        { name: 'Row', sets: 3, reps: '8' },
      ],
      wed: [
        { name: 'Deadlift', sets: 1, reps: '5' },
        { name: 'OHP', sets: 3, reps: '5' },
        { name: 'Chin-ups', sets: 3, reps: 'AMRAP' },
      ],
      fri: [
        { name: 'Front Squat', sets: 3, reps: '5' },
        { name: 'Incline DB Press', sets: 3, reps: '8–10' },
        { name: 'Cable Row', sets: 3, reps: '10–12' },
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <div className="flex gap-2">
          <button onClick={prevWeek} className="px-3 py-2 rounded-xl border">
            ◀ Prev
          </button>
          <button onClick={todayWeek} className="px-3 py-2 rounded-xl border">
            This Week
          </button>
          <button onClick={nextWeek} className="px-3 py-2 rounded-xl border">
            Next ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Member</label>
          <div className="relative">
            <input
              value={
                pickedUser
                  ? `${pickedUser.firstName || ''} ${pickedUser.lastName || ''} (${pickedUser.userId})`
                  : userQuery
              }
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search name, email, mobile…"
              className="w-full rounded-xl border px-3 py-2"
            />
            {userOptions.length > 0 && !pickedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow max-h-64 overflow-auto">
                {userOptions.slice(0, 10).map((u) => (
                  <div
                    key={u._id}
                    onClick={() => selectUser(u)}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    {u.firstName} {u.lastName} — {u.userId} {u.mobile ? `· ${u.mobile}` : ''}
                  </div>
                ))}
              </div>
            )}
            {pickedUser && (
              <button
                type="button"
                onClick={clearUser}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Week (Monday)</label>
          <input
            type="date"
            value={weekInputValue}
            onChange={(e) => {
              setWeek(mondayOf(e.target.value));
            }}
            className="w-full rounded-xl border px-3 py-2"
          />
          <div className="text-xs text-gray-500 mt-1">Showing week starting {weekStr}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm text-gray-600">Templates:</label>
        {Object.keys(templates).map((k) => (
          <button key={k} onClick={() => applyTemplate(k)} className="px-3 py-1 rounded-xl border text-sm">
            {k}
          </button>
        ))}
        <span className="text-xs text-gray-400">Click a template to prefill; edit freely.</span>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading ? <div className="text-gray-500">Loading plan…</div> : null}

      {/* Editor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(Object.keys(dayLabels) as DayKey[]).map((d) => {
          const sourceHas = (days[d]?.length || 0) > 0;
          return (
            <div key={d} className="rounded-2xl bg-white shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">{dayLabels[d]}</div>
                <div className="flex gap-2">
                  <button onClick={() => addRow(d)} className="text-sm px-2 py-1 rounded-lg border">
                    + Add
                  </button>
                  <button onClick={() => clearDay(d)} className="text-sm px-2 py-1 rounded-lg border">
                    Clear
                  </button>
                  <div
                    className={`relative z-10 group ${sourceHas ? '' : 'opacity-50 cursor-not-allowed'}`}
                    title={sourceHas ? '' : 'Nothing to copy'}
                  >
                    <button disabled={!sourceHas} className="text-sm px-2 py-1 rounded-lg border">
                      Copy →
                    </button>

                    {sourceHas && (
                      <div className="absolute right-0 mt-1 z-50 min-w-40 bg-white border shadow rounded-xl hidden group-hover:block">
                        <div className="px-3 py-2 text-xs text-gray-500">Copy {dayLabels[d]} to →</div>

                        {(Object.keys(dayLabels) as DayKey[])
                          .filter((x) => x !== d)
                          .map((t) => (
                            <button
                              key={t}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                copyDay(d, t);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {dayLabels[t]}
                            </button>
                          ))}

                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            copyDay(d, (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].filter((x) => x !== d) as DayKey[]));
                          }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          All days
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(days[d] || []).length === 0 ? (
                <div className="text-xs text-gray-500">No exercises</div>
              ) : (
                <div className="space-y-2">
                  {days[d].map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={ex.name}
                        onChange={(e) => updateRow(d, i, 'name', e.target.value)}
                        placeholder="Exercise"
                        className="col-span-5 rounded-xl border px-2 py-1"
                      />
                      <input
                        type="number"
                        value={ex.sets ?? ''}
                        onChange={(e) => updateRow(d, i, 'sets', e.target.value)}
                        placeholder="Sets"
                        className="col-span-2 rounded-xl border px-2 py-1"
                      />
                      <input
                        value={ex.reps || ''}
                        onChange={(e) => updateRow(d, i, 'reps', e.target.value)}
                        placeholder="Reps"
                        className="col-span-3 rounded-xl border px-2 py-1"
                      />
                      <button onClick={() => removeRow(d, i)} className="col-span-2 text-red-600 text-sm">
                        Remove
                      </button>
                      <div className="col-span-12">
                        <input
                          value={ex.notes || ''}
                          onChange={(e) => updateRow(d, i, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full rounded-xl border px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {note && <div className="text-sm text-green-700">{note}</div>}
        <button
          onClick={() => {
            const d = new Date(week);
            d.setDate(d.getDate() + 7);
            copyToWeek(startOfWeek(d));
          }}
          disabled={!pickedUser}
          className="px-3 py-2 rounded-xl border"
          title={!pickedUser ? 'Pick a member first' : ''}
        >
          Copy → Next Week
        </button>
        <button
          onClick={() => setCopyOpen(true)}
          disabled={!pickedUser}
          className="px-3 py-2 rounded-xl border"
          title={!pickedUser ? 'Pick a member first' : ''}
        >
          Copy to…
        </button>
        <button onClick={save} disabled={!pickedUser || saving} className="px-4 py-2 rounded-xl bg-black text-white">
          {saving ? 'Saving…' : 'Save Plan'}
        </button>
      </div>

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Copy week to…</h2>
              <button onClick={() => setCopyOpen(false)} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Destination week (any date in that week)</label>
                <input
                  type="date"
                  value={copyDate}
                  onChange={(e) => setCopyDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">We’ll copy to that week’s Monday. Existing plan will be overwritten.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCopyOpen(false)} className="px-3 py-2 rounded-xl border">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCopyOpen(false);
                    const dest = mondayOf(copyDate);
                    copyToWeek(dest);
                  }}
                  className="px-4 py-2 rounded-xl bg-black text-white"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
