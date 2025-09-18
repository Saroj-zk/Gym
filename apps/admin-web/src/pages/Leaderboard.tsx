import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

type LBRow = {
  user?: { _id: string; userId: string; firstName?: string; lastName?: string };
  points: number;
  checkins: number;
  kioskCount: number;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LBRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await api.get('/reports/leaderboard', { params: { days, limit: 10 } });
        setRows(data?.items || []);
      } catch (e: any) {
        const msg =
          e?.response?.data?.error ??
          (typeof e?.response?.data === 'string' ? e.response.data : '') ??
          e?.message ??
          'Failed to load leaderboard';
        setError(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Days</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value || 30)))}
            className="w-20 rounded-xl border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No check-ins yet for the selected range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Check-ins</th>
                <th className="px-4 py-3 font-medium">Kiosk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || '—';
                return (
                  <tr key={r.user?._id || i} className="border-t">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3">{r.user?.userId || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{r.points}</td>
                    <td className="px-4 py-3">{r.checkins}</td>
                    <td className="px-4 py-3">{r.kioskCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
