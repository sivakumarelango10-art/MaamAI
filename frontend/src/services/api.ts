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
  // Google OAuth 2.0 & Session Endpoints
  // -------------------------------------------------------------
  async getGoogleAuthUrl(): Promise<{ auth_url: string; state: string }> {
    const res = await fetch(`${BASE_URL}/auth/google/url`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to retrieve Google authentication URL');
    }
    return await res.json();
  },

  async exchangeGoogleCode(code: string, state: string): Promise<AuthTokenResponse> {
    const res = await fetch(`${BASE_URL}/auth/google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Google authentication exchange failed');
    }
    return await res.json();
  },

  async getMe(): Promise<StaffUser> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Session expired or invalid profile');
    }
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

  // -------------------------------------------------------------
  // Google Workspace Integration Status & Disconnect
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
        demo_mode: false,
      };
    }
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
        status: 'disconnected',
        app: 'MaamAI',
        version: '1.2.0',
        database: 'Supabase PostgreSQL',
        environment: 'production',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // -------------------------------------------------------------
  // Workspace Endpoints (Protected by User Session)
  // -------------------------------------------------------------
  async getBriefing(): Promise<BriefingData> {
    const res = await fetch(`${BASE_URL}/briefing`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      return {
        id: 0,
        user_id: 0,
        date: 'Today',
        greeting: 'Welcome to MaamAI',
        summary: 'Connect your Google account to synchronize Gmail and Google Calendar.',
        key_focus: ['Connect Google Workspace to view live schedule and messages'],
        urgent_count: 0,
        meetings_count: 0,
        tasks_count: 0,
        generated_at: new Date().toISOString(),
      };
    }
    return await res.json();
  },

  async getEmails(category?: string, priority?: string): Promise<EmailItem[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (priority && priority !== 'All') params.append('priority', priority);
    const url = `${BASE_URL}/emails${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
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

  async saveGmailDraft(emailId: number): Promise<{ success: boolean; draft_id?: string; message: string }> {
    const res = await fetch(`${BASE_URL}/emails/${emailId}/save-gmail-draft`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save draft to Gmail');
    }
    return await res.json();
  },

  async getDrafts(status?: string): Promise<AIDraftItem[]> {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    const url = `${BASE_URL}/ai-drafts${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
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

  async saveDraftToGmailAccount(draftId: number): Promise<{ success: boolean; draft_id?: string; message: string }> {
    const res = await fetch(`${BASE_URL}/ai-drafts/${draftId}/save-to-gmail`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save draft to Gmail account');
    }
    return await res.json();
  },

  async getCalendarEvents(dateStr?: string): Promise<CalendarEventItem[]> {
    const params = new URLSearchParams();
    if (dateStr && dateStr !== 'All') params.append('date_str', dateStr);
    const url = `${BASE_URL}/calendar${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
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
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    if (priority && priority !== 'All') params.append('priority', priority);
    const url = `${BASE_URL}/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: this.getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
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
    const res = await fetch(`${BASE_URL}/activity`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  },

  async getSettings(): Promise<FacultySettingsData> {
    const res = await fetch(`${BASE_URL}/settings`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      return {
        faculty_name: 'Faculty Staff',
        faculty_role: 'Academic Staff',
        faculty_email: '',
        faculty_department: 'Academic Affairs',
        office_hours_default: 'By Appointment',
        ai_tone_preference: 'Academic & Professional',
        dark_mode_default: true,
        email_integration_status: 'Google Workspace',
        calendar_integration_status: 'Google Workspace',
      };
    }
    return await res.json();
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
};
