import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Header } from '../components/layout/Header';
import { LoginPage } from '../components/auth/LoginPage';
import { App } from '../App';
import { api } from '../services/api';

const TestAuthConsumer: React.FC = () => {
  const { currentUser, logout, token, loginWithGoogle } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{currentUser?.full_name || 'No User'}</span>
      <span data-testid="user-email">{currentUser?.email || 'No Email'}</span>
      <span data-testid="user-token">{token || 'No Token'}</span>
      <button data-testid="google-login-btn" onClick={loginWithGoogle}>
        Sign In With Google
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Log Out
      </button>
    </div>
  );
};

describe('Google Authentication & Production Session Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes in clean unauthenticated state when no session token exists', () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No Email');
    expect(screen.getByTestId('user-token')).toHaveTextContent('No Token');
  });

  it('renders LoginPage with Continue with Google button when unauthenticated', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Ma’amAI')).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(
      screen.getByText(/Access is restricted to the two authorized Ma’amAI accounts/i)
    ).toBeInTheDocument();
  });

  it('reconciles authorized staff user from localStorage and backend getMe', async () => {
    const mockStaffUser = {
      id: 1,
      email: 'sivakumarelango10@gmail.com',
      username: 'sivakumar_elango',
      full_name: 'Sivakumar Elango',
      role: 'Faculty Member / Lead Researcher',
      department: 'Computer Science & Engineering',
      avatar_initials: 'SE',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('maamai-token', 'valid-jwt-session-token');
    localStorage.setItem('maamai-current-user', JSON.stringify(mockStaffUser));
    vi.spyOn(api, 'getMe').mockResolvedValue(mockStaffUser);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Sivakumar Elango');
      expect(screen.getByTestId('user-email')).toHaveTextContent('sivakumarelango10@gmail.com');
      expect(screen.getByTestId('user-token')).toHaveTextContent('valid-jwt-session-token');
    });
  });

  it('clears session and tokens upon logout', async () => {
    const mockStaffUser = {
      id: 2,
      email: 'avishka.s@kalvium.com',
      username: 'avishka_s',
      full_name: 'Avishka S',
      role: 'Academic Faculty / Instructor',
      department: 'Software Engineering & Systems',
      avatar_initials: 'AS',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('maamai-token', 'active-token-avishka');
    localStorage.setItem('maamai-current-user', JSON.stringify(mockStaffUser));
    vi.spyOn(api, 'getMe').mockResolvedValue(mockStaffUser);
    vi.spyOn(api, 'logout').mockResolvedValue();

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
      expect(screen.getByTestId('user-token')).toHaveTextContent('No Token');
      expect(localStorage.getItem('maamai-token')).toBeNull();
      expect(localStorage.getItem('maamai-current-user')).toBeNull();
    });
  });

  it('injects Authorization: Bearer <token> into API client headers', () => {
    api.setAuthToken('test-secret-google-session-jwt');
    const headers = api.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer test-secret-google-session-jwt');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('renders Header with verified staff identity and Supabase DB status', async () => {
    const mockStaffUser = {
      id: 1,
      email: 'sivakumarelango10@gmail.com',
      username: 'sivakumar_elango',
      full_name: 'Sivakumar Elango',
      role: 'Faculty Member / Lead Researcher',
      department: 'Computer Science & Engineering',
      avatar_initials: 'SE',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('maamai-token', 'valid-token');
    localStorage.setItem('maamai-current-user', JSON.stringify(mockStaffUser));
    vi.spyOn(api, 'getMe').mockResolvedValue(mockStaffUser);
    vi.spyOn(api, 'getOAuthStatus').mockResolvedValue({
      is_connected: true,
      email_account: 'sivakumarelango10@gmail.com',
      provider: 'google',
      demo_mode: false,
    });

    render(
      <ThemeProvider>
        <AuthProvider>
          <Header
            activeTab="overview"
            health={{
              status: 'healthy',
              app: 'MaamAI',
              version: '1.2.0',
              database: 'Supabase PostgreSQL',
              environment: 'production',
              timestamp: new Date().toISOString(),
            }}
            onToggleSidebar={vi.fn()}
            facultyName="Sivakumar Elango"
            facultyRole="Faculty Member"
          />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Faculty Executive Overview')).toBeInTheDocument();
    expect(screen.getByText('Supabase DB')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Google Connected')).toBeInTheDocument();
    });
  });
});
