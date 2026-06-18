import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        if (localStorage.getItem('ai_pm_token')) {
          const userData = await apiClient.auth.me();
          setUser(userData);
        }
      } catch (err) {
        apiClient.auth.logout();
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email, password) => {
    const userData = await apiClient.auth.login(email, password);
    setUser(userData);
  };

  const register = async (email, password) => {
    const userData = await apiClient.auth.register(email, password);
    setUser(userData);
  };

  const logout = () => {
    apiClient.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
