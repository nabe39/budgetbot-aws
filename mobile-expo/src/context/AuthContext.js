import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const restoreSession = async () => {
      try {
        const [savedToken, savedUser] = await AsyncStorage.multiGet(['token', 'user']);
        if (savedToken[1]) {
          setToken(savedToken[1]);
        }
        if (savedUser[1]) {
          setUser(JSON.parse(savedUser[1]));
        }
      } catch {
        // Ignore corrupted storage
      } finally {
        setInitializing(false);
      }
    };
    restoreSession();
  }, [logout]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/login', { username, password });
      const { access_token, user_id, username: uname, full_name } = res.data;
      const userObj = { user_id, username: uname, full_name };
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userObj));
      setToken(access_token);
      setUser(userObj);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Login failed. Check API connection.',
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (full_name, username, password) => {
    setLoading(true);
    try {
      await api.post('/register', { full_name, username, password });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Registration failed.',
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initializing,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
