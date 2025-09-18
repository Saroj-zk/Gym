// apps/admin-web/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // local can use proxy, prod uses full API URL
  withCredentials: true,                            // send/receive cookies
});

// Redirect to admin-login on 401 for admin pages only
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const p = window.location.pathname;
      const onAdminLogin = p.startsWith('/admin-login');
      const onKiosk = p.startsWith('/kiosk');
      const onMemberView = p.startsWith('/me/');
      if (!onAdminLogin && !onKiosk && !onMemberView) {
        window.location.assign('/admin-login');
      }
    }
    return Promise.reject(err);
  }
);
