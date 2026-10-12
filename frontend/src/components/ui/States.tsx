import React from 'react';
import { AlertCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({
  rows = 3,
  height = 'h-16',
}) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`w-full ${height} bg-[#E5E7EB]/70 dark:bg-[#262B33]/70 rounded-xl`}
        />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ title, description, icon, action }) => {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-[#F7F8FA] dark:bg-[#1E2228] flex items-center justify-center text-[#626875] dark:text-[#94A3B8] mb-3 border border-[#E5E7EB] dark:border-[#262B33]">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h4 className="text-sm font-semibold text-[#111111] dark:text-[#F8F9FA]">{title}</h4>
      <p className="text-xs text-[#626875] dark:text-[#94A3B8] mt-1 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Failed to load content', message, onRetry }) => {
  return (
    <div className="p-6 rounded-xl border border-[#FECACA] dark:border-[#5C1D1D] bg-[#FEF2F2]/60 dark:bg-[#3D1414]/30 text-center flex flex-col items-center">
      <AlertCircle className="w-8 h-8 text-[#B91C1C] mb-2" />
      <h4 className="text-sm font-semibold text-[#991B1B] dark:text-[#FCA5A5]">{title}</h4>
      <p className="text-xs text-[#B91C1C] dark:text-[#F87171] mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
