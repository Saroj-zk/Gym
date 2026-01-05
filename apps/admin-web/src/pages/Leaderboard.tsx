import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Calendar, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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

  function getRankIcon(rank: number) {
    if (rank === 0) return <Trophy size={18} className="text-yellow-500 fill-yellow-500" />; // Gold
    if (rank === 1) return <Medal size={18} className="text-slate-400 fill-slate-300" />; // Silver
    if (rank === 2) return <Medal size={18} className="text-orange-600 fill-orange-400" />; // Bronze
    return <span className="text-sm font-semibold text-slate-500">#{rank + 1}</span>;
  }

  function getRowBg(rank: number) {
    if (rank === 0) return 'bg-yellow-50/50 hover:bg-yellow-50';
    if (rank === 1) return 'bg-slate-50/50 hover:bg-slate-50';
    if (rank === 2) return 'bg-orange-50/50 hover:bg-orange-50';
    return 'hover:bg-slate-50/50';
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leaderboard</h1>
          <p className="text-slate-500 mt-1">Top performing members based on attendance.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <div className="pl-3 pr-2 py-1.5 flex items-center gap-2 text-slate-500 border-r border-slate-100">
            <Calendar size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Time Range</span>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value || 30)))}
            className="px-2 py-1.5 text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer hover:text-brand-600 transition-colors"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 3 Months</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Award size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No data found</h3>
          <p className="text-slate-500 mt-1">No check-ins found for the selected time range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 3 Podium Cards (Desktop) */}
          {rows.slice(0, 3).length > 0 && (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* 2nd Place */}
              {rows[1] && (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-end md:order-1 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-slate-300"></div>
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 border-2 border-slate-200 text-slate-400">
                    <UserIcon size={32} />
                  </div>
                  <div className="text-2xl font-bold text-slate-700 mb-1">2nd</div>
                  <div className="font-semibold text-slate-900 text-center mb-1 line-clamp-1 w-full">{[rows[1].user?.firstName, rows[1].user?.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
                  <div className="text-sm text-slate-500 mb-3">{rows[1].user?.userId || '—'}</div>
                  <div className="bg-slate-50 px-4 py-1.5 rounded-full text-sm font-bold text-slate-600">
                    {rows[1].points} pts
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {rows[0] && (
                <div className="bg-white rounded-2xl p-6 border border-yellow-100 shadow-lg shadow-yellow-500/10 flex flex-col items-center justify-end md:order-2 relative overflow-hidden transform md:-translate-y-4 z-10">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-yellow-400"></div>
                  <div className="absolute top-0 right-0 p-3 opacity-10 text-yellow-500">
                    <Trophy size={64} />
                  </div>
                  <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center mb-3 border-4 border-yellow-100 text-yellow-600">
                    <Trophy size={36} className="fill-yellow-600" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">1st</div>
                  <div className="text-lg font-bold text-slate-900 text-center mb-1 line-clamp-1 w-full">{[rows[0].user?.firstName, rows[0].user?.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
                  <div className="text-sm text-slate-500 mb-4">{rows[0].user?.userId || '—'}</div>
                  <div className="bg-yellow-100 px-6 py-2 rounded-full text-base font-bold text-yellow-800 border border-yellow-200">
                    {rows[0].points} pts
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {rows[2] && (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-end md:order-3 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-orange-400"></div>
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-3 border-2 border-orange-200 text-orange-500">
                    <UserIcon size={32} />
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">3rd</div>
                  <div className="font-semibold text-slate-900 text-center mb-1 line-clamp-1 w-full">{[rows[2].user?.firstName, rows[2].user?.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
                  <div className="text-sm text-slate-500 mb-3">{rows[2].user?.userId || '—'}</div>
                  <div className="bg-orange-50 px-4 py-1.5 rounded-full text-sm font-bold text-orange-700">
                    {rows[2].points} pts
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 font-semibold text-slate-700">Detailed Rankings</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                    <th className="px-6 py-4 font-semibold">Member</th>
                    <th className="px-6 py-4 font-semibold">User ID</th>
                    <th className="px-6 py-4 font-semibold text-center">Points</th>
                    <th className="px-6 py-4 font-semibold text-center">Check-ins</th>
                    <th className="px-6 py-4 font-semibold text-center">Kiosk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => {
                    const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || '—';
                    return (
                      <tr key={r.user?._id || i} className={clsx("transition-colors", getRowBg(i))}>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center">
                            {getRankIcon(i)}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
                        <td className="px-6 py-4 text-slate-500">{r.user?.userId || '—'}</td>
                        <td className="px-6 py-4 text-center font-bold text-brand-600">{r.points}</td>
                        <td className="px-6 py-4 text-center">{r.checkins}</td>
                        <td className="px-6 py-4 text-center text-slate-500">{r.kioskCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
