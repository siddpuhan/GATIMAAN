import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';
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

  // Accessibility Controls: Font Scale and High Contrast Mode
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState(false);

  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const currentRole =
    rawRole?.toUpperCase() === UserRole.ADMIN
      ? UserRole.ADMIN
      : rawRole?.toUpperCase() === UserRole.OPERATOR
      ? UserRole.OPERATOR
      : UserRole.CUSTOMER;

  useEffect(() => {
    setActiveTicketId(getActiveTicketId());
  }, [location]);

  const isAdminRoute = location.pathname.startsWith('/admin');

  const fontScaleClass =
    fontScale === 'sm' ? 'text-scale-sm' : fontScale === 'lg' ? 'text-scale-lg' : 'text-scale-md';

  return (
    <div
      className={`min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased ${fontScaleClass} ${
        highContrast ? 'theme-high-contrast' : ''
      }`}
    >
      {/* 1. Skip to Main Content Link (Keyboard & Screen-Reader Accessible) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-950 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-bold text-xs"
      >
        Skip to main content / मुख्य सामग्री पर जाएं
      </a>

      {/* 2. Top Government of Madhya Pradesh Identity Strip */}
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {/* Emblem Slot Placeholder (Reserved for State Seal) */}
            <div
              className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0"
              title="State Emblem of Madhya Pradesh / मध्य प्रदेश शासन मुहर (Reserved Slot)"
              aria-label="State Emblem of Madhya Pradesh Slot"
            >
              <span className="font-serif">🏛️</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-100 text-[11px] sm:text-xs">
                Government of Madhya Pradesh · मध्य प्रदेश शासन
              </span>
              <span className="text-[10px] text-slate-400">
                Public Service Management Department · लोक सेवा प्रबंधन विभाग
              </span>
            </div>
          </div>

          {/* Accessibility Controls & Language Toggle */}
          <div className="flex items-center gap-3 self-end sm:self-auto text-slate-300 text-[11px]">
            {/* Font Size Scaling */}
            <div
              className="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5"
              role="group"
              aria-label="Text Size Controls"
            >
              <button
                type="button"
                onClick={() => setFontScale('sm')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  fontScale === 'sm' ? 'bg-slate-700 text-white' : 'hover:text-white text-slate-300'
                }`}
                aria-label="Decrease text size (A-)"
                title="Decrease font size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontScale('md')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  fontScale === 'md' ? 'bg-slate-700 text-white' : 'hover:text-white text-slate-300'
                }`}
                aria-label="Standard text size (A)"
                title="Standard font size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontScale('lg')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  fontScale === 'lg' ? 'bg-slate-700 text-white' : 'hover:text-white text-slate-300'
                }`}
                aria-label="Increase text size (A+)"
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* High Contrast Mode Toggle */}
            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-[10px] font-semibold transition cursor-pointer hover:text-white ${
                highContrast ? 'bg-slate-700 text-amber-300 border-amber-400/40' : 'text-slate-300'
              }`}
              aria-label="Toggle high contrast display mode"
              title="Toggle high contrast mode"
            >
              {highContrast ? 'Standard Contrast' : 'High Contrast'}
            </button>

            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="font-semibold text-slate-300">English / हिंदी</span>
          </div>
        </div>
      </div>

      {/* Thin 2.5px Tricolor Accent Line */}
      <div
        className="h-[2.5px] w-full bg-gradient-to-r from-amber-600 via-slate-200 to-emerald-700 shrink-0"
        aria-hidden="true"
      />

      {/* 3. Official GATIMAAN App Navigation Header */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-2xs sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 text-slate-900 hover:text-slate-800 transition group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base font-black shadow-xs tracking-wider group-hover:bg-slate-800 transition">
                G
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-slate-900 leading-none">
                  GATIMAAN
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                  MP Online Smart Citizen Queue
                </span>
              </div>
            </Link>

            {/* Navigation: Context-aware citizen links */}
            <nav className="hidden sm:flex items-center gap-5 text-xs font-semibold text-slate-600">
              <Link
                to="/"
                className={`transition hover:text-slate-900 ${
                  location.pathname === '/' || location.pathname === '/services'
                    ? 'text-slate-900 font-bold'
                    : ''
                }`}
              >
                Services Catalog
              </Link>

              {activeTicketId && (
                <Link
                  to={`/ticket/${activeTicketId}`}
                  className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 hover:bg-slate-200 transition inline-flex items-center gap-1.5 font-bold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>My Active Token</span>
                </Link>
              )}

              {/* Admin / Operator Portal Entry */}
              {(currentRole === UserRole.ADMIN || currentRole === UserRole.OPERATOR) && (
                <SignedIn>
                  <Link
                    to={currentRole === UserRole.OPERATOR ? '/admin/queue' : '/admin'}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition inline-flex items-center gap-1.5 ${
                      isAdminRoute
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{currentRole === UserRole.OPERATOR ? 'Queue Desk' : 'Admin Portal'}</span>
                  </Link>
                </SignedIn>
              )}
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link
                to="/sign-in"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* 4. Main Landmark Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className={
          isAdminRoute
            ? 'flex-1 flex flex-col w-full min-w-0 focus:outline-none'
            : 'flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:py-8 focus:outline-none'
        }
      >
        <Routes>
          <Route path="/" element={<CustomerPortalPage />} />
          <Route path="/services" element={<CustomerPortalPage />} />
          <Route path="/ticket/:id" element={<TicketTrackingPage />} />
          <Route path="/tickets/:id" element={<TicketTrackingPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.OPERATOR]}>
                <AdminShellPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* 5. Standard Official Government Service Footer (Citizen / Public Portal Only) */}
      {!isAdminRoute && (
        <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 text-xs text-slate-600 mt-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Official Digital Service</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  This is the official digital citizen facilitation queue management service (GATIMAAN),
                  operated under MP Online for transparent, real-time citizen service delivery.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Citizen Helpline & Support</h4>
                <ul className="text-slate-500 text-[11px] space-y-1">
                  <li>Toll Free Citizen Helpline: 1800-233-0194</li>
                  <li>Email Support: support.gatimaan@mponline.gov.in</li>
                  <li>Operational Hours: Monday – Saturday (9:00 AM – 6:00 PM IST)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">Department & Content Ownership</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Content owned and maintained by Public Service Management Department, Government of Madhya Pradesh.
                </p>
                <p className="text-slate-400 text-[10px] mt-1.5">
                  Last Updated: 25 September 2026
                </p>
              </div>
            </div>

            {/* Standard Government Policy Links Row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-500 pt-1">
              <span className="hover:text-slate-800 cursor-pointer">Terms of Use</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 cursor-pointer">Hyperlinking Policy</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 cursor-pointer">Accessibility Statement</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 cursor-pointer">Sitemap</span>
              <span className="text-slate-300">•</span>
              <span className="hover:text-slate-800 cursor-pointer">Help & Grievances</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px] pt-2 border-t border-slate-100">
              <p>© {new Date().getFullYear()} Government of Madhya Pradesh. All rights reserved.</p>
              <p className="text-slate-400 font-mono text-[10px]">
                GATIMAAN MP Online Queue Management System
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
