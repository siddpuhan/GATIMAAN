import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ServicesManagement } from '../components/admin/ServicesManagement.js';
import { CountersManagement } from '../components/admin/CountersManagement.js';
import { QueueDesk } from '../components/admin/QueueDesk.js';

export function AdminShellPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'queue' | 'services' | 'counters'>('queue');

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Admin Control Center</h2>
          <p className="text-xs text-gray-500">
            Citizen Service Center Operations • Operator: {user?.primaryEmailAddress?.emailAddress || 'Admin'}
          </p>
        </div>
        <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
          ADMIN AUTHORIZED
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2.5 px-4 -mb-px border-b-2 transition ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Queue Desk
        </button>
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
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'queue' && <QueueDesk />}
        {activeTab === 'services' && <ServicesManagement />}
        {activeTab === 'counters' && <CountersManagement />}
      </div>
    </div>
  );
}

