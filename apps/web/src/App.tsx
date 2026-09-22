import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { GATIMAAN_VERSION, UserRole } from '@gatimaan/shared';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { SignInPage } from './pages/SignInPage.js';
import { SignUpPage } from './pages/SignUpPage.js';
import { AdminShellPage } from './pages/AdminShellPage.js';

function HomePage() {
  const { user } = useUser();
  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const currentRole =
    rawRole?.toUpperCase() === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome to GATIMAAN</h2>
        <p className="text-gray-600 mb-4">
          IoT-enabled Smart Queue Management System for MP Online.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Online (v{GATIMAAN_VERSION})
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
            Clerk Authentication & RBAC Active
          </div>
        </div>
      </div>

      <SignedIn>
        <div className="p-6 bg-blue-50/50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Your Session Info</h3>
          <p className="text-xs text-blue-700 mb-3">
            Logged in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong> (Role:{' '}
            <span className="font-mono font-bold">{currentRole}</span>)
          </p>
          <div className="flex gap-3">
            {currentRole === UserRole.ADMIN && (
              <Link
                to="/admin"
                className="px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition"
              >
                Go to Admin Control Center
              </Link>
            )}
          </div>
        </div>
      </SignedIn>
    </div>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 py-3.5 px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-xl font-bold tracking-tight text-blue-600 hover:text-blue-700"
            >
              GATIMAAN
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-600">
              <Link to="/" className="hover:text-blue-600 transition">
                Home
              </Link>
              <SignedIn>
                <Link to="/admin" className="hover:text-purple-600 transition">
                  Admin Shell
                </Link>
              </SignedIn>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
              v{GATIMAAN_VERSION}
            </span>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition shadow-sm"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminShellPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500 bg-white">
        GATIMAAN - MP Online IA-15 Hackathon (Smart Queue Management)
      </footer>
    </div>
  );
}

export default App;
