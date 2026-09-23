import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { GATIMAAN_VERSION, UserRole } from '@gatimaan/shared';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { CustomerPortalPage } from './pages/CustomerPortalPage.js';
import { TicketTrackingPage } from './pages/TicketTrackingPage.js';
import { SignInPage } from './pages/SignInPage.js';
import { SignUpPage } from './pages/SignUpPage.js';
import { AdminShellPage } from './pages/AdminShellPage.js';
import { getActiveTicketId } from './lib/ticketStorage.js';

export function App() {
  const { user } = useUser();
  const location = useLocation();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const currentRole =
    rawRole?.toUpperCase() === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;

  useEffect(() => {
    setActiveTicketId(getActiveTicketId());
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Global Citizen Header */}
      <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 shadow-2xs sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-black tracking-tight text-blue-600 hover:text-blue-700 transition"
            >
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-xs">
                G
              </span>
              <span>GATIMAAN</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold text-gray-600">
              <Link
                to="/"
                className={`transition hover:text-blue-600 ${
                  location.pathname === '/' || location.pathname === '/services'
                    ? 'text-blue-600'
                    : ''
                }`}
              >
                Citizen Portal
              </Link>

              {activeTicketId && (
                <Link
                  to={`/ticket/${activeTicketId}`}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition inline-flex items-center gap-1.5 font-bold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>My Active Pass</span>
                </Link>
              )}

              {currentRole === UserRole.ADMIN && (
                <SignedIn>
                  <Link
                    to="/admin"
                    className="hover:text-purple-600 text-purple-700 transition font-bold"
                  >
                    Admin Shell
                  </Link>
                </SignedIn>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              v{GATIMAAN_VERSION}
            </span>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <Routes>
          <Route path="/" element={<CustomerPortalPage />} />
          <Route path="/services" element={<CustomerPortalPage />} />
          <Route path="/ticket/:id" element={<TicketTrackingPage />} />
          <Route path="/tickets/:id" element={<TicketTrackingPage />} />
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

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500 bg-white">
        GATIMAAN - MP Online Smart Queue Management (IA-15 Hackathon)
      </footer>
    </div>
  );
}

export default App;
