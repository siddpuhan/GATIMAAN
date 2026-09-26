import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { getActiveTicketId } from '../../lib/ticketStorage.js';

/**
 * GATIMAAN Citizen Header.
 *
 * Information architecture (Citizen-First):
 *   [Brand Mark + Wordmark] · Home · Services · Dashboard · [My Active Token] · [User Control]
 *
 * Note: Administrative entry points are strictly isolated to the protected /admin
 * URL and never displayed in citizen navigation.
 */
export function CitizenHeader() {
  const location = useLocation();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setActiveTicketId(getActiveTicketId());
    setMobileMenuOpen(false);
  }, [location]);

  const isActivePath = (path: string) => location.pathname === path;
  const isAdminRoute = location.pathname.startsWith('/admin');

  const linkBase = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer';
  const linkIdle = `${linkBase} text-slate-700 hover:text-slate-950 hover:bg-slate-100/70`;
  const linkActive = `${linkBase} text-slate-950 font-bold bg-slate-100 shadow-2xs`;

  const desktopLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
  ];

  return (
    <header className="bg-white border-b border-[#C5B9AC]/70 py-3 sm:py-3.5 px-4 sm:px-6 lg:px-8 xl:px-10 shadow-2xs sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 h-10 sm:h-11">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          {/* Mobile hamburger disclosure */}
          {!isAdminRoute && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="citizen-mobile-nav"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Redesigned Civic-Tech Brand Mark & Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-3 text-slate-900 hover:opacity-95 transition group shrink-0"
            aria-label="GATIMAAN Home"
          >
            {/* Dynamic Civic Queue Logo Mark */}
            <div className="w-9 h-9 rounded-xl bg-[#0B1730] flex items-center justify-center shadow-xs group-hover:bg-[#162544] transition-colors shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-transform group-hover:scale-105"
                aria-hidden="true"
              >
                {/* Outer queue track forming stylized G */}
                <path
                  d="M23 10.5C21.2 8.3 18.5 7 15.5 7C9.7 7 5 11.7 5 17.5C5 23.3 9.7 28 15.5 28C20.8 28 25.1 24.1 25.8 19H15.5"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Active citizen dispatch node */}
                <circle cx="24.5" cy="9.5" r="2.8" fill="#0E8F6E" />
              </svg>
            </div>

            {/* Wordmark & Subtitle */}
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-950 leading-none">
                GATIMAAN
              </span>
              <span className="text-[9.5px] sm:text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1 leading-none hidden sm:block">
                MP Online Smart Citizen Queue
              </span>
            </div>
          </Link>

          {/* Desktop navigation — Citizen IA: Home · Services · My Active Token */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-2">
            {desktopLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActivePath(item.to) ? 'page' : undefined}
                className={isActivePath(item.to) ? linkActive : linkIdle}
              >
                {item.label}
              </Link>
            ))}

            {/* My Active Token navigation */}
            {activeTicketId ? (
              <Link
                to={`/ticket/${activeTicketId}`}
                aria-current={location.pathname.startsWith('/ticket') ? 'page' : undefined}
                className="ml-1 px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-300/80 hover:bg-emerald-100 transition inline-flex items-center gap-2 text-xs font-bold shadow-2xs"
              >
                <LiveDot />
                <span>My Active Token</span>
              </Link>
            ) : (
              <Link
                to="/services"
                aria-current={location.pathname.startsWith('/ticket') ? 'page' : undefined}
                className={location.pathname.startsWith('/ticket') ? linkActive : linkIdle}
              >
                My Active Token
              </Link>
            )}
          </nav>
        </div>

        {/* User control */}
        <div className="flex items-center gap-3 shrink-0">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link
              to="/sign-in"
              className="px-3.5 py-1.5 bg-[#0B1730] hover:bg-[#162544] text-white rounded-lg text-xs font-semibold transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0B1730] focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          </SignedOut>
        </div>
      </div>

      {/* Mobile navigation panel (Citizen-only) */}
      {mobileMenuOpen && (
        <nav
          id="citizen-mobile-nav"
          aria-label="Primary mobile"
          className="md:hidden pt-3 pb-2 px-2 mt-3 border-t border-slate-100 space-y-1 text-sm font-semibold animate-fade-in"
        >
          {desktopLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isActivePath(item.to) ? 'page' : undefined}
              className={`block px-3 py-2 rounded-lg transition ${
                isActivePath(item.to)
                  ? 'bg-slate-100 text-slate-950 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Mobile My Active Token link */}
          <Link
            to={activeTicketId ? `/ticket/${activeTicketId}` : '/services'}
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg font-bold transition ${
              activeTicketId
                ? 'bg-[#0B1730] text-white mt-2'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {activeTicketId && <LiveDot onDark />}
              My Active Token
            </span>
          </Link>
        </nav>
      )}
    </header>
  );
}

/** Small pulsing availability dot used on the Active Token badge. */
function LiveDot({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full ${onDark ? 'bg-emerald-400' : 'bg-emerald-600'} animate-citizen-pulse`}
      aria-hidden="true"
    />
  );
}

