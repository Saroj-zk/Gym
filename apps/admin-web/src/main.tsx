// apps/admin-web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';

// Always include cookies (auth) on API calls from admin-web
axios.defaults.withCredentials = true;
// If you have a dedicated API origin, uncomment next line:
// axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// Redirect to /admin-login only when appropriate (avoid kiosk & member pages)
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const p = window.location.pathname;
      const onAdminLogin = p.startsWith('/admin-login');
      const onKiosk = p.startsWith('/kiosk');
      const onMemberView = p.startsWith('/me/'); // embedded member view inside admin

      // Only redirect if we're on an admin-only route (not kiosk or member view)
      if (!onAdminLogin && !onKiosk && !onMemberView) {
        window.location.assign('/admin-login');
      }
    }
    return Promise.reject(err);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
