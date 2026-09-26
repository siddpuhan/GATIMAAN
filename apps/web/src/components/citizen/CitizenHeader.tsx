import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { UserRole } from '@gatimaan/shared';
import { getActiveTicketId } from '../../lib/ticketStorage.js';

/**
 * GATIMAAN citizen header (Phase U1).
 *
 * Information architecture:
 *   Home · Services · Dashboard · [My Active Token when one exists]
 *   Admin Portal (authenticated ADMIN only) · Clerk user control
 *
 * The legacy "Track Token" destination is intentionally absent — tokens are
 * tracked automatically at /ticket/:id after issuance (Phase U4 will rebuild
 * that experience).
 *
 * Responsive strategy:
 *   - ≥768px: inline horizontal navigation.
 *   - <768px: single hamburger disclosure (existing project pattern) with
 *     generous, touch-friendly targets.
 */
export function CitizenHeader() {
  const { user } = useUser();
  const location = useLocation();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const rawRole = (user?.publicMetadata as { role?: string })?.role;
  const currentRole =
    rawRole?.toUpperCase() === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CUSTOMER;

  useEffect(() => {
    setActiveTicketId(getActiveTicketId());
    setMobileMenuOpen(false);
  }, [location]);

  const isActivePath = (path: string) => location.pathname === path;
  const isAdminRoute = location.pathname.startsWith('/admin');

  const linkBase = 'transition cursor-pointer';
  const linkIdle = `${linkBase} text-slate-600 hover:text-slate-900`;
  const linkActive = `${linkBase} text-slate-900 font-bold`;

  const desktopLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-2xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          {/* Mobile hamburger (existing project pattern, retained).
              Hidden on /admin routes where the admin shell has its own toggle. */}
          {!isAdminRoute && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="md:hidden p-2.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900"
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

          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-900 hover:text-slate-800 transition group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base font-black shadow-xs tracking-wider group-hover:bg-slate-800 transition">
              G
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black tracking-tight text-slate-900 leading-none">
                GATIMAAN
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5 hidden sm:block">
                MP Online Smart Citizen Queue
              </span>
            </div>
          </Link>

          {/* Desktop navigation — IA: Home / Services / Dashboard */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-5 text-xs font-semibold">
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

            {/* My Active Token — only while a live ticket exists on this device */}
            {activeTicketId && (
              <Link
                to={`/ticket/${activeTicketId}`}
                aria-current={location.pathname.startsWith('/ticket/') ? 'page' : undefined}
                className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 hover:bg-slate-200 transition inline-flex items-center gap-1.5 font-bold"
              >
                <LiveDot />
                <span>My Active Token</span>
              </Link>
            )}

            {/* Admin Portal — authenticated ADMIN only */}
            {currentRole === UserRole.ADMIN && (
              <SignedIn>
                <Link
                  to="/admin"
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    isAdminRoute
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>Admin Portal</span>
                </Link>
              </SignedIn>
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
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
          </SignedOut>
        </div>
      </div>

      {/* Mobile navigation panel */}
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
              className={`block px-3 py-2.5 rounded-lg transition ${
                isActivePath(item.to)
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {activeTicketId && (
            <Link
              to={`/ticket/${activeTicketId}`}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg bg-slate-900 text-white font-bold transition"
            >
              <span className="inline-flex items-center gap-2">
                <LiveDot onDark />
                My Active Token
              </span>
            </Link>
          )}

          {currentRole === UserRole.ADMIN && (
            <SignedIn>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg bg-slate-100 text-slate-900 font-bold border border-slate-200 transition"
              >
                Admin Portal
              </Link>
            </SignedIn>
          )}
        </nav>
      )}
    </header>
  );
}

/** Small pulsing availability dot used on the Active Token entry. */
function LiveDot({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full ${onDark ? 'bg-emerald-400' : 'bg-emerald-600'} animate-citizen-pulse`}
      aria-hidden="true"
    />
  );
}
