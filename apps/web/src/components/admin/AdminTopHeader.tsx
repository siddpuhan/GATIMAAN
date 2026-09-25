import React from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Badge } from '../ui/Badge.js';

interface AdminTopHeaderProps {
  title: string;
  description?: string;
  onToggleMobileSidebar: () => void;
}

export function AdminTopHeader({
  title,
  description,
  onToggleMobileSidebar,
}: AdminTopHeaderProps) {
  const { user } = useUser();

  const operatorName = user?.fullName || user?.firstName || 'Admin Operator';
  const operatorEmail = user?.primaryEmailAddress?.emailAddress || '';

  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            aria-label="Toggle admin sidebar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-[11px] text-slate-500 hidden sm:block leading-none mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Live Status, Notifications & Account Profile Area */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live System Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Online</span>
          </div>

          {/* Quick Notification Bell (Placeholder) */}
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition relative"
            title="System Notifications"
            aria-label="Notifications"
          >
            <span className="text-sm">🔔</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-1 right-1" />
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Account Profile Summary */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {operatorName}
              </span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {operatorEmail}
                </span>
                <Badge variant="navy" size="sm" className="text-[9px] px-1 py-0">
                  ADMIN
                </Badge>
              </div>
            </div>

            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
