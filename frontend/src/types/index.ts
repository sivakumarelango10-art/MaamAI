export type NavigationTab = 
  | 'overview' 
  | 'inbox' 
  | 'drafts' 
  | 'calendar' 
  | 'tasks' 
  | 'activity' 
  | 'settings';

export interface StaffUser {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  department: string;
  avatar_initials: string;
  picture_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: StaffUser;
}

export interface OAuthStatus {
  is_connected: boolean;
  email_account?: string;
  provider: string;
  scopes?: string;
  last_synced?: string;
  demo_mode: boolean;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  database: string;
  environment: string;
  timestamp: string;
}

export interface BriefingData {
  id: number;
  user_id: number;
  date: string;
  greeting: string;
  quote?: string;
  summary: string;
  key_focus: string[];
  urgent_count: number;
  meetings_count: number;
  tasks_count: number;
  generated_at: string;
}

export interface EmailItem {
  id: number;
  user_id: number;
  sender_name: string;
  sender_email: string;
  subject: string;
  snippet: string;
  body: string;
  category: 'Student Inquiries' | 'Department' | 'Research' | 'Grants' | string;
  priority: 'high' | 'medium' | 'low';
  is_read: boolean;
  has_draft: boolean;
  received_at: string;
  google_message_id?: string;
  thread_id?: string;
  demo_label?: string;
}

export interface AIDraftItem {
  id: number;
  user_id: number;
  email_id?: number;
  recipient: string;
  subject: string;
  body: string;
  tone: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'saved_to_gmail' | string;
  confidence_score: number;
  google_draft_id?: string;
  created_at: string;
  demo_label?: string;
}

export interface CalendarEventItem {
  id: number;
  user_id: number;
  title: string;
  start_time: string;
  end_time: string;
  date_str: string;
  location: string;
  event_type: 'lecture' | 'office_hours' | 'meeting' | 'colloquium' | string;
  attendee_count: number;
  notes?: string;
  google_event_id?: string;
  demo_label?: string;
}

export interface TaskItem {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  demo_label?: string;
}

export interface ActivityLogItem {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  timestamp: string;
}

export interface FacultySettingsData {
  faculty_name: string;
  faculty_role: string;
  faculty_email: string;
  faculty_department: string;
  office_hours_default: string;
  ai_tone_preference: string;
  dark_mode_default: boolean;
  email_integration_status: string;
  calendar_integration_status: string;
}
