import { api } from './client';
export const fetchWeather = (params) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/weather${q ? '?' + q : ''}`);
};
export const saveWeather = (data) => api.post('/weather', data);
export const fetchLocation = () => api.get('/weather/location');
export const fetchForecast = (lat, lon) => api.get(`/weather/fetch?lat=${lat}&lon=${lon}`);
