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

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...((options.headers as Record<string, string>) || {}),
    };
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Automatically send HttpOnly maamai_session cookies
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Request failed (${res.status})`);
    }
    return res.json();
  },

  // -------------------------------------------------------------
  // Google OAuth 2.0 & Session Endpoints
  // -------------------------------------------------------------
  async getGoogleAuthUrl(): Promise<{ auth_url: string; state: string }> {
    return this.request<{ auth_url: string; state: string }>('/auth/google/url');
  },

  async exchangeGoogleCode(code: string, state: string): Promise<AuthTokenResponse> {
    return this.request<AuthTokenResponse>('/auth/google/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  },

  async getMe(): Promise<StaffUser> {
    return this.request<StaffUser>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
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
      return await this.request<OAuthStatus>('/oauth/google/status');
    } catch {
      return {
        is_connected: false,
        provider: 'google',
        demo_mode: false,
      };
    }
  },

  async disconnectOAuth(): Promise<void> {
    await this.request('/oauth/google/disconnect', { method: 'POST' });
  },

  // -------------------------------------------------------------
  // System Health
  // -------------------------------------------------------------
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { credentials: 'include' });
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
    try {
      return await this.request<BriefingData>('/briefing');
    } catch {
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
  },

  async getEmails(category?: string, priority?: string): Promise<EmailItem[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (priority && priority !== 'All') params.append('priority', priority);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.request<EmailItem[]>(`/emails${query}`);
    } catch {
      return [];
    }
  },

  async toggleEmailRead(id: number): Promise<EmailItem> {
    return this.request<EmailItem>(`/emails/${id}/toggle-read`, { method: 'PATCH' });
  },

  async generateDraftForEmail(emailId: number): Promise<AIDraftItem> {
    return this.request<AIDraftItem>(`/emails/${emailId}/generate-draft`, { method: 'POST' });
  },

  async saveGmailDraft(emailId: number): Promise<{ success: boolean; draft_id?: string; message: string }> {
    return this.request<{ success: boolean; draft_id?: string; message: string }>(
      `/emails/${emailId}/save-gmail-draft`,
      { method: 'POST' }
    );
  },

  async getDrafts(status?: string): Promise<AIDraftItem[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'All') params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.request<AIDraftItem[]>(`/ai-drafts${query}`);
    } catch {
      return [];
    }
  },

  async approveDraft(id: number): Promise<AIDraftItem> {
    return this.request<AIDraftItem>(`/ai-drafts/${id}/approve`, { method: 'POST' });
  },

  async rejectDraft(id: number): Promise<AIDraftItem> {
    return this.request<AIDraftItem>(`/ai-drafts/${id}/reject`, { method: 'POST' });
  },

  async updateDraft(id: number, data: Partial<AIDraftItem>): Promise<AIDraftItem> {
    return this.request<AIDraftItem>(`/ai-drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async saveDraftToGmailAccount(draftId: number): Promise<{ success: boolean; draft_id?: string; message: string }> {
    return this.request<{ success: boolean; draft_id?: string; message: string }>(
      `/ai-drafts/${draftId}/save-to-gmail`,
      { method: 'POST' }
    );
  },

  async getCalendarEvents(dateStr?: string): Promise<CalendarEventItem[]> {
    try {
      const params = new URLSearchParams();
      if (dateStr && dateStr !== 'All') params.append('date_str', dateStr);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.request<CalendarEventItem[]>(`/calendar${query}`);
    } catch {
      return [];
    }
  },

  async createCalendarEvent(eventData: Omit<CalendarEventItem, 'id' | 'user_id'>): Promise<CalendarEventItem> {
    return this.request<CalendarEventItem>('/calendar', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async getTasks(status?: string, priority?: string): Promise<TaskItem[]> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'All') params.append('status', status);
      if (priority && priority !== 'All') params.append('priority', priority);
      const query = params.toString() ? `?${params.toString()}` : '';
      return await this.request<TaskItem[]>(`/tasks${query}`);
    } catch {
      return [];
    }
  },

  async createTask(taskData: Omit<TaskItem, 'id' | 'user_id'>): Promise<TaskItem> {
    return this.request<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  async updateTask(id: number, data: Partial<TaskItem>): Promise<TaskItem> {
    return this.request<TaskItem>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getActivity(): Promise<ActivityLogItem[]> {
    try {
      return await this.request<ActivityLogItem[]>('/activity');
    } catch {
      return [];
    }
  },

  async getSettings(): Promise<FacultySettingsData> {
    try {
      return await this.request<FacultySettingsData>('/settings');
    } catch {
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
  },

  async updateSettings(data: Partial<FacultySettingsData>): Promise<FacultySettingsData> {
    return this.request<FacultySettingsData>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
