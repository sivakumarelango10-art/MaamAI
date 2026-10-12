import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { StaffUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: StaffUser | null;
  token: string | null;
  isLoadingAuth: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    // 1. Check URL query parameters for token (redirect from OAuth callback)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        localStorage.setItem('maamai-token', urlToken);
        // Clean URL to prevent token leakage in browser history/bookmarks
        window.history.replaceState({}, document.title, window.location.pathname);
        return urlToken;
      }
      return localStorage.getItem('maamai-token');
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maamai-current-user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [authError, setAuthError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get('error') || params.get('detail');
      if (errorMsg) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return decodeURIComponent(errorMsg);
      }
    }
    return null;
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Sync token with API client and local storage
  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      localStorage.setItem('maamai-token', token);
    } else {
      api.setAuthToken(null);
      localStorage.removeItem('maamai-token');
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('maamai-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('maamai-current-user');
    }
  }, [currentUser]);

  // Reconcile user profile with verified backend session on mount (supports both Bearer token & HttpOnly cookie)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);

    api.getMe()
      .then((verifiedUser) => {
        if (isMounted) {
          setCurrentUser(verifiedUser);
          setIsLoadingAuth(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Token expired or invalid on server - clear local session
          setToken(null);
          setCurrentUser(null);
          setIsLoadingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const loginWithGoogle = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const { auth_url } = await api.getGoogleAuthUrl();
      if (auth_url) {
        window.location.href = auth_url;
      } else {
        throw new Error('Google authorization URL not returned.');
      }
    } catch (err: any) {
      setIsLoadingAuth(false);
      setAuthError(err.message || 'Unable to connect to Google authentication service.');
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    try {
      await api.logout();
    } catch {
      // Ignore network errors
    } finally {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem('maamai-token');
      localStorage.removeItem('maamai-current-user');
      setIsLoadingAuth(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const me = await api.getMe();
      setCurrentUser(me);
    } catch {
      setToken(null);
      setCurrentUser(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isLoadingAuth,
        authError,
        loginWithGoogle,
        logout,
        clearAuthError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
