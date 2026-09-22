import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ServicesManagement } from '../components/admin/ServicesManagement.js';
import { CountersManagement } from '../components/admin/CountersManagement.js';

export function AdminShellPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'services' | 'counters' | 'identity'>('services');

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Admin Control Center</h2>
          <p className="text-xs text-gray-500">
            Authenticated administrator session active (Role: ADMIN)
          </p>
        </div>
        <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
          ADMIN AUTHORIZED
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-2.5 px-4 -mb-px border-b-2 transition ${
            activeTab === 'services'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Services Management
        </button>
        <button
          onClick={() => setActiveTab('counters')}
          className={`pb-2.5 px-4 -mb-px border-b-2 transition ${
            activeTab === 'counters'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Counters & Desks
        </button>
        <button
          onClick={() => setActiveTab('identity')}
          className={`pb-2.5 px-4 -mb-px border-b-2 transition ${
            activeTab === 'identity'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Session Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'services' && <ServicesManagement />}
        {activeTab === 'counters' && <CountersManagement />}
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Clerk Identity</h4>
              <p className="text-xs text-gray-600">
                <strong>User ID:</strong> {user?.id}
              </p>
              <p className="text-xs text-gray-600">
                <strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-xs text-gray-600">
                <strong>Public Metadata:</strong> {JSON.stringify(user?.publicMetadata)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">RBAC Status</h4>
              <p className="text-xs text-green-700 font-medium">
                ✓ Protected route verification passed
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Full analytics & monitoring will be implemented in later phases.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

