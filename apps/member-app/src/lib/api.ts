// member-app/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // fine to leave true; cookies get forwarded if used
});
