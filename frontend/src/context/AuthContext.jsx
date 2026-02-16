import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Use deployed backend when set (e.g. Vercel); otherwise use relative /api (Vite proxy locally)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API = `${API_BASE}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }
    const { user: u, token } = await res.json();
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        isAgent: data.isAgent || false,
        isLandlord: data.isLandlord || false,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    const { user: u, token } = await res.json();
    localStorage.setItem('token', token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateRoles = async (roles) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/auth/me/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(roles),
    });
    if (!res.ok) throw new Error('Failed to update roles');
    const u = await res.json();
    setUser((prev) => (prev ? { ...prev, ...u } : u));
    return u;
  };

  const token = () => localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateRoles, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function api(path, options = {}) {
  const t = localStorage.getItem('token');
  const headers = { ...options.headers, 'Content-Type': 'application/json' };
  if (t) headers.Authorization = `Bearer ${t}`;
  const url = `${API}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...options, headers });
}
