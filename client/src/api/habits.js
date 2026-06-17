import { api } from './client';
export const fetchHabits = (params) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/habits${q ? '?' + q : ''}`);
};
export const createHabit = (data) => api.post('/habits', data);
export const updateHabit = (id, data) => api.put(`/habits/${id}`, data);
export const deleteHabit = (id) => api.del(`/habits/${id}`);
export const fetchCompletions = (params) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/habit-completions${q ? '?' + q : ''}`);
};
export const createCompletion = (data) => api.post('/habit-completions', data);
export const bulkCompletions = (data) => api.post('/habit-completions/bulk', data);
export const deleteCompletion = (id) => api.del(`/habit-completions/${id}`);
