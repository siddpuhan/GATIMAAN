import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '@gatimaan/shared';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { CitizenHeader } from './components/citizen/CitizenHeader.js';
import { CitizenFooter } from './components/citizen/CitizenFooter.js';
import { LandingPage } from './pages/LandingPage.js';
import { CitizenServicesPage } from './pages/CitizenServicesPage.js';
import { TicketTrackingPage } from './pages/TicketTrackingPage.js';
import { SignInPage } from './pages/SignInPage.js';
import { SignUpPage } from './pages/SignUpPage.js';
import { AdminShellPage } from './pages/AdminShellPage.js';
import { getActiveTicketId } from './lib/ticketStorage.js';

/**
 * Consolidated redirect for legacy / convenience routes (/dashboard, /track, /ticket).
 * If the citizen has an active queue pass on this device, takes them straight to the live pass.
 * Otherwise, gracefully leads them to the Service Catalogue to find a service and get a token.
 */
function ActiveTokenRedirect() {
  const activeId = getActiveTicketId();
  if (activeId) {
    return <Navigate to={`/ticket/${activeId}`} replace />;
  }
  return <Navigate to="/services" replace />;
}

export function App() {
  const location = useLocation();

  // Accessibility Controls: Font Scale and High Contrast Mode
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [highContrast, setHighContrast] = useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');

  const fontScaleClass =
    fontScale === 'sm' ? 'text-scale-sm' : fontScale === 'lg' ? 'text-scale-lg' : 'text-scale-md';

  return (
    <div
      className={`min-h-screen bg-[#D6CCC2] flex flex-col font-sans text-slate-900 antialiased ${fontScaleClass} ${
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
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 sm:px-6 lg:px-8 xl:px-10 border-b border-slate-800">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {/* State Emblem Slot */}
            <div
              className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0"
              title="State Emblem of Madhya Pradesh / मध्य प्रदेश शासन मुहर"
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

          {/* Accessibility Controls & Language */}
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

      {/* Tricolor Accent Line */}
      <div
        className="h-[2.5px] w-full bg-gradient-to-r from-amber-600 via-slate-200 to-emerald-700 shrink-0"
        aria-hidden="true"
      />

      {/* 3. Citizen navigation header (Phase U1 — reusable component) */}
      <CitizenHeader />

      {/* 4. Main Landmark Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 w-full focus:outline-none ${
          isAdminRoute
            ? 'max-w-none px-3 sm:px-5 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-5'
            : 'max-w-[1440px] mx-auto p-4 sm:p-6 lg:px-8 xl:px-10 lg:py-8'
        }`}
      >
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Citizen Service Catalogue */}
          <Route path="/services" element={<CitizenServicesPage />} />

          {/* Redundant Dashboard & Legacy Routes -> Consolidated Live Pass / Services Redirect */}
          <Route path="/dashboard" element={<ActiveTokenRedirect />} />
          <Route path="/track" element={<ActiveTokenRedirect />} />
          <Route path="/ticket" element={<ActiveTokenRedirect />} />

          {/* Specific Ticket Live-Status Pages */}
          <Route path="/ticket/:id" element={<TicketTrackingPage />} />
          <Route path="/tickets/:id" element={<TicketTrackingPage />} />

          {/* Clerk Auth Pages */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />

          {/* Admin / Operator Portal Shell with persistent sidebar & nested routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AdminShellPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* 5. Citizen footer (Phase U1 — reusable component, content preserved) */}
      <CitizenFooter />
    </div>
  );
}

export default App;
