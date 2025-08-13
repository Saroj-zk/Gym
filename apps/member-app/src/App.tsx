import React from 'react'
import { Routes, Route } from 'react-router-dom'
import CheckIn from './pages/CheckIn'
import './index.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/checkin" element={<CheckIn />} />
    </Routes>
  )
}
