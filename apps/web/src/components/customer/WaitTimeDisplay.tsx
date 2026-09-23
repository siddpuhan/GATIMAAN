import React from 'react';

interface WaitTimeDisplayProps {
  estimatedWaitSeconds: number | null | undefined;
  className?: string;
  showIcon?: boolean;
}

export function formatWaitTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return 'Calculating...';
  }
  if (seconds <= 0) {
    return 'Immediate / Next';
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `~${minutes} min${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `~${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `~${hours}h ${remainingMins}m`;
}

export function WaitTimeDisplay({
  estimatedWaitSeconds,
  className = '',
  showIcon = true,
}: WaitTimeDisplayProps) {
  const formatted = formatWaitTime(estimatedWaitSeconds);

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${className}`}>
      {showIcon && (
        <svg
          className="w-4 h-4 opacity-75 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" />
        </svg>
      )}
      <span>{formatted}</span>
    </span>
  );
}
