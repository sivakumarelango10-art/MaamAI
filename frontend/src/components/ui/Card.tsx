import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  onClick,
  padding = 'md',
}) => {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#1A1D22] rounded-xl border border-[#E5E7EB] dark:border-[#262B33] shadow-card hover:shadow-hover transition-all duration-180 ${paddingClass} ${
        onClick ? 'cursor-pointer hover:border-[#D0DBFA] dark:hover:border-[#3157E8]/40' : ''
      } ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-[#E5E7EB] dark:border-[#262B33]">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-[#111111] dark:text-[#F8F9FA] tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#626875] dark:text-[#94A3B8] mt-0.5 font-normal">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
