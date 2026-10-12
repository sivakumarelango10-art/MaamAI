import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { StaffUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: StaffUser | null;
  token: string | null;
  availableStaff: StaffUser[];
  isLoadingAuth: boolean;
  isProduction: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchStaff: (username: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default fallback staff users for offline preview
const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 1,
    email: 'aris.vance@university.edu',
    username: 'aris_vance',
    full_name: 'Dr. Aris Vance',
    role: 'Associate Professor of Computer Science',
    department: 'School of Interactive Computing',
    avatar_initials: 'AV',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'priya.sharma@university.edu',
    username: 'priya_sharma',
    full_name: 'Dr. Priya Sharma',
    role: 'Assistant Professor of Machine Learning',
    department: 'Data Science & Machine Learning Institute',
    avatar_initials: 'PS',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isProduction = Boolean(
    import.meta.env.PROD ||
    (typeof import.meta.env.VITE_APP_ENV === 'string' && import.meta.env.VITE_APP_ENV.toLowerCase() === 'production')
  );

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('maamai-current-user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_STAFF[0];
      }
    }
    return DEFAULT_STAFF[0];
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('maamai-token') || 'demo_token_user_1';
  });

  const [availableStaff, setAvailableStaff] = useState<StaffUser[]>(DEFAULT_STAFF);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Sync token to API client
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

  // Reconcile user identity with verified server-side session on mount
  useEffect(() => {
    if (token && token !== 'demo_token_user_1' && token !== 'demo_token_user_2') {
      api.getMe()
        .then((verifiedUser) => {
          setCurrentUser(verifiedUser);
        })
        .catch(() => {
          // Token expired or invalid on server - clear local session
          setToken(null);
          setCurrentUser(null);
        });
    }
  }, []);

  // Load available staff list on mount (only in non-production environments)
  useEffect(() => {
    if (!isProduction) {
      api.getStaffAccounts().then((staff) => {
        if (staff && staff.length > 0) {
          setAvailableStaff(staff);
        }
      }).catch(() => {
        setAvailableStaff(DEFAULT_STAFF);
      });
    } else {
      setAvailableStaff([]);
    }
  }, [isProduction]);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoadingAuth(true);
    try {
      const res = await api.login(usernameOrEmail, password);
      setToken(res.access_token);
      setCurrentUser(res.user);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors
    } finally {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem('maamai-token');
      localStorage.removeItem('maamai-current-user');
    }
  };

  const switchStaff = async (username: string) => {
    if (isProduction) {
      throw new Error('Quick staff switching is disabled in production mode. Please authenticate directly.');
    }
    setIsLoadingAuth(true);
    try {
      // In development/demo, authenticate with standard staff credentials
      const res = await api.login(username, 'Password123!');
      setToken(res.access_token);
      setCurrentUser(res.user);
    } catch {
      // Fallback switch in offline mode
      const found = availableStaff.find((s) => s.username === username);
      if (found) {
        setCurrentUser(found);
        setToken(`demo_token_user_${found.id}`);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const me = await api.getMe();
      setCurrentUser(me);
    } catch {
      // Token invalid or session expired
      setToken(null);
      setCurrentUser(null);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        availableStaff,
        isLoadingAuth,
        isProduction,
        login,
        logout,
        switchStaff,
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
