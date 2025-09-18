// apps/admin-web/src/lib/api.ts
import axios from 'axios';

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  ''; // empty means "same-origin" (only for local dev with proxy)

export const api = axios.create({
  baseURL: BASE || '/api',  // in production we rely on VITE_API_URL
  withCredentials: true,
});

// Redirect to /admin-login on 401 (but not from kiosk/member routes)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const p = window.location.pathname;
      const onLogin = p.startsWith('/admin-login');
      const onKiosk = p.startsWith('/kiosk');
      const onMember = p.startsWith('/me/');
      if (!onLogin && !onKiosk && !onMember) window.location.assign('/admin-login');
    }
    return Promise.reject(err);
  }
);
