import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
    lg: 'px-4 py-2.5 text-base rounded-lg gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#3157E8] hover:bg-[#2444C7] text-white font-medium shadow-xs focus:ring-2 focus:ring-[#3157E8] focus:ring-offset-2 dark:focus:ring-offset-[#111111]',
    secondary:
      'bg-[#111111] hover:bg-[#222222] text-white dark:bg-white dark:text-[#111111] dark:hover:bg-slate-200 font-medium',
    outline:
      'border border-[#E5E7EB] dark:border-[#272B30] text-[#111111] dark:text-[#F8F9FA] hover:bg-[#F7F8FA] dark:hover:bg-[#1A1D20] font-medium',
    ghost:
      'text-[#626875] dark:text-[#94A3B8] hover:text-[#111111] dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-[#1A1D20] font-medium',
    danger:
      'bg-[#B91C1C] hover:bg-[#991B1B] text-white font-medium shadow-xs focus:ring-2 focus:ring-red-500',
    success:
      'bg-[#16803D] hover:bg-[#15803D] text-white font-medium shadow-xs focus:ring-2 focus:ring-emerald-500',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer active:scale-[0.985] ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};
