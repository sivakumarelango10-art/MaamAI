import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'demo' | 'high' | 'medium' | 'low' | 'neutral' | 'success' | 'warning' | 'purple' | 'blue' | 'cobalt' | 'emerald' | 'amber' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs font-medium';

  const variantClasses = {
    demo: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#362208] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#54360C] font-semibold',
    high: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3D1414] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#5C1D1D]',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3D1414] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#5C1D1D]',
    medium: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#362208] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#54360C]',
    low: 'bg-[#F7F8FA] text-[#626875] dark:bg-[#22262B] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2F353C]',
    neutral: 'bg-[#F7F8FA] text-[#626875] dark:bg-[#22262B] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2F353C]',
    success: 'bg-[#F0FDF4] text-[#16803D] dark:bg-[#0E2E19] dark:text-[#86EFAC] border border-[#BBF7D0] dark:border-[#144A27]',
    emerald: 'bg-[#F0FDF4] text-[#16803D] dark:bg-[#0E2E19] dark:text-[#86EFAC] border border-[#BBF7D0] dark:border-[#144A27]',
    warning: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#362208] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#54360C]',
    amber: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#362208] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#54360C]',
    purple: 'bg-[#EEF2FF] text-[#3157E8] dark:bg-[#16203D] dark:text-[#6085FA] border border-[#D0DBFA] dark:border-[#203264]',
    blue: 'bg-[#EEF2FF] text-[#3157E8] dark:bg-[#16203D] dark:text-[#6085FA] border border-[#D0DBFA] dark:border-[#203264]',
    cobalt: 'bg-[#EEF2FF] text-[#3157E8] dark:bg-[#16203D] dark:text-[#6085FA] border border-[#D0DBFA] dark:border-[#203264]',
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full transition-colors ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
