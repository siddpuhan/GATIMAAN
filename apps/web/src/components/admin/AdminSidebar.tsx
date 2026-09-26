import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';

interface AdminSidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    groupName: 'OPERATE',
    items: [
      { name: 'Overview', path: '/admin', icon: '📊', exact: true },
      { name: 'Queue Desk', path: '/admin/queue', icon: '🪑' },
    ],
  },
  {
    groupName: 'CONFIGURE',
    items: [
      { name: 'Services', path: '/admin/services', icon: '📋' },
      { name: 'Counters & Desks', path: '/admin/counters', icon: '🏢' },
    ],
  },
  {
    groupName: 'INSIGHT',
    items: [
      { name: 'Footfall', path: '/admin/footfall', icon: '👥' },
      { name: 'Analytics', path: '/admin/analytics', icon: '📈' },
      { name: 'Predictions', path: '/admin/predictions', icon: '🔮' },
    ],
  },
  {
    groupName: 'SYSTEM',
    items: [
      { name: 'Notifications', path: '/admin/notifications', icon: '🔔' },
      { name: 'Settings', path: '/admin/settings', icon: '⚙️' },
    ],
  },
];

const OPERATOR_NAV_GROUPS: NavGroup[] = [
  {
    groupName: 'OPERATE',
    items: [
      { name: 'Queue Desk', path: '/admin/queue', icon: '🪑' },
    ],
  },
];

export function AdminSidebar({ isOpen, onCloseMobile }: AdminSidebarProps) {
  const { user } = useUser();
  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const isOperator = rawRole?.toUpperCase() === UserRole.OPERATOR;

  const navGroups = isOperator ? OPERATOR_NAV_GROUPS : ADMIN_NAV_GROUPS;
  const homePath = isOperator ? '/admin/queue' : '/admin';
  const subtitle = isOperator ? 'Operations Console' : 'Admin Command';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link to={homePath} className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center font-black text-sm group-hover:bg-slate-700 transition">
              G
            </div>
            <div>
              <span className="font-black text-white text-sm tracking-tight block leading-tight">
                GATIMAAN
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">
                {subtitle}
              </span>
            </div>
          </Link>

          {/* Close Button for Mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close sidebar navigation"
          >
            ✕
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 text-xs">
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <span className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                {group.groupName}
              </span>

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-bold border border-slate-700/60 shadow-2xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                      }`
                    }
                  >
                    <span className="text-sm opacity-80" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Quick Exit to Citizen Portal */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <Link
            to="/"
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition text-[11px]"
          >
            <span>← Citizen Portal</span>
            <span className="font-mono text-[10px] text-slate-400">Public</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
