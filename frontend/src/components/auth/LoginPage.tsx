import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, AlertCircle, Lock, KeyRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isLoadingAuth, authError } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] dark:bg-[#0D0F12] text-[#111111] dark:text-[#F8F9FA] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Subtle architectural grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] dark:bg-[radial-gradient(#262B33_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header with Official Logo on Crisp White */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-[#1A1D22] border border-[#E5E7EB] dark:border-[#262B33] shadow-card mb-1">
            <img
              src="/logo.png"
              alt="Ma'amAI Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain mx-auto"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] dark:text-white sm:text-4xl">
            Ma’amAI
          </h1>
          <p className="text-xs text-[#626875] dark:text-[#94A3B8] font-medium max-w-xs mx-auto leading-relaxed">
            Executive AI Assistant for Academic Staff and Faculty Workspaces
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#1A1D22] border border-[#E5E7EB] dark:border-[#262B33] rounded-2xl shadow-card p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-lg font-semibold text-[#111111] dark:text-white">Staff Sign In</h2>
            <p className="text-xs text-[#626875] dark:text-[#94A3B8] leading-relaxed">
              Sign in with your verified institutional Google account to access your private inbox, calendar schedule, and AI response queue.
            </p>
          </div>

          {/* Error Message Box */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#3D1414]/40 border border-[#FECACA] dark:border-[#5C1D1D] text-[#B91C1C] dark:text-[#FCA5A5] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">
                {authError}
              </div>
            </div>
          )}

          {/* Single Google Login Action */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#3157E8] hover:bg-[#2444C7] text-white font-medium text-sm shadow-xs hover:shadow transition-all active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#3157E8] focus:ring-offset-2"
            >
              {isLoadingAuth ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                </div>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Access Policy and Security Guarantees */}
          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#262B33] space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F8FA] dark:bg-[#13161A] border border-[#E5E7EB] dark:border-[#262B33] text-[11px] text-[#626875] dark:text-[#94A3B8]">
              <Shield className="w-4 h-4 text-[#3157E8] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-[#111111] dark:text-white block">Server-Side Allowlist Protection</span>
                <p className="leading-relaxed">
                  Access is restricted to the two authorized Ma’amAI accounts. Unauthorized credentials cannot access workspace records.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#626875] dark:text-[#94A3B8] font-medium">
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] dark:bg-[#13161A] p-2 rounded-md border border-[#E5E7EB] dark:border-[#262B33]">
                <Lock className="w-3 h-3 text-[#16803D]" />
                <span>Fernet Encrypted Tokens</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7F8FA] dark:bg-[#13161A] p-2 rounded-md border border-[#E5E7EB] dark:border-[#262B33]">
                <KeyRound className="w-3 h-3 text-[#3157E8]" />
                <span>HMAC Anti-Replay State</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
