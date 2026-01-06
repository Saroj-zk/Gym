import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MemberLayout } from '../components/MemberLayout';
import {
  Calendar, ChevronLeft, ChevronRight, ShoppingCart,
  CheckCircle2, Package, Tag, CreditCard, Dumbbell,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { LeaderboardTab } from '../components/LeaderboardTab';
import { DietTab } from '../components/DietTab';
import { AppointmentsTab } from '../components/AppointmentsTab';


type User = {
  _id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
};

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Exercise = { name: string; sets?: number; reps?: string; notes?: string };
type Days = Record<DayKey, Exercise[]>;

type Supplement = {
  _id: string;
  name: string;
  imageUrl?: string;
  sellingPrice?: number;
  stockQty?: number;
  unit?: string;
  isActive?: boolean;
};

type Payment = {
  _id: string;
  amount: number;
  method?: 'cash' | 'card' | 'upi' | 'bank';
  description?: string;
  createdAt?: string;
};

const dayLabels: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function isoDateAt00Z(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function MemberHome() {
  const { id } = useParams();
  const [tab, setTab] = useState<'workouts' | 'shop' | 'orders' | 'leaderboard' | 'diet' | 'appointments'>('leaderboard');
  const [user, setUser] = useState<User | null>(null);

  const [week, setWeek] = useState<Date>(startOfWeek());
  const [plan, setPlan] = useState<Days | null>(null);

  const [items, setItems] = useState<Supplement[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'card' | 'bank'>('upi');

  const [orders, setOrders] = useState<Payment[]>([]);

  useEffect(() => { loadUser(); }, [id]);
  useEffect(() => { loadWorkouts(week); }, [id, week]);
  useEffect(() => {
    if (tab === 'shop') loadSupplements();
    if (tab === 'orders') loadOrders();
  }, [tab, id]);

  async function loadUser() {
    if (!id) return;
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
    } catch { /* ignore */ }
  }

  async function loadWorkouts(weekDate: Date) {
    if (!id) return;
    try {
      const res = await api.get('/workouts/week', {
        params: { userId: id, weekStart: isoDateAt00Z(weekDate) },
      });
      setPlan(res.data?.days || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    } catch {
      setPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }
  }

  async function loadSupplements() {
    try {
      const res = await api.get('/supplements', { params: { active: true, limit: 100 } });
      setItems(res.data || []);
    } catch { /* noop */ }
  }

  async function loadOrders() {
    if (!id) return;
    try {
      const res = await api.get('/payments', { params: { userId: id, limit: 20 } });
      setOrders(res.data || []);
    } catch { /* ignore */ }
  }

  const addToCart = (it: Supplement, qty: number) => {
    setCart(prev => {
      const current = prev[it._id] || 0;
      const next = Math.max(0, current + qty);
      if (next === 0) {
        const { [it._id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [it._id]: next };
    });
  };

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (cart[it._id] || 0) * (it.sellingPrice || 0), 0);
  }, [cart, items]);

  async function checkout() {
    if (!id || total <= 0) return;
    try {
      const itemsForMeta = Object.entries(cart).map(([supplementId, qty]) => {
        const it = items.find(i => i._id === supplementId);
        return it ? { supplementId, name: it.name, qty, price: it.sellingPrice } : null;
      }).filter(Boolean);

      await api.post('/payments/record', {
        userId: id,
        amount: total,
        method: payMethod,
        description: `Supplement Store Purchase`,
        meta: { items: itemsForMeta },
      });

      alert('Order placed successfully!');
      setCart({});
      setTab('orders');
    } catch (e: any) {
      alert(e.message || 'Checkout failed');
    }
  }

  return (
    <MemberLayout user={user} activeTab={tab} onTabChange={setTab}>
      <div className="animate-in fade-in duration-500">

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <LeaderboardTab />
        )}

        {/* Diet Tab */}
        {tab === 'diet' && (
          <DietTab userId={id || ''} />
        )}

        {/* Appointments Tab */}
        {tab === 'appointments' && (
          <AppointmentsTab userId={id || ''} />
        )}


        {/* Workouts Tab */}
        {tab === 'workouts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Training</h1>
                <p className="text-slate-500 text-sm">Your personalized workout schedule.</p>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button
                  onClick={() => { const d = new Date(week); d.setDate(d.getDate() - 7); setWeek(startOfWeek(d)); }}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="px-3 text-sm font-medium text-slate-700 min-w-[140px] text-center">
                  {week.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {(() => { const e = new Date(week); e.setDate(e.getDate() + 6); return e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); })()}
                </div>
                <button
                  onClick={() => { const d = new Date(week); d.setDate(d.getDate() + 7); setWeek(startOfWeek(d)); }}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((d) => {
                const dayExercises = plan?.[d] || [];
                const isRestDay = dayExercises.length === 0;

                return (
                  <div key={d} className={`bg-white rounded-xl border ${isRestDay ? 'border-dashed border-slate-200' : 'border-slate-200'} p-5 shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 uppercase text-sm tracking-wide">{dayLabels[d]}</h3>
                      {isRestDay ? (
                        <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Rest</span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> Assigned
                        </span>
                      )}
                    </div>

                    {isRestDay ? (
                      <div className="py-6 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-300 mb-2">
                          <Calendar size={18} />
                        </div>
                        <p className="text-xs text-slate-400">No exercises scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayExercises.map((ex, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100/50">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{ex.name}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {ex.sets && <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-medium">{ex.sets} sets</span>}
                                {ex.reps && <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-medium">{ex.reps} reps</span>}
                              </div>
                              {ex.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{ex.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {tab === 'shop' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supplements</h1>
                <p className="text-slate-500 text-sm">Premium products for your fitness.</p>
              </div>

              <div className="relative">
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                  <ShoppingCart size={18} />
                  <span>Cart</span>
                  {Object.keys(cart).length > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {Object.values(cart).reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((it) => (
                <div key={it._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                  <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={32} />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm border border-slate-100">
                      ₹{it.sellingPrice}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm truncate mb-1">{it.name}</h3>
                    <p className="text-xs text-slate-500 mb-4">{it.stockQty || 0} {it.unit || 'units'} available</p>

                    {cart[it._id] ? (
                      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button onClick={() => addToCart(it, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900">-</button>
                        <span className="font-semibold text-sm text-slate-900">{cart[it._id]}</span>
                        <button onClick={() => addToCart(it, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(it, 1)}
                        className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-slate-800 transition-colors"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Float Cart Summary */}
            {total > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</p>
                      <p className="text-xl font-bold">₹{total.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      {['upi', 'card'].map(m => (
                        <button
                          key={m}
                          onClick={() => setPayMethod(m as any)}
                          className={clsx(
                            "text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-colors",
                            payMethod === m ? "bg-white text-slate-900 border-white" : "text-slate-400 border-slate-700 hover:border-slate-500"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={checkout} className="w-full bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                    Checkout Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order History</h1>
              <p className="text-slate-500 text-sm">A list of your recent purchases.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {orders.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Tag size={20} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">No transaction history found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {orders.map(o => (
                    <div key={o._id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Payment - {o.method?.toUpperCase()}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{o.description}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">ID: {o._id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">₹{o.amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'Unknown Date'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </MemberLayout>
  );
}
