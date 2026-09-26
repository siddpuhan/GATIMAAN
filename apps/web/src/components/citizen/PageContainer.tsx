import React from 'react';

/**
 * Standard citizen page width container (Phase U1 foundation).
 * Citizen pages are information-dense but calm — one shared max-width,
 * consistent horizontal padding, and a vertical rhythm of space-y-6.
 */
export function PageContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`max-w-5xl mx-auto w-full space-y-6 ${className}`}>{children}</div>;
}

/**
 * Consistent section header for citizen pages: one bold heading + one
 * optional supporting line, with optional right-aligned action area.
 * Replaces ad-hoc heading/paragraph pairs across citizen pages.
 */
export interface SectionHeaderProps {
  title: string;
  description?: string;
  level?: 2 | 3;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  level = 2,
  actions,
  className = '',
}: SectionHeaderProps) {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-slate-200 ${className}`}
    >
      <div className="min-w-0">
        <Tag className="text-section-heading font-bold text-slate-900 tracking-tight">{title}</Tag>
        {description && (
          <p className="text-secondary text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
