const BASE = '/api';

let _pending = 0;
const _listeners = new Set();

export function subscribe(fn) {
  _listeners.add(fn);
  fn(_pending);
  return () => _listeners.delete(fn);
}

function notify() {
  _listeners.forEach(fn => fn(_pending));
}

function getToken() {
  try { return localStorage.getItem('focused_token'); } catch { return null; }
}

async function request(url, options = {}) {
  _pending++;
  notify();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${url}`, { headers, ...options });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      const err = new Error(body.message || 'Request failed');
      Object.assign(err, body);
      throw err;
    }
    return res.json();
  } finally {
    _pending--;
    notify();
  }
}

export const api = {
  get: (url) => request(url),
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
  del: (url) => request(url, { method: 'DELETE' }),
};
