import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type Att = {
  _id: string
  userId: any
  timestamp: string
  method: 'qr'|'manual'|'kiosk'|'face'
  deviceId?: string
}

type User = {
  _id: string
  userId: string
  firstName?: string
  lastName?: string
  email?: string
  mobile?: string
}

export default function Attendance() {
  const [items, setItems] = useState<Att[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [userQuery, setUserQuery] = useState('')
  const [userOptions, setUserOptions] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [limit, setLimit] = useState(200)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ userId: '', method: 'manual', deviceId: '' })

  async function load() {
    try {
      setLoading(true)
      setError('')
      const params: any = { limit }
      if (from) params.from = from
      if (to) params.to = to
      if (selectedUser?._id) params.userId = selectedUser._id
      const res = await axios.get('/api/attendance', { params })
      setItems(res.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function searchUsers(q: string) {
    setUserQuery(q)
    if (q.trim().length < 2) { setUserOptions([]); return }
    try {
      const res = await axios.get('/api/users', { params: { q } })
      setUserOptions(res.data || [])
    } catch {}
  }

  function selectFilterUser(u: User | null) {
    setSelectedUser(u)
  }

  function onChange<K extends keyof typeof form>(key: K, val: any) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function markAttendance(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.userId) throw new Error('User is required')
      await axios.post('/api/attendance/mark', {
        userId: form.userId,
        method: form.method,
        deviceId: form.deviceId || undefined,
      })
      setOpen(false)
      setForm({ userId: '', method: 'manual', deviceId: '' })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to mark attendance')
    } finally {
      setSaving(false)
    }
  }

  const total = useMemo(() => items.length, [items])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-black text-white">Manual Check-in</button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">User</label>
          <div className="relative">
            <input
              value={selectedUser ? `${selectedUser.firstName||''} ${selectedUser.lastName||''} (${selectedUser.userId})` : userQuery}
              onChange={e=>searchUsers(e.target.value)}
              placeholder="Search name, email, mobile…"
              className="w-full rounded-xl border px-3 py-2"
            />
            {userOptions.length > 0 && !selectedUser && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow max-h-64 overflow-auto">
                {userOptions.slice(0,8).map(u => (
                  <div key={u._id} onClick={()=>{ selectFilterUser(u); setUserOptions([]) }} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    {u.firstName} {u.lastName} — {u.userId} {u.mobile ? `· ${u.mobile}` : ''}
                  </div>
                ))}
              </div>
            )}
            {selectedUser && <button type="button" onClick={()=>{ selectFilterUser(null); setUserQuery('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">✕</button>}
          </div>
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm text-gray-600 mb-1">Limit</label>
          <input type="number" min={10} max={1000} value={limit} onChange={e=>setLimit(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2" />
        </div>
        <div className="md:col-span-1">
          <button onClick={load} className="px-3 py-2 rounded-xl border">Apply</button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {/* Peak hours quick view */}
      <PeakHours />

      {loading ? (
        <div className="text-gray-500">Loading attendance…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No check-ins for the selected filters.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a._id} className="border-t">
                  <td className="px-4 py-3">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {a?.userId?.userId ? `${a.userId.userId} — ${(a.userId.firstName||'') + ' ' + (a.userId.lastName||'')}` : String(a.userId)}
                  </td>
                  <td className="px-4 py-3">{a.method}</td>
                  <td className="px-4 py-3">{a.deviceId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Check-in Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Manual Check-in</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            <form onSubmit={markAttendance} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">User</label>
                <UserSelect value={form.userId} onChange={(id)=>onChange('userId', id)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Method</label>
                <select value={form.method} onChange={e=>onChange('method', e.target.value)} className="w-full rounded-xl border px-3 py-2">
                  <option value="manual">Manual</option>
                  <option value="qr">QR</option>
                  <option value="kiosk">Kiosk</option>
                  <option value="face">Face</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Device ID (optional)</label>
                <input value={form.deviceId} onChange={e=>onChange('deviceId', e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="FrontDesk-1" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white">{saving ? 'Saving…' : 'Mark Check-in'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PeakHours() {
  const [data, setData] = useState<{hour:number,count:number}[]>([])
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/reports/attendance/peaks')
        setData(res.data?.byHour || [])
      } catch {}
    })()
  }, [])

  if (!data.length) return null
  const peak = data.reduce((a,b)=> b.count > a.count ? b : a, data[0])

  return (
    <div className="rounded-2xl bg-white shadow p-4">
      <div className="text-sm text-gray-600">Peak Hours</div>
      <div className="text-3xl font-semibold mt-1">{peak.hour}:00</div>
      <div className="text-xs text-gray-500">Top hour by check-ins • Count {peak.count}</div>
    </div>
  )
}

function UserSelect({ value, onChange }:{ value: string, onChange: (id:string)=>void }) {
  const [q, setQ] = useState('')
  const [options, setOptions] = useState<User[]>([])
  const [picked, setPicked] = useState<User | null>(null)

  useEffect(() => { if (!value) setPicked(null) }, [value])

  async function search(q: string) {
    setQ(q)
    if (q.trim().length < 2) { setOptions([]); return }
    try {
      const res = await axios.get('/api/users', { params: { q } })
      setOptions(res.data || [])
    } catch {}
  }

  function select(u: User) {
    setPicked(u)
    onChange(u._id)
    setOptions([])
  }

  function clear() {
    setPicked(null)
    setQ('')
    onChange('')
  }

  return (
    <div className="relative">
      <input
        value={picked ? `${picked.firstName||''} ${picked.lastName||''} (${picked.userId})` : q}
        onChange={e=>search(e.target.value)}
        placeholder="Type to search member…"
        className="w-full rounded-xl border px-3 py-2"
      />
      {options.length > 0 && !picked && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border bg-white shadow max-h-64 overflow-auto">
          {options.slice(0,8).map(u => (
            <div key={u._id} onClick={()=>select(u)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer">
              {u.firstName} {u.lastName} — {u.userId} {u.mobile ? `· ${u.mobile}` : ''}
            </div>
          ))}
        </div>
      )}
      {picked && <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">✕</button>}
    </div>
  )
}
