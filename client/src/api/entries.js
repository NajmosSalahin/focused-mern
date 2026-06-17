import { api } from './client';

export const fetchEntries = (params) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/entries${q ? '?' + q : ''}`);
};
export const createEntry = (data) => api.post('/entries', data);
export const updateEntry = (id, data) => api.put(`/entries/${id}`, data);
export const deleteEntry = (id) => api.del(`/entries/${id}`);
export const addSegment = (id, data) => api.post(`/entries/${id}/segments`, data);
export const stopEntry = (id) => api.post(`/entries/${id}/stop`);
