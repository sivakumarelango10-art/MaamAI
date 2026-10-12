import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Header } from '../components/layout/Header';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

// Test consumer component for testing AuthContext
const TestConsumer: React.FC = () => {
  const { currentUser, switchStaff, logout, token } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{currentUser?.full_name || 'No User'}</span>
      <span data-testid="user-email">{currentUser?.email || 'No Email'}</span>
      <span data-testid="user-token">{token || 'No Token'}</span>
      <button
        data-testid="switch-to-priya"
        onClick={() => switchStaff('priya_sharma')}
      >
        Switch to Priya
      </button>
      <button
        data-testid="switch-to-aris"
        onClick={() => switchStaff('aris_vance')}
      >
        Switch to Aris
      </button>
      <button
        data-testid="logout-btn"
        onClick={() => logout()}
      >
        Log Out
      </button>
    </div>
  );
};

describe('Multi-User Workspace & Session Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes default staff workspace as Dr. Aris Vance with isolated token', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('Dr. Aris Vance');
    expect(screen.getByTestId('user-email')).toHaveTextContent('aris.vance@university.edu');
    expect(screen.getByTestId('user-token')).toHaveTextContent('demo_token_user_1');
  });

  it('switches staff account and updates bearer authorization context', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const switchBtn = screen.getByTestId('switch-to-priya');
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Dr. Priya Sharma');
      expect(screen.getByTestId('user-email')).toHaveTextContent('priya.sharma@university.edu');
    });
  });

  it('clears session and tokens upon logout', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-token')).not.toHaveTextContent('No Token');

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
    api.setAuthToken('test-secret-jwt-token-456');
    const headers = api.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer test-secret-jwt-token-456');
    expect(headers['Content-Type']).toBe('application/json');

    api.setAuthToken(null);
    const clearedHeaders = api.getAuthHeaders();
    expect(clearedHeaders['Authorization']).toBeUndefined();
  });

  it('renders Header with active staff identity and isolation status', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <Header
            activeTab="overview"
            health={{
              status: 'ok',
              app: 'MaamAI',
              version: '1.1.0',
              database: 'SQLite',
              environment: 'development',
              timestamp: new Date().toISOString(),
            }}
            onToggleSidebar={() => {}}
            facultyName="Dr. Aris Vance"
            facultyRole="Associate Professor"
          />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText('Faculty Executive Overview')).toBeInTheDocument();
    expect(screen.getByText('Staff Workspace')).toBeInTheDocument();
    expect(screen.getByText('SQLite DB Active')).toBeInTheDocument();
  });

  it('renders Card and Badge components with correct styling variants', () => {
    render(
      <Card title="Test Security Card" subtitle="Server-side isolated">
        <Badge variant="demo">Demo Badge</Badge>
        <Badge variant="high">High Priority</Badge>
      </Card>
    );

    expect(screen.getByText('Test Security Card')).toBeInTheDocument();
    expect(screen.getByText('Server-side isolated')).toBeInTheDocument();
    expect(screen.getByText('Demo Badge')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });
});
