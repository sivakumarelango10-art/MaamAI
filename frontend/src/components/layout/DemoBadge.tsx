import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  return (
    <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-medium">
        <span className="inline-flex items-center gap-1 bg-amber-500 text-white dark:bg-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
          Phase 2 Multi-User
        </span>
        <span className="hidden sm:inline">
          Independent staff workspaces active with full database record ownership &amp; JWT isolation.
        </span>
        <span className="sm:hidden">
          Isolated Multi-User Workspace Demo
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-amber-800 dark:text-amber-300">
        <span className="flex items-center gap-1 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Zero Cross-User Data Access Enforced</span>
          <span className="md:hidden">Protected</span>
        </span>
        <span className="hidden lg:inline text-slate-500 dark:text-slate-400 border-l border-amber-200 dark:border-amber-800/80 pl-3">
          <Info className="w-3 h-3 inline mr-1" />
          Offline Demo Mode • No external credentials required
        </span>
      </div>
    </div>
  );
};
