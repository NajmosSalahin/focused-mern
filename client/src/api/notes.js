import { api } from './client';
export const fetchNotes = () => api.get('/notes');
export const createNote = (data) => api.post('/notes', data);
export const deleteNote = (id) => api.del(`/notes/${id}`);
