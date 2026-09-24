import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);        // { name, email }
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('nexus_token');
    const storedUser = localStorage.getItem('nexus_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setAuthLoading(false);
  }, []);

  // Persist token to axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Handle expired sessions (401 Unauthorized) by clearing state and redirecting
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_user');
          if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('nexus_token', access_token);
    localStorage.setItem('nexus_user', JSON.stringify(userData));
    return userData;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('nexus_token', access_token);
    localStorage.setItem('nexus_user', JSON.stringify(userData));
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch (_) { /* noop */ }
    setToken(null);
    setUser(null);
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, authLoading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
