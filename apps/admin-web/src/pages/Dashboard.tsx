import React, { useEffect, useState } from 'react'
import axios from 'axios'
import KpiCard from '../components/KpiCard'

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>(null)

  useEffect(() => {
    async function load() {
      try {
        // demo: revenue last 7 days + attendance peaks
        const [rev, peaks] = await Promise.all([
          axios.get('/api/reports/revenue/summary?days=7'),
          axios.get('/api/reports/attendance/peaks'),
        ])
        setKpis({ rev: rev.data, peaks: peaks.data })
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Revenue (7d)" value={kpis?.rev?.series?.reduce((a:any,b:any)=>a+b.value,0) ?? 0} />
        <KpiCard label="Peak Hour" value={kpis?.peaks?.byHour?.sort((a:any,b:any)=>b.count-a.count)[0]?.hour ?? '-'} sub="by check-ins" />
        <KpiCard label="New Signups" value="—" sub="wire API later" />
        <KpiCard label="Upcoming Renewals" value="—" sub="wire API later" />
      </div>
    </div>
  )
}
