import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pv_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Keep user state in sync whenever localStorage changes (e.g. after token refresh)
  useEffect(() => {
    const onStorage = () => {
      try {
        const stored = localStorage.getItem('pv_user');
        if (stored) setUser(JSON.parse(stored));
        else setUser(null);
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = async (username, password) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    const res = await axios.post(`${API_BASE_URL}/auth/login`, form);
    const { access_token, user: loggedInUser } = res.data;
    localStorage.setItem('pv_access_token', access_token);
    localStorage.setItem('pv_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem('pv_access_token');
    localStorage.removeItem('pv_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
