import React from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Packs from './pages/Packs'
import Users from './pages/Users'
import Payments from './pages/Payments'
import Attendance from './pages/Attendance'
import Kiosk from './pages/Kiosk'
import Workouts from './pages/Workouts'
import UserProfile from './pages/UserProfile'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto p-4 flex gap-4 items-center">
          <h1 className="font-bold">Gym Admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/">Dashboard</Link>
            <Link to="/users">Users</Link>
            <Link to="/packs">Packs</Link>
            <Link to="/payments">Payments</Link>
            <Link to="/attendance">Attendance</Link>
            <Link to="/workouts">Workouts</Link>
            <Link to="/kiosk">Kiosk</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/packs" element={<Packs />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/users/:id" element={<UserProfile />} />
        </Routes>
      </main>
    </div>
  )
}
