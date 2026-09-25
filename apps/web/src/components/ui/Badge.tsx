import React from 'react';

export type BadgeVariant = 'navy' | 'success' | 'warning' | 'destructive' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  navy: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  warning: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
  destructive: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
};

const dotClasses: Record<BadgeVariant, string> = {
  navy: 'bg-slate-700',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  destructive: 'bg-rose-600',
  neutral: 'bg-slate-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  children,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotClasses[variant]} ${
            pulse ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
