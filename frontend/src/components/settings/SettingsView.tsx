import React, { useState, useEffect } from 'react';
import {
  Shield,
  Save,
  Database,
  Lock,
} from 'lucide-react';
import type { FacultySettingsData, OAuthStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/States';

interface SettingsViewProps {
  settings: FacultySettingsData;
  isLoading: boolean;
  onUpdateSettings: (updated: Partial<FacultySettingsData>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  isLoading,
  onUpdateSettings,
}) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<FacultySettingsData>(settings);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    api.getOAuthStatus().then(setOauthStatus).catch(() => {});
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      if (oauthStatus?.is_connected) {
        await api.disconnectOAuth();
        const updated = await api.getOAuthStatus();
        setOauthStatus(updated);
      } else {
        const authData = await api.getGoogleAuthUrl();
        if (authData.auth_url) {
          window.location.href = authData.auth_url;
        }
      }
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={4} height="h-28" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Staff Profile & Session Card */}
      <Card
        title="Authenticated Staff Member"
        subtitle="Server-verified identity and Google account context"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-secondary block mb-0.5">Full Name</span>
            <span className="font-semibold text-ink">{currentUser?.full_name}</span>
          </div>
          <div>
            <span className="text-secondary block mb-0.5">Institutional Email</span>
            <span className="font-semibold text-ink">{currentUser?.email}</span>
          </div>
          <div>
            <span className="text-secondary block mb-0.5">Academic Role</span>
            <span className="font-semibold text-ink">{currentUser?.role}</span>
          </div>
          <div>
            <span className="text-secondary block mb-0.5">Faculty Department</span>
            <span className="font-semibold text-ink">{currentUser?.department}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-xs text-secondary">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Strict server-side isolation: All queries filter by verified user ID.</span>
          </div>
          <Badge variant="emerald">Active Session</Badge>
        </div>
      </Card>

      {/* 2. Google Workspace Integration */}
      <Card
        title="Google Workspace Integration (Gmail & Calendar)"
        subtitle="Stream real email messages and synchronize your institutional calendar"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-canvas border border-line">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${oauthStatus?.is_connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <div>
                <div className="text-sm font-semibold text-ink flex items-center gap-2">
                  <span>Google Account: {currentUser?.email}</span>
                  {oauthStatus?.is_connected ? (
                    <Badge variant="emerald">Connected</Badge>
                  ) : (
                    <Badge variant="neutral">Not Connected</Badge>
                  )}
                </div>
                <div className="text-xs text-secondary mt-0.5">
                  {oauthStatus?.is_connected
                    ? 'Encrypted OAuth token active at rest. Scopes: Gmail Read/Draft, Google Calendar.'
                    : 'Connect Google to allow Ma’amAI to read your inbox and schedule.'}
                </div>
              </div>
            </div>

            <Button
              variant={oauthStatus?.is_connected ? 'outline' : 'primary'}
              size="sm"
              isLoading={isConnectingOAuth}
              onClick={handleToggleOAuth}
            >
              {oauthStatus?.is_connected ? 'Disconnect Google' : 'Connect Google'}
            </Button>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Zero Automatic Sending Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Ma’amAI only reads messages and saves draft proposals directly to your Gmail account.
              No email is ever sent automatically without your deliberate review in Gmail.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Academic Preferences Form */}
      <Card
        title="Faculty Workspace Preferences"
        subtitle="Default schedule and AI tone options"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-ink">
              Default Office Hours Notice
            </label>
            <input
              type="text"
              value={formData.office_hours_default}
              onChange={(e) => setFormData({ ...formData, office_hours_default: e.target.value })}
              className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
            />
          </div>

          <div>
            <label className="font-semibold text-ink">
              AI Tone Preference
            </label>
            <input
              type="text"
              value={formData.ai_tone_preference}
              onChange={(e) => setFormData({ ...formData, ai_tone_preference: e.target.value })}
              className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSaving}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* 4. Production Database Information */}
      <Card
        title="Production Database Architecture"
        subtitle="Supabase PostgreSQL cluster connectivity"
      >
        <div className="p-4 rounded-xl bg-canvas border border-line text-xs text-secondary space-y-2">
          <div className="font-semibold text-ink flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Supabase PostgreSQL 17.11 (Transaction Pooler Port 6543)</span>
          </div>
          <p className="text-[11px] text-secondary">
            All user data, encrypted OAuth tokens, daily briefings, drafts, and calendar events are securely persisted in Supabase PostgreSQL.
            Zero external billing: ₹0 budget strictly enforced.
          </p>
        </div>
      </Card>
    </div>
  );
};
