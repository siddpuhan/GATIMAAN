import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'destructive-outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white border border-slate-900 shadow-xs focus-visible:ring-slate-900',
  secondary:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs focus-visible:ring-slate-500',
  outline:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs focus-visible:ring-slate-500',
  success:
    'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border border-emerald-700 shadow-xs focus-visible:ring-emerald-700',
  warning:
    'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white border border-amber-600 shadow-xs focus-visible:ring-amber-600',
  destructive:
    'bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white border border-rose-700 shadow-xs focus-visible:ring-rose-700',
  'destructive-outline':
    'bg-white hover:bg-rose-50 active:bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs focus-visible:ring-rose-500',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-transparent focus-visible:ring-slate-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg min-h-[36px]',
  md: 'px-4 py-2.5 text-xs font-semibold rounded-xl min-h-[44px]',
  lg: 'px-6 py-3 text-sm font-bold rounded-xl min-h-[48px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 transition-all select-none cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
              aria-hidden="true"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
