import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AdminSidebar } from '../components/admin/AdminSidebar.js';
import { AdminTopHeader } from '../components/admin/AdminTopHeader.js';
import { AdminOverviewPage } from './AdminOverviewPage.js';
import { AdminQueuePage } from './AdminQueuePage.js';
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
  '/admin/queue-desk': {
    title: 'Queue Desk Cockpit',
    description: 'Operator desk workspace, ticket summoning, and live citizen processing',
  },
  '/admin/queue-operations': {
    title: 'Queue Operations Console',
    description: 'Service & counter queue dispatch, ticket calling, and status override',
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
    description: 'AI-driven queue rush forecasting and automated desk staffing suggestions',
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

  const currentMeta = ROUTE_META[location.pathname] || {
    title: 'Admin Control Center',
    description: 'GATIMAAN Government Queue Management System',
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
      {/* Persistent / Responsive Left Sidebar */}
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Admin Content Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Admin Top Header */}
        <AdminTopHeader
          title={currentMeta.title}
          description={currentMeta.description}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Routed Subpage Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route index element={<AdminOverviewPage />} />
            <Route path="queue" element={<QueueDesk />} />
            <Route path="queue-desk" element={<QueueDesk />} />
            <Route path="queue-operations" element={<AdminQueuePage />} />
            <Route path="services" element={<ServicesManagement />} />
            <Route path="counters" element={<CountersManagement />} />
            <Route
              path="footfall"
              element={
                <AdminPlaceholderPage
                  title="Footfall Intelligence"
                  category="INSIGHT"
                  description="Real-time citizen arrival tracking, peak traffic volume analysis, and historical footfall heatmaps for Tehsil and Collectorate centers."
                  upcomingPhase="Phase 2 Analytics"
                  icon="👥"
                />
              }
            />
            <Route
              path="analytics"
              element={
                <AdminPlaceholderPage
                  title="Queue & SLA Analytics"
                  category="INSIGHT"
                  description="Detailed department throughput logs, operator resolution times, wait-time SLA compliance, and center performance dashboards."
                  upcomingPhase="Phase 2 Analytics"
                  icon="📈"
                />
              }
            />
            <Route
              path="predictions"
              element={
                <AdminPlaceholderPage
                  title="Predictive Demand Engine"
                  category="INSIGHT"
                  description="Machine learning forecasting models predicting expected rush hours, seasonal demand spikes, and proactive counter allocation."
                  upcomingPhase="Phase 4 AI Insights"
                  icon="🔮"
                />
              }
            />
            <Route
              path="notifications"
              element={
                <AdminPlaceholderPage
                  title="Notification Center"
                  category="SYSTEM"
                  description="Real-time citizen SMS delivery logs, counter summon alerts, emergency broadcast notices, and operator notifications."
                  upcomingPhase="Phase 3 System"
                  icon="🔔"
                />
              }
            />
            <Route
              path="settings"
              element={
                <AdminPlaceholderPage
                  title="Center & System Settings"
                  category="SYSTEM"
                  description="Center working hours configuration, service prefix masks, role-based operator permissions, and database backup controls."
                  upcomingPhase="Phase 3 System"
                  icon="⚙️"
                />
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}