import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ServicesManagement } from '../components/admin/ServicesManagement.js';
import { CountersManagement } from '../components/admin/CountersManagement.js';
import { QueueDesk } from '../components/admin/QueueDesk.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/Card.js';

export function AdminShellPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<
    'queue' | 'services' | 'counters' | 'identity'
  >('queue');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Admin Shell Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1"
            >
              ← Citizen Portal
            </Link>

            <span className="text-xs text-slate-300">/</span>

            <span className="text-xs text-slate-700 font-bold">
              Admin Portal
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Admin Control Center
          </h1>

          <p className="text-xs text-slate-500">
            Department configuration, physical desk management, and operator
            session oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="navy" size="md">
            ADMIN AUTHORIZED
          </Badge>
        </div>
      </div>

      {/* Unified Admin Navigation Bar */}
      <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto gap-1">
        <Link
          to="/admin/queue"
          className="pb-3 px-4 border-b-2 border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 transition inline-flex items-center gap-1.5"
        >
          <span>Queue Operations</span>
          <span className="text-[10px] text-slate-400">↗</span>
        </Link>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2.5 px-4 -mb-px border-b-2 transition ${activeTab === 'queue'
            ? 'border-blue-600 text-blue-600 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Queue Desk
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-4 border-b-2 transition cursor-pointer ${activeTab === 'services'
            ? 'border-slate-900 text-slate-900 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Services Management
        </button>

        <button
          onClick={() => setActiveTab('counters')}
          className={`pb-3 px-4 border-b-2 transition cursor-pointer ${activeTab === 'counters'
            ? 'border-slate-900 text-slate-900 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Counters & Desks
        </button>

        <button
          onClick={() => setActiveTab('identity')}
          className={`pb-3 px-4 border-b-2 transition cursor-pointer ${activeTab === 'identity'
            ? 'border-slate-900 text-slate-900 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Session Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'queue' && <QueueDesk />}

        {activeTab === 'services' && <ServicesManagement />}

        {activeTab === 'counters' && <CountersManagement />}

        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Clerk Authentication Identity</CardTitle>
                <CardDescription>
                  Verified operator session claims
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 text-xs text-slate-700">
                <p>
                  <strong>User ID:</strong>{' '}
                  <span className="font-mono text-slate-900">
                    {user?.id || '—'}
                  </span>
                </p>

                <p>
                  <strong>Email:</strong>{' '}
                  <span className="text-slate-900">
                    {user?.primaryEmailAddress?.emailAddress || '—'}
                  </span>
                </p>

                <p>
                  <strong>Name:</strong>{' '}
                  <span className="text-slate-900">
                    {user?.fullName || 'Operator'}
                  </span>
                </p>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
                    Public Metadata
                  </span>

                  <pre className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 overflow-x-auto">
                    {JSON.stringify(user?.publicMetadata, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
                <CardDescription>
                  Security verification status
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 font-semibold">
                  <span>✓</span>
                  <span>
                    Administrative Protected Route Access Granted
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Your authenticated session has been verified with role{' '}
                  <strong className="font-mono">ADMIN</strong>. You have
                  permissions to configure department services, open/close
                  counter sessions, and operate live queues.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}