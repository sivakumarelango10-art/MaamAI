import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Sparkles, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isLoadingAuth, authError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-xl shadow-brand-500/25 ring-1 ring-white/20 mb-2">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ma’amAI
          </h1>
          <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
            Executive AI Assistant for Academic Staff & Faculty Workspaces
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-semibold text-white">Staff Sign-In</h2>
            <p className="text-xs text-slate-400">
              Sign in with your verified institutional Google account to access your isolated inbox, calendar, and AI drafts.
            </p>
          </div>

          {/* Error Message Box */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {authError}
              </div>
            </div>
          )}

          {/* Single Login Action */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {isLoadingAuth ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isLoadingAuth ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Access Policy & Security Guarantees */}
          <div className="pt-4 border-t border-slate-700/60 space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/50 border border-slate-700/40 text-[11px] text-slate-300">
              <Shield className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white block">Strict Server-Side Access Control</span>
                <p className="text-slate-400 leading-relaxed">
                  Access is restricted to the two authorized Ma’amAI accounts. Please sign in using an approved Google account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5 bg-slate-900/30 p-2 rounded-md border border-slate-800">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Fernet Encrypted Tokens</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/30 p-2 rounded-md border border-slate-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Supabase PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 font-medium">
          Ma’amAI Production Environment • Zero-Rupee Architecture
        </div>
      </div>
    </div>
  );
};
