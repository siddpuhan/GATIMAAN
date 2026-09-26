import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';
import { AdminSidebar } from '../components/admin/AdminSidebar.js';
import { AdminTopHeader } from '../components/admin/AdminTopHeader.js';
import { AdminOverviewPage } from './AdminOverviewPage.js';
import { QueueDesk } from '../components/admin/QueueDesk.js';
import { ServicesManagement } from '../components/admin/ServicesManagement.js';
import { CountersManagement } from '../components/admin/CountersManagement.js';
import { AdminPlaceholderPage } from './AdminPlaceholderPage.js';

interface RouteMeta {
  title: string;
  description: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/admin': {
    title: 'Center Command Overview',
    description: 'State of the center telemetry, active desks, and live queue snapshots',
  },
  '/admin/queue': {
    title: 'Queue Desk Cockpit',
    description: 'Operator desk workspace, ticket summoning, and live citizen processing',
  },
  '/admin/services': {
    title: 'Services Management',
    description: 'Configure citizen facilitation services, prefixes, and average durations',
  },
  '/admin/counters': {
    title: 'Counters & Physical Desks',
    description: 'Manage physical service desks, operator sessions, and desk assignments',
  },
  '/admin/footfall': {
    title: 'Footfall Intelligence',
    description: 'Hourly citizen arrival patterns, congestion tracking, and volume logs',
  },
  '/admin/analytics': {
    title: 'Center SLA Analytics',
    description: 'Department service times, operator efficiency, and throughput benchmarks',
  },
  '/admin/predictions': {
    title: 'Predictive Demand Engine',
    description: 'Statistical demand forecasting and proactive counter staffing recommendations',
  },
  '/admin/notifications': {
    title: 'System Notifications',
    description: 'Citizen SMS dispatch logs, operator alerts, and center announcements',
  },
  '/admin/settings': {
    title: 'Center & System Settings',
    description: 'Operational hours, security policies, and administrative preferences',
  },
};

export function AdminShellPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useUser();

  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const isOperator = rawRole?.toUpperCase() === UserRole.OPERATOR;

  const currentMeta = ROUTE_META[location.pathname] || {
    title: isOperator ? 'Queue Desk Cockpit' : 'Admin Control Center',
    description: isOperator
      ? 'Operator desk workspace and live citizen processing'
      : 'GATIMAAN Government Queue Management System',
  };

  return (
    <div className="flex-1 flex w-full min-w-0 bg-[#D6CCC2] overflow-hidden">
      {/* 1. Collapsible Admin / Operator Navigation Sidebar */}
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Admin Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopHeader
          title={currentMeta.title}
          description={currentMeta.description}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Routed Subpage Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto min-w-0">
          <Routes>
            <Route
              index
              element={isOperator ? <Navigate to="/admin/queue" replace /> : <AdminOverviewPage />}
            />
            <Route path="queue" element={<QueueDesk />} />
            <Route
              path="services"
              element={isOperator ? <Navigate to="/admin/queue" replace /> : <ServicesManagement />}
            />
            <Route
              path="counters"
              element={isOperator ? <Navigate to="/admin/queue" replace /> : <CountersManagement />}
            />
            <Route
              path="footfall"
              element={
                isOperator ? (
                  <Navigate to="/admin/queue" replace />
                ) : (
                  <AdminPlaceholderPage
                    title="Footfall Intelligence"
                    category="INSIGHT"
                    description="Real-time citizen arrival tracking, peak traffic volume analysis, and historical footfall heatmaps for Tehsil and Collectorate centers."
                    upcomingPhase="Phase 2 Analytics"
                    icon="👥"
                  />
                )
              }
            />
            <Route
              path="analytics"
              element={
                isOperator ? (
                  <Navigate to="/admin/queue" replace />
                ) : (
                  <AdminPlaceholderPage
                    title="Queue & SLA Analytics"
                    category="INSIGHT"
                    description="Detailed department throughput logs, operator resolution times, wait-time SLA compliance, and center performance dashboards."
                    upcomingPhase="Phase 2 Analytics"
                    icon="📈"
                  />
                )
              }
            />
            <Route
              path="predictions"
              element={
                isOperator ? (
                  <Navigate to="/admin/queue" replace />
                ) : (
                  <AdminPlaceholderPage
                    title="Predictive Demand Engine"
                    category="INSIGHT"
                    description="Statistical demand forecasting models predicting expected rush hours, arrival rates, and proactive counter staffing recommendations."
                    upcomingPhase="Phase 4 Demand Insights"
                    icon="🔮"
                  />
                )
              }
            />
            <Route
              path="notifications"
              element={
                isOperator ? (
                  <Navigate to="/admin/queue" replace />
                ) : (
                  <AdminPlaceholderPage
                    title="Notification Center"
                    category="SYSTEM"
                    description="Real-time citizen SMS delivery logs, counter summon alerts, emergency broadcast notices, and operator notifications."
                    upcomingPhase="Phase 3 System"
                    icon="🔔"
                  />
                )
              }
            />
            <Route
              path="settings"
              element={
                isOperator ? (
                  <Navigate to="/admin/queue" replace />
                ) : (
                  <AdminPlaceholderPage
                    title="Center & System Settings"
                    category="SYSTEM"
                    description="Center working hours configuration, service prefix masks, role-based operator permissions, and database backup controls."
                    upcomingPhase="Phase 3 System"
                    icon="⚙️"
                  />
                )
              }
            />
            <Route
              path="*"
              element={<Navigate to={isOperator ? '/admin/queue' : '/admin'} replace />}
            />
          </Routes>
        </div>

        {/* Compact Admin Workspace Footer */}
        <footer className="bg-slate-900 text-slate-400 py-2.5 px-4 sm:px-6 text-[11px] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">GATIMAAN</span>
            <span className="text-slate-600">•</span>
            <span>MP Online Smart Citizen Queue</span>
            <span className="text-slate-600">•</span>
            <span>Government of Madhya Pradesh</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">System Status: Operational</span>
          </div>
        </footer>
      </div>
    </div>
  );
}