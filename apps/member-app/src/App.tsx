import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CheckIn from './pages/CheckIn';
import MemberHome from './pages/MemberHome';
import MemberLogin from './pages/MemberLogin'; // ← ensure this file exists (we can add it next)
import './index.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/checkin" element={<CheckIn />} />
      <Route path="/login" element={<MemberLogin />} />
      <Route path="/me/:id" element={<MemberHome />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
