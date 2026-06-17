import { api } from './client';
export const exportData = () => api.get('/export');
export const importData = (data) => api.post('/import', data);
