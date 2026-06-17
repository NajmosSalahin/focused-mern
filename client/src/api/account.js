import { api } from './client';
export const deleteAllUserData = () => api.del('/account/data');
