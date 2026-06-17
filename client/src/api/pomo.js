import { api } from './client';
export const fetchPomoSessions = (params) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/pomo-sessions${q ? '?' + q : ''}`);
};
export const createPomoSession = (data) => api.post('/pomo-sessions', data);
export const clearTodayPomo = () => api.del('/pomo-sessions/today');
export const fetchPomoSettings = () => api.get('/pomo-settings');
export const updatePomoSettings = (data) => api.put('/pomo-settings', data);
