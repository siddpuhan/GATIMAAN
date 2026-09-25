import React from 'react';
import { Button } from './Button.js';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading services...', className = '' }: LoadingStateProps) {
  return (
    <div className={`py-12 px-4 text-center space-y-3 ${className}`}>
      <div
        className="w-7 h-7 rounded-full border-3 border-slate-900 border-t-transparent animate-spin mx-auto"
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title = 'No items found',
  message = 'No services are currently available.',
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-6 bg-slate-50/75 rounded-2xl border border-dashed border-slate-300 text-center max-w-lg mx-auto space-y-3 ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-white text-slate-500 border border-slate-200 flex items-center justify-center mx-auto text-xl shadow-2xs">
        {icon || '📋'}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
      </div>
      {action && (
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = "We couldn't load the queue. Please try again.",
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 sm:p-8 bg-rose-50/60 border border-rose-200 rounded-2xl text-center space-y-3 max-w-md mx-auto ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-lg font-bold">
        !
      </div>
      <div>
        <h4 className="text-sm font-bold text-rose-900">{title}</h4>
        <p className="text-xs text-rose-700 mt-1 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button variant="destructive" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

export interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function AlertBanner({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}: AlertBannerProps) {
  const styles = {
    info: 'bg-slate-100 border-slate-300 text-slate-900',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    warning: 'bg-amber-50 border-amber-300 text-amber-950',
    error: 'bg-rose-50 border-rose-300 text-rose-900',
  }[type];

  const iconColor = {
    info: 'text-slate-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    error: 'text-rose-700',
  }[type];

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${styles} ${className}`}
    >
      <span className={`font-bold shrink-0 text-sm ${iconColor}`}>
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'warning' && '⚠️'}
        {type === 'info' && 'ℹ️'}
      </span>
      <div className="flex-1 min-w-0 space-y-0.5">
        {title && <h5 className="font-bold">{title}</h5>}
        <p className="leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-current opacity-60 hover:opacity-100 font-bold p-1 rounded transition text-sm leading-none"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}
