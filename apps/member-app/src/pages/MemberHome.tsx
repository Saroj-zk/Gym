import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

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

// Line items sent to meta on checkout
type SaleItem = { supplementId: string; name: string; qty: number; price: number };

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
  const diff = (x.getDay() + 6) % 7; // Monday
  x.setDate(x.getDate() - diff);
  return x;
}

export default function MemberHome() {
  const { id } = useParams(); // Mongo _id of the user
  const nav = useNavigate();

  const [tab, setTab] = useState<'workouts' | 'shop' | 'orders'>('workouts');
  const [user, setUser] = useState<User | null>(null);

  // workouts
  const [week, setWeek] = useState<Date>(startOfWeek());
  const [plan, setPlan] = useState<Days | null>(null);

  // shop
  const [items, setItems] = useState<Supplement[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({}); // id -> qty
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'card' | 'bank'>('upi');

  // orders
  const [orders, setOrders] = useState<Payment[]>([]);

  const weekInputValue = new Date(week.getTime() - week.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  useEffect(() => {
    loadUser();
  }, [id]);

  useEffect(() => {
    loadWorkouts(week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // initial load for workouts when member changes

  useEffect(() => {
    if (tab === 'shop') loadSupplements();
    if (tab === 'orders') loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  async function loadUser() {
    if (!id) return;
    const res = await axios.get(`/api/users/${id}`);
    setUser(res.data);
  }

  async function loadWorkouts(weekDate: Date) {
    if (!id) return;
    try {
      const res = await axios.get('/api/workouts/week', {
        params: { userId: id, weekStart: new Date(weekDate).toISOString() },
      });
      const days: Days =
        res.data?.days || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      setPlan(days);
    } catch {
      setPlan({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }
  }

  async function loadSupplements() {
    try {
      const res = await axios.get('/api/supplements', { params: { active: true, limit: 200 } });
      setItems(res.data || []);
    } catch {
      /* noop */
    }
  }

  async function loadOrders() {
    if (!id) return;
    try {
      const res = await axios.get('/api/payments', { params: { userId: id, limit: 50 } });
      setOrders(res.data || []);
    } catch {
      /* ignore */
    }
  }

  function logout() {
    try {
      // Clear remembered member data
      localStorage.removeItem('memberUserCode');
      localStorage.removeItem('memberId');
      // Clear any member-* keys if you used them
      Object.keys(localStorage)
        .filter((k) => /^member/i.test(k))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    // Go back to the member app's check-in page
    nav('/', { replace: true });
  }

  function addToCart(it: Supplement, qty = 1) {
    setCart((c) => {
      const current = c[it._id] || 0;
      const next = Math.max(0, Math.min(it.stockQty ?? Infinity, current + qty));
      if (next === 0) {
        const { [it._id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [it._id]: next };
    });
  }

  function setQty(it: Supplement, q: number) {
    const qty = Math.max(0, Math.min(it.stockQty ?? Infinity, Math.floor(q)));
    setCart((c) =>
      qty === 0
        ? (() => {
            const { [it._id]: _, ...rest } = c;
            return rest;
          })()
        : { ...c, [it._id]: qty }
    );
  }

  function clearCart() {
    setCart({ });
  }

  const total = useMemo(() => {
    return items.reduce((sum, it) => {
      const qty = cart[it._id] || 0;
      const price = Number(it.sellingPrice || 0);
      return sum + qty * price;
    }, 0);
  }, [cart, items]);

  async function checkout() {
    if (!id) return;

    // Build line items from the cart (for meta.items)
    const itemsForMeta: SaleItem[] = Object.entries(cart)
      .map(([supplementId, qty]) => {
        const it = items.find((i) => i._id === supplementId);
        if (!it || qty <= 0) return null;
        return {
          supplementId: it._id,
          name: it.name,
          qty: Number(qty),
          price: Number(it.sellingPrice || 0),
        } as SaleItem;
      })
      .filter(Boolean) as SaleItem[];

    const descriptionParts = itemsForMeta.map((it) => `${it.name} x${it.qty}`);

    if (itemsForMeta.length === 0) return alert('Cart is empty.');

    try {
      // 1) create a Payment WITH line items in meta
      await axios.post('/api/payments', {
        userId: id,
        amount: total,
        method: payMethod, // 'upi' | 'cash' | 'card' | 'bank'
        description: `Supplement purchase: ${descriptionParts.join(', ')}`,
        meta: { items: itemsForMeta },
      });

      // 2) decrement stock for each item
      await Promise.all(
        itemsForMeta.map((it) =>
          axios.patch(`/api/supplements/${it.supplementId}/stock`, { delta: -it.qty })
        )
      );

      alert('Order placed. Thank you!');
      clearCart();
      await loadSupplements();
      setTab('orders');
      await loadOrders();
    } catch (e: any) {
      alert(e?.response?.data?.error || e.message || 'Checkout failed');
    }
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Member</div>
          <h1 className="text-xl font-semibold">
            {fullName || 'Member'}{' '}
            <span className="text-gray-400 font-normal">({user?.userId})</span>
          </h1>
        </div>

        <button onClick={logout} className="px-3 py-2 rounded-xl border text-sm">
          Log out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['workouts', 'shop', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-xl border text-sm ${
              tab === t ? 'bg-black text-white' : 'bg-white'
            }`}
          >
            {t === 'workouts' ? 'Workouts' : t === 'shop' ? 'Supplements' : 'My Orders'}
          </button>
        ))}
      </div>

      {/* Workouts */}
      {tab === 'workouts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(week);
                d.setDate(d.getDate() - 7);
                const w = startOfWeek(d);
                setWeek(w);
                loadWorkouts(w);
              }}
              className="px-3 py-2 rounded-xl border"
            >
              ◀ Prev
            </button>
            <button
              onClick={() => {
                const w = startOfWeek(new Date());
                setWeek(w);
                loadWorkouts(w);
              }}
              className="px-3 py-2 rounded-xl border"
            >
              This Week
            </button>
            <button
              onClick={() => {
                const d = new Date(week);
                d.setDate(d.getDate() + 7);
                const w = startOfWeek(d);
                setWeek(w);
                loadWorkouts(w);
              }}
              className="px-3 py-2 rounded-xl border"
            >
              Next ▶
            </button>
            <input
              type="date"
              value={weekInputValue}
              onChange={(e) => {
                const w = startOfWeek(new Date(e.target.value + 'T00:00:00'));
                setWeek(w);
                loadWorkouts(w);
              }}
              className="rounded-xl border px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[]).map((d) => (
              <div key={d} className="rounded-2xl bg-white shadow p-4">
                <div className="font-medium mb-2">{dayLabels[d]}</div>
                {(plan?.[d]?.length || 0) === 0 ? (
                  <div className="text-xs text-gray-500">Rest / no workout assigned</div>
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

      {/* Shop */}
      {tab === 'shop' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((it) => {
              const qty = cart[it._id] || 0;
              const price = Number(it.sellingPrice || 0);
              return (
                <div key={it._id} className="rounded-2xl bg-white shadow p-4 flex gap-3">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm">₹{price}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Stock: {it.stockQty ?? 0} {it.unit || ''}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => addToCart(it, -1)} className="px-2 py-1 rounded-lg border">
                        −
                      </button>
                      <input
                        value={qty}
                        onChange={(e) => setQty(it, Number(e.target.value || 0))}
                        className="w-14 text-center rounded-lg border px-2 py-1"
                      />
                      <button onClick={() => addToCart(it, +1)} className="px-2 py-1 rounded-lg border">
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart */}
          <div className="rounded-2xl bg-white shadow p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Cart Total</div>
              <div className="text-lg font-semibold">₹{total}</div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm">Payment:</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
              </select>
              <div className="flex-1" />
              <button
                disabled={total <= 0}
                onClick={checkout}
                className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border p-6 text-center text-gray-500">No orders yet.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((p) => (
                <div key={p._id} className="rounded-2xl bg-white shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">₹{p.amount?.toFixed?.(2) ?? p.amount}</div>
                    <div className="text-xs text-gray-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{p.description || 'Purchase'}</div>
                  <div className="text-xs text-gray-500 mt-1">Method: {p.method || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
