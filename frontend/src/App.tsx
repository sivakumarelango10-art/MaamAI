import React, { useState, useEffect, useCallback } from 'react';
import type {
  NavigationTab,
  HealthStatus,
  BriefingData,
  EmailItem,
  AIDraftItem,
  CalendarEventItem,
  TaskItem,
  ActivityLogItem,
  FacultySettingsData,
} from './types';
import { api } from './services/api';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DemoBanner } from './components/layout/DemoBadge';
import { DailyBriefingPanel } from './components/dashboard/DailyBriefingPanel';
import { OverviewStats } from './components/dashboard/OverviewStats';
import { EmailList } from './components/email/EmailList';
import { DraftsReviewQueue } from './components/drafts/DraftsReviewQueue';
import { CalendarTimeline } from './components/calendar/CalendarTimeline';
import { TaskManager } from './components/tasks/TaskManager';
import { ActivityFeed } from './components/activity/ActivityFeed';
import { SettingsView } from './components/settings/SettingsView';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Calendar, CheckSquare, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [drafts, setDrafts] = useState<AIDraftItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [settings, setSettings] = useState<FacultySettingsData>({
    faculty_name: 'Dr. Aris Vance',
    faculty_role: 'Associate Professor of Computer Science',
    faculty_email: 'aris.vance@university.edu',
    faculty_department: 'School of Interactive Computing',
    office_hours_default: 'Tuesday & Thursday 11:30 AM - 01:00 PM',
    ai_tone_preference: 'Warm, Academic, Professional',
    dark_mode_default: true,
    email_integration_status: 'Isolated User Workspace',
    calendar_integration_status: 'Isolated User Workspace',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingDraftId, setIsGeneratingDraftId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch all data
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        healthRes,
        briefingRes,
        emailsRes,
        draftsRes,
        eventsRes,
        tasksRes,
        activityRes,
        settingsRes,
      ] = await Promise.all([
        api.getHealth(),
        api.getBriefing(),
        api.getEmails(),
        api.getDrafts(),
        api.getCalendarEvents(),
        api.getTasks(),
        api.getActivity(),
        api.getSettings(),
      ]);

      setHealth(healthRes);
      setBriefing(briefingRes);
      setEmails(emailsRes);
      setDrafts(draftsRes);
      setCalendarEvents(eventsRes);
      setTasks(tasksRes);
      setActivities(activityRes);
      setSettings(settingsRes);
    } catch {
      // Fallback handled within api service
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, currentUser?.id]);

  // Handlers for mutative actions
  const handleToggleEmailRead = async (id: number) => {
    const updated = await api.toggleEmailRead(id);
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: updated.is_read } : e)));
    showNotification(updated.is_read ? 'Marked as read' : 'Marked as unread');
  };

  const handleGenerateDraft = async (emailId: number) => {
    setIsGeneratingDraftId(emailId);
    try {
      const draft = await api.generateDraftForEmail(emailId);
      setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, has_draft: true } : e)));
      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)]);
      showNotification('AI draft proposal prepared and added to review queue');
      // Refresh activity log
      api.getActivity().then(setActivities);
    } finally {
      setIsGeneratingDraftId(null);
    }
  };

  const handleApproveDraft = async (id: number) => {
    const approved = await api.approveDraft(id);
    setDrafts((prev) => prev.map((d) => (d.id === id ? approved : d)));
    showNotification('Draft approved and dispatched');
    api.getActivity().then(setActivities);
  };

  const handleRejectDraft = async (id: number) => {
    const rejected = await api.rejectDraft(id);
    setDrafts((prev) => prev.map((d) => (d.id === id ? rejected : d)));
    showNotification('Draft discarded');
    api.getActivity().then(setActivities);
  };

  const handleUpdateDraft = async (id: number, data: Partial<AIDraftItem>) => {
    const updated = await api.updateDraft(id, data);
    setDrafts((prev) => prev.map((d) => (d.id === id ? updated : d)));
    showNotification('Draft changes saved');
  };

  const handleCreateCalendarEvent = async (eventData: Omit<CalendarEventItem, 'id' | 'user_id'>) => {
    const newEvent = await api.createCalendarEvent(eventData);
    setCalendarEvents((prev) => [...prev, newEvent]);
    showNotification(`Added "${newEvent.title}" to schedule`);
    api.getActivity().then(setActivities);
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated = await api.updateTask(task.id, { status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    showNotification(`Task marked as ${newStatus}`);
    api.getActivity().then(setActivities);
  };

  const handleCreateTask = async (taskData: Omit<TaskItem, 'id' | 'user_id'>) => {
    const newTask = await api.createTask(taskData);
    setTasks((prev) => [newTask, ...prev]);
    showNotification(`Task "${newTask.title}" added to checklist`);
    api.getActivity().then(setActivities);
  };

  const handleUpdateSettings = async (updatedData: Partial<FacultySettingsData>) => {
    const saved = await api.updateSettings(updatedData);
    setSettings(saved);
    showNotification('Settings saved to SQLite');
  };

  const handleResetDemo = async () => {
    await api.resetDemoData();
    await loadAllData();
    showNotification('SQLite database re-seeded with pristine demo data');
  };

  // Badge Counts
  const badgeCounts = {
    inbox: emails.filter((e) => !e.is_read).length,
    drafts: drafts.filter((d) => d.status === 'pending_review').length,
    calendar: calendarEvents.filter((e) => e.date_str.toLowerCase() === 'today').length,
    tasks: tasks.filter((t) => t.status !== 'completed').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Demo Mode Banner */}
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          badgeCounts={badgeCounts}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          <Header
            activeTab={activeTab}
            health={health}
            onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            facultyName={currentUser?.full_name || settings.faculty_name}
            facultyRole={currentUser?.role || settings.faculty_role}
          />

          {/* Toast Notification */}
          {notification && (
            <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-brand-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {notification}
            </div>
          )}

          {/* Tab Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Daily Briefing Panel */}
                {briefing && (
                  <DailyBriefingPanel
                    briefing={briefing}
                    onNavigateToInbox={() => setActiveTab('inbox')}
                    onNavigateToCalendar={() => setActiveTab('calendar')}
                    onNavigateToDrafts={() => setActiveTab('drafts')}
                  />
                )}

                {/* Stat Cards */}
                <OverviewStats
                  urgentEmailsCount={emails.filter((e) => e.priority === 'high' && !e.is_read).length}
                  pendingDraftsCount={drafts.filter((d) => d.status === 'pending_review').length}
                  todayMeetingsCount={
                    calendarEvents.filter((e) => e.date_str.toLowerCase() === 'today').length
                  }
                  pendingTasksCount={tasks.filter((t) => t.status !== 'completed').length}
                  onSelectTab={setActiveTab}
                />

                {/* 2-Column Split: Inbox Summary & Schedule Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Email summary preview */}
                  <Card
                    title="Faculty Communications"
                    subtitle="Unread and high priority items"
                    headerAction={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('inbox')}
                        icon={<Mail className="w-3.5 h-3.5" />}
                      >
                        All Emails ({emails.length})
                      </Button>
                    }
                  >
                    <EmailList
                      emails={emails.slice(0, 3)}
                      isLoading={isLoading}
                      onToggleRead={handleToggleEmailRead}
                      onGenerateDraft={handleGenerateDraft}
                      onViewDraft={() => setActiveTab('drafts')}
                      isGeneratingDraftId={isGeneratingDraftId}
                    />
                  </Card>

                  {/* Right: Academic Timeline preview */}
                  <Card
                    title="Today's Timetable"
                    subtitle="Lecture rooms and scheduled syncs"
                    headerAction={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('calendar')}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                      >
                        Full Calendar
                      </Button>
                    }
                  >
                    <CalendarTimeline
                      events={calendarEvents.filter((e) => e.date_str.toLowerCase() === 'today')}
                      isLoading={isLoading}
                      onCreateEvent={handleCreateCalendarEvent}
                    />
                  </Card>
                </div>

                {/* Bottom Row: Quick Tasks Checklist */}
                <Card
                  title="Deliverables & Grading Checklist"
                  subtitle="Faculty actionable items"
                  headerAction={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('tasks')}
                      icon={<CheckSquare className="w-3.5 h-3.5" />}
                    >
                      Task Board ({tasks.length})
                    </Button>
                  }
                >
                  <TaskManager
                    tasks={tasks.slice(0, 4)}
                    isLoading={isLoading}
                    onToggleTaskStatus={handleToggleTaskStatus}
                    onCreateTask={handleCreateTask}
                  />
                </Card>
              </div>
            )}

            {/* 2. INBOX TAB */}
            {activeTab === 'inbox' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Faculty Inbox
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Curated student messages, faculty committee notes, and grant proposals.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllData}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>

                <EmailList
                  emails={emails}
                  isLoading={isLoading}
                  onToggleRead={handleToggleEmailRead}
                  onGenerateDraft={handleGenerateDraft}
                  onViewDraft={() => setActiveTab('drafts')}
                  isGeneratingDraftId={isGeneratingDraftId}
                />
              </div>
            )}

            {/* 3. AI DRAFTS TAB */}
            {activeTab === 'drafts' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      AI Draft Proposals & Review
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Human-in-the-loop: inspect, customize tone, approve, or discard proposed replies.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllData}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>

                <DraftsReviewQueue
                  drafts={drafts}
                  isLoading={isLoading}
                  onApproveDraft={handleApproveDraft}
                  onRejectDraft={handleRejectDraft}
                  onUpdateDraft={handleUpdateDraft}
                />
              </div>
            )}

            {/* 4. CALENDAR TAB */}
            {activeTab === 'calendar' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Academic Schedule & Timeline
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lectures, office hours, and university administrative sessions.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllData}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>

                <CalendarTimeline
                  events={calendarEvents}
                  isLoading={isLoading}
                  onCreateEvent={handleCreateCalendarEvent}
                />
              </div>
            )}

            {/* 5. TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Faculty Checklist & Deliverables
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Track grading deadlines, NSF reports, and committee assignments.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllData}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>

                <TaskManager
                  tasks={tasks}
                  isLoading={isLoading}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onCreateTask={handleCreateTask}
                  onDeleteTask={async (id) => {
                    await api.updateTask(id, { status: 'completed' });
                    setTasks((prev) => prev.filter((t) => t.id !== id));
                    showNotification('Task removed');
                  }}
                />
              </div>
            )}

            {/* 6. ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      System Activity & Audit Log
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Audit trail of automated briefings and faculty actions.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllData}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Refresh
                  </Button>
                </div>

                <ActivityFeed activities={activities} isLoading={isLoading} />
              </div>
            )}

            {/* 7. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <SettingsView
                  settings={settings}
                  isLoading={isLoading}
                  onUpdateSettings={handleUpdateSettings}
                  onResetDemo={handleResetDemo}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
