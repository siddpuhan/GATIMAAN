import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { GATIMAAN_VERSION } from '@gatimaan/shared';

function HomePage() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to GATIMAAN</h2>
      <p className="text-gray-600 mb-4">IoT-enabled Smart Queue Management System for MP Online.</p>
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Phase 1 Foundation Active (v{GATIMAAN_VERSION})
      </div>
    </div>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-blue-600 hover:text-blue-700"
          >
            GATIMAAN
          </Link>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
            v{GATIMAAN_VERSION}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500 bg-white">
        GATIMAAN - MP Online IA-15 Hackathon
      </footer>
    </div>
  );
}

export default App;
