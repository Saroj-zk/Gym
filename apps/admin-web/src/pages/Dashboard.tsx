import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import KpiCard from '../components/KpiCard';

type SignupUser = {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
};
type NewSignupsRes = { days: number; count: number; users: SignupUser[] };

type RenewalItem = {
  _id: string;
  endDate?: string;
  status?: string;
  user?: { _id: string; userId: string; firstName?: string; lastName?: string } | null;
  pack?: { name?: string } | null;
};
type RenewalsRes = { days: number; count: number; items: RenewalItem[] };

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);

  // NEW
  const [signups, setSignups] = useState<NewSignupsRes | null>(null);
  const [renewals, setRenewals] = useState<RenewalsRes | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setErr('');

        const [rev, peaks, su, rn] = await Promise.all([
          axios.get('/api/reports/revenue/summary', { params: { days: 7 } }),
          axios.get('/api/reports/attendance/peaks'),
          axios.get('/api/reports/new-signups', { params: { days: 7, limit: 5 } }),
          axios.get('/api/reports/upcoming-renewals', { params: { days: 7, limit: 8 } }),
        ]);

        setKpis({ rev: rev.data, peaks: peaks.data });
        setSignups(su.data);
        setRenewals(rn.data);
      } catch (e: any) {
        console.error(e);
        setErr(e?.response?.data?.error || e.message || 'Failed to load dashboard');
      }
    }
    load();
  }, []);

  const revenue7d =
    kpis?.rev?.series?.reduce((a: number, b: any) => a + (Number(b?.value) || 0), 0) ?? 0;

  const peakHour =
    kpis?.peaks?.byHour?.sort((a: any, b: any) => (b?.count || 0) - (a?.count || 0))[0]?.hour ??
    '-';

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {err && <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Revenue (7d)" value={revenue7d} />
        <KpiCard label="Peak Hour" value={peakHour} sub="by check-ins" />

        {/* NEW SIGNUPS */}
        <KpiCard
          label="New Signups"
          value={signups?.count ?? 0}
          sub={`last ${signups?.days ?? 7}d`}
        />

        {/* UPCOMING RENEWALS */}
        <KpiCard
          label="Upcoming Renewals"
          value={renewals?.count ?? 0}
          sub={`next ${renewals?.days ?? 7}d`}
        />
      </div>

      {/* Compact lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent signups list */}
        <div className="rounded-2xl bg-white shadow p-4">
          <div className="font-medium mb-2">Recent Signups (last {signups?.days ?? 7} days)</div>
          {signups?.users?.length ? (
            <ul className="space-y-2 text-sm">
              {signups.users.map((u) => {
                const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId;
                return (
                  <li key={u._id} className="flex justify-between">
                    <Link to={`/users/${u._id}`} className="text-blue-600 hover:underline">
                      {name}
                    </Link>
                    <span className="text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-gray-500">No signups found.</div>
          )}
        </div>

        {/* Upcoming renewals list */}
        <div className="rounded-2xl bg-white shadow p-4">
          <div className="font-medium mb-2">
            Renewals Due (next {renewals?.days ?? 7} days)
          </div>
          {renewals?.items?.length ? (
            <ul className="space-y-2 text-sm">
              {renewals.items.map((m) => {
                const u = m.user;
                const nm = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId : '—';
                return (
                  <li key={m._id} className="flex justify-between">
                    {u ? (
                      <Link to={`/users/${u._id}`} className="text-blue-600 hover:underline">
                        {nm}
                        {m.pack?.name ? ` · ${m.pack.name}` : ''}
                      </Link>
                    ) : (
                      <span>{m.pack?.name || '—'}</span>
                    )}
                    <span className="text-gray-500">
                      {m.endDate ? new Date(m.endDate).toLocaleDateString() : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-gray-500">No renewals in that window.</div>
          )}
        </div>
      </div>
    </div>
  );
}
