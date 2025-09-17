import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g. https://gym-api-0xw3.onrender.com
  withCredentials: true,                 // allow cookies for admin session
});
