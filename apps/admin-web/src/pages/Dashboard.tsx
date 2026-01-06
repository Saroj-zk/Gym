import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, Calendar, AlertCircle,
  ArrowRight, Clock, DollarSign
} from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

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
  const [signups, setSignups] = useState<NewSignupsRes | null>(null);
  const [renewals, setRenewals] = useState<RenewalsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setErr('');
        // Parallel data fetching
        const [rev, peaks, su, rn] = await Promise.all([
          api.get('/reports/revenue/summary', { params: { days: 7 } }),
          api.get('/reports/attendance/peaks'),
          api.get('/reports/new-signups', { params: { days: 7, limit: 5 } }),
          api.get('/reports/upcoming-renewals', { params: { days: 7, limit: 8 } }),
        ]);

        setKpis({ rev: rev.data, peaks: peaks.data });
        setSignups(su.data);
        setRenewals(rn.data);
      } catch (e: any) {
        console.error(e);
        setErr('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const revenue7d = kpis?.rev?.series?.reduce((a: number, b: any) => a + (Number(b?.value) || 0), 0) ?? 0;

  const peakHour = kpis?.peaks?.byHour?.sort((a: any, b: any) => (b?.count || 0) - (a?.count || 0))[0]?.hour ?? '-';

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, here's what's happening at your gym today.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Export Report
          </button>
          <Link to="/users?new=true" className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all hover:scale-105 active:scale-95">
            + New Member
          </Link>
        </div>
      </div>

      {err && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-3">
          <AlertCircle size={20} />
          {err}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Revenue (7d)"
          value={`$${revenue7d.toLocaleString()}`}
          icon={DollarSign}
          trend="+12% vs last week"
          trendUp={true}
          color="blue"
        />
        <StatCard
          label="Peak Hour"
          value={`${peakHour}:00`}
          sub="Based on check-ins"
          icon={Clock}
          color="purple"
        />
        <StatCard
          label="New Signups"
          value={signups?.count ?? 0}
          sub={`Last ${signups?.days ?? 7} days`}
          icon={Users}
          color="green"
        />
        <StatCard
          label="Renewals Due"
          value={renewals?.count ?? 0}
          sub={`Next ${renewals?.days ?? 7} days`}
          icon={Calendar}
          color="orange"
          alert={renewals && renewals.count > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Signups */}
        <Card title="Recent Signups" action={<Link to="/users" className="text-xs font-semibold text-brand-600 hover:text-brand-700">View All</Link>}>
          {signups?.users?.length ? (
            <div className="divide-y divide-slate-100">
              {signups.users.map((u) => (
                <div key={u._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                      {(u.firstName?.[0] || u.userId?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/users/${u._id}`} className="font-medium text-slate-900 hover:text-brand-600 transition-colors">
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId}
                      </Link>
                      <p className="text-xs text-slate-500">Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                  <Link to={`/users/${u._id}`} className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No recent signups found." />
          )}
        </Card>

        {/* Upcoming Renewals */}
        <Card title="Upcoming Renewals" action={<Link to="/reports/renewals" className="text-xs font-semibold text-brand-600 hover:text-brand-700">View All</Link>}>
          {renewals?.items?.length ? (
            <div className="divide-y divide-slate-100">
              {renewals.items.map((m) => {
                const u = m.user;
                const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userId : 'Unknown User';
                const daysLeft = m.endDate ? Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

                return (
                  <div key={m._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        daysLeft <= 3 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                      )}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        {u ? (
                          <Link to={`/users/${u._id}`} className="font-medium text-slate-900 hover:text-brand-600 transition-colors">
                            {name}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">{m.pack?.name || 'Unknown Pack'}</span>
                        )}
                        <p className="text-xs text-slate-500">
                          {m.pack?.name} • Expires {m.endDate ? new Date(m.endDate).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        daysLeft <= 3 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {daysLeft} days left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No upcoming renewals." />
          )}
        </Card>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function StatCard({ label, value, sub, icon: Icon, trend, trendUp, color = 'brand', alert }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-amber-50 text-amber-600",
  };

  return (
    <div className={clsx("p-6 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md", alert && "ring-1 ring-red-200")}>
      <div className="flex items-center justify-between mb-4">
        <div className={clsx("p-3 rounded-xl", colors[color] || colors.blue)}>
          <Icon size={22} className="stroke-[2.5]" />
        </div>
        {trend && (
          <div className={clsx("flex items-center text-xs font-semibold", trendUp ? "text-emerald-600" : "text-red-600")}>
            {trendUp ? <TrendingUp size={14} className="mr-1" /> : <TrendingUp size={14} className="mr-1 rotate-180" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function Card({ children, title, action }: { children: React.ReactNode, title: string, action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-lg text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <Clock size={20} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
