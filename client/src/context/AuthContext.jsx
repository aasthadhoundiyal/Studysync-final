import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  setAuthToken,
  getSavedUser,
  setSavedUser,
} from '@/api/client';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getAuthMe,
} from '@/api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getAuthToken());
  const [user, setUserState] = useState(() => getSavedUser());
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize and verify authentication state on mount
  const checkAuth = useCallback(async () => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setUserState(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await getAuthMe();
      if (res?.success && res?.user) {
        setUserState(res.user);
        setSavedUser(res.user);
        setTokenState(existingToken);
      } else {
        // Token invalid or user not found
        setAuthToken(null);
        setSavedUser(null);
        setUserState(null);
        setTokenState(null);
      }
    } catch {
      // Backend unreachable or token rejected (401)
      setAuthToken(null);
      setSavedUser(null);
      setUserState(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle unauthorized events dispatched by API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken(null);
      setSavedUser(null);
      setUserState(null);
      setTokenState(null);
    };

    window.addEventListener('studysync:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('studysync:unauthorized', handleUnauthorized);
  }, []);

  // Login handler
  const login = async (credentials) => {
    const data = await apiLogin(credentials);
    if (data?.token && data?.user) {
      setTokenState(data.token);
      setUserState(data.user);
      setAuthToken(data.token);
      setSavedUser(data.user);
    }
    return data;
  };

  // Register handler
  const register = async (userData) => {
    const data = await apiRegister(userData);
    if (data?.token && data?.user) {
      setTokenState(data.token);
      setUserState(data.user);
      setAuthToken(data.token);
      setSavedUser(data.user);
    }
    return data;
  };

  // Logout handler
  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Backend logout error (continuing client cleanup):', err?.message);
    } finally {
      setAuthToken(null);
      setSavedUser(null);
      setTokenState(null);
      setUserState(null);
    }
  };

  // Helper to partially update user state in context and localStorage
  const updateUser = (updatedFields) => {
    setUserState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      setSavedUser(updated);
      return updated;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
