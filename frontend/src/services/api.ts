import type {
  StaffUser,
  AuthTokenResponse,
  OAuthStatus,
  HealthStatus,
  BriefingData,
  EmailItem,
  AIDraftItem,
  CalendarEventItem,
  TaskItem,
  ActivityLogItem,
  FacultySettingsData,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

let activeToken: string | null = null;

export const api = {
  setAuthToken(token: string | null) {
    activeToken = token;
  },

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  },

  // -------------------------------------------------------------
  // Authentication & Staff User Endpoints
  // -------------------------------------------------------------
  async login(usernameOrEmail: string, password: string): Promise<AuthTokenResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Authentication failed');
    }
    return await res.json();
  },

  async getMe(): Promise<StaffUser> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return await res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.setAuthToken(null);
    }
  },

  async getStaffAccounts(): Promise<StaffUser[]> {
    try {
      const res = await fetch(`${BASE_URL}/auth/staff-accounts`);
      if (!res.ok) throw new Error('Non-200 response');
      return await res.json();
    } catch {
      return [
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
    }
  },

  // -------------------------------------------------------------
  // Google OAuth Isolation Endpoints
  // -------------------------------------------------------------
  async getOAuthStatus(): Promise<OAuthStatus> {
    try {
      const res = await fetch(`${BASE_URL}/oauth/google/status`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error('OAuth status error');
      return await res.json();
    } catch {
      return {
        is_connected: false,
        provider: 'google',
        demo_mode: true,
      };
    }
  },

  async getOAuthAuthUrl(): Promise<{ auth_url: string; state: string }> {
    const res = await fetch(`${BASE_URL}/oauth/google/auth-url`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('OAuth auth url error');
    return await res.json();
  },

  async disconnectOAuth(): Promise<void> {
    const res = await fetch(`${BASE_URL}/oauth/google/disconnect`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Disconnect error');
  },

  // -------------------------------------------------------------
  // System Health
  // -------------------------------------------------------------
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (!res.ok) throw new Error('Health check error');
      return await res.json();
    } catch {
      return {
        status: 'simulated',
        app: 'MaamAI Multi-User',
        version: '1.1.0',
        database: 'SQLite (Simulated Offline Mode)',
        environment: 'development',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // -------------------------------------------------------------
  // Workspace Endpoints (Protected by User Session)
  // -------------------------------------------------------------
  async getBriefing(): Promise<BriefingData> {
    try {
      const res = await fetch(`${BASE_URL}/briefing`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Briefing error');
      return await res.json();
    } catch {
      return {
        id: 1,
        user_id: 1,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        greeting: 'Good morning, Staff Member',
        quote: '“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra',
        summary: 'Your isolated faculty workspace is active. 2 urgent inquiries require attention.',
        key_focus: ['Deliver scheduled lectures', 'Review pending AI drafts', 'Hold student advising hours'],
        urgent_count: 2,
        meetings_count: 3,
        tasks_count: 4,
        generated_at: new Date().toISOString(),
      };
    }
  },

  async getEmails(category?: string, priority?: string): Promise<EmailItem[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (priority && priority !== 'All') params.append('priority', priority);
      const url = `${BASE_URL}/emails${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error('Emails error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async toggleEmailRead(id: number): Promise<EmailItem> {
    const res = await fetch(`${BASE_URL}/emails/${id}/toggle-read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Toggle read error');
    return await res.json();
  },

  async generateDraftForEmail(emailId: number): Promise<AIDraftItem> {
    const res = await fetch(`${BASE_URL}/emails/${emailId}/generate-draft`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Draft generation error');
    return await res.json();
  },

  async getDrafts(status?: string): Promise<AIDraftItem[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'All') params.append('status', status);
      const url = `${BASE_URL}/ai-drafts${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error('Drafts error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async approveDraft(id: number): Promise<AIDraftItem> {
    const res = await fetch(`${BASE_URL}/ai-drafts/${id}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Approve draft error');
    return await res.json();
  },

  async rejectDraft(id: number): Promise<AIDraftItem> {
    const res = await fetch(`${BASE_URL}/ai-drafts/${id}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Reject draft error');
    return await res.json();
  },

  async updateDraft(id: number, data: Partial<AIDraftItem>): Promise<AIDraftItem> {
    const res = await fetch(`${BASE_URL}/ai-drafts/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update draft error');
    return await res.json();
  },

  async getCalendarEvents(dateStr?: string): Promise<CalendarEventItem[]> {
    try {
      const params = new URLSearchParams();
      if (dateStr && dateStr !== 'All') params.append('date_str', dateStr);
      const url = `${BASE_URL}/calendar${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error('Calendar error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async createCalendarEvent(eventData: Omit<CalendarEventItem, 'id' | 'user_id'>): Promise<CalendarEventItem> {
    const res = await fetch(`${BASE_URL}/calendar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error('Create event error');
    return await res.json();
  },

  async getTasks(status?: string, priority?: string): Promise<TaskItem[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'All') params.append('status', status);
      if (priority && priority !== 'All') params.append('priority', priority);
      const url = `${BASE_URL}/tasks${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (!res.ok) throw new Error('Tasks error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async createTask(taskData: Omit<TaskItem, 'id' | 'user_id'>): Promise<TaskItem> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error('Create task error');
    return await res.json();
  },

  async updateTask(id: number, data: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update task error');
    return await res.json();
  },

  async getActivity(): Promise<ActivityLogItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/activity`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Activity error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async getSettings(): Promise<FacultySettingsData> {
    try {
      const res = await fetch(`${BASE_URL}/settings`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Settings error');
      return await res.json();
    } catch {
      return {
        faculty_name: 'Dr. Aris Vance',
        faculty_role: 'Associate Professor',
        faculty_email: 'aris.vance@university.edu',
        faculty_department: 'School of Interactive Computing',
        office_hours_default: 'Tuesday & Thursday 11:30 AM - 01:00 PM',
        ai_tone_preference: 'Warm, Academic, Professional',
        dark_mode_default: true,
        email_integration_status: 'Isolated User Workspace',
        calendar_integration_status: 'Isolated User Workspace',
      };
    }
  },

  async updateSettings(data: Partial<FacultySettingsData>): Promise<FacultySettingsData> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update settings error');
    return await res.json();
  },

  async resetDemoData(): Promise<void> {
    await fetch(`${BASE_URL}/settings/reset-demo`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  },
};
