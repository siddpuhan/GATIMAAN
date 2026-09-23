import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, TicketDTO } from '@gatimaan/shared';
import { ServiceGrid } from '../components/customer/ServiceGrid.js';
import { ActiveTicketBanner } from '../components/customer/ActiveTicketBanner.js';
import {
  getActiveTicketId,
  setActiveTicketId,
  clearActiveTicketId,
  isActiveStatus,
} from '../lib/ticketStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CustomerPortalPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [activeTicket, setActiveTicket] = useState<TicketDTO | null>(null);
  const [isCheckingActiveTicket, setIsCheckingActiveTicket] = useState(true);
  const [issuingServiceId, setIssuingServiceId] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  // 1. Fetch available services
  const fetchServices = useCallback(async () => {
    try {
      setIsLoadingServices(true);
      setServicesError(null);
      const res = await fetch(`${API_BASE}/api/services`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Unable to retrieve available services');
      }
      const data: ServiceDTO[] = await res.json();
      setServices(data);
    } catch (err: unknown) {
      setServicesError(err instanceof Error ? err.message : 'Error fetching services');
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // 2. Check for an active ticket in local storage
  const checkActiveTicket = useCallback(async () => {
    const storedId = getActiveTicketId();
    if (!storedId) {
      setIsCheckingActiveTicket(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${storedId}`);
      if (res.ok) {
        const ticketData: TicketDTO = await res.json();
        if (isActiveStatus(ticketData.status)) {
          setActiveTicket(ticketData);
        } else {
          clearActiveTicketId();
          setActiveTicket(null);
        }
      } else {
        clearActiveTicketId();
        setActiveTicket(null);
      }
    } catch {
      // Offline / network failure: retain stored ticket ID for later retry
    } finally {
      setIsCheckingActiveTicket(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    checkActiveTicket();
  }, [fetchServices, checkActiveTicket]);

  // 3. Issue a digital queue ticket
  const handleIssueTicket = async (serviceId: string) => {
    try {
      setIssuingServiceId(serviceId);
      setIssueError(null);

      // Include Clerk token if citizen is signed in
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/tickets/issue`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceId,
          priority: 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to issue ticket. Please try again.');
      }

      const createdTicket: TicketDTO = await res.json();

      // Persist active ticket ID for recovery across reloads
      setActiveTicketId(createdTicket.id);

      // Instant navigate to live ticket tracking pass with seeded state
      navigate(`/ticket/${createdTicket.id}`, {
        state: { initialTicket: createdTicket },
      });
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setIssuingServiceId(null);
    }
  };

  // 4. Handle manual ticket lookup
  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = lookupId.trim();
    if (!cleanId) {
      setLookupError('Please enter a valid ticket ID');
      return;
    }
    navigate(`/ticket/${cleanId}`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Active Ticket Banner (if user already has a live pass) */}
      {!isCheckingActiveTicket && activeTicket && (
        <ActiveTicketBanner
          ticket={activeTicket}
          onDismiss={() => setActiveTicket(null)}
        />
      )}

      {/* Hero Welcome Banner */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-32 -top-12 w-48 h-48 rounded-full bg-blue-500/10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            MP Online Smart Queue Management
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Skip the physical line. Track your queue live.
          </h1>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Generate an instant digital token for government citizen services. Receive live position
            updates, estimated wait times, and direct desk notifications on your mobile device.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Instant Digital Pass
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Real-time Position Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No App Install Required
            </span>
          </div>
        </div>
      </section>

      {/* Ticket Issuance Error Alert */}
      {issueError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center justify-between gap-3">
          <span>{issueError}</span>
          <button
            type="button"
            onClick={() => setIssueError(null)}
            className="text-red-600 font-bold hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Services Catalog Grid */}
      <section className="space-y-4">
        <ServiceGrid
          services={services}
          isLoading={isLoadingServices}
          error={servicesError}
          issuingServiceId={issuingServiceId}
          onIssueTicket={handleIssueTicket}
          onRetry={fetchServices}
        />
      </section>

      {/* Quick Lookup & How It Works Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Ticket Lookup Box */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Already Have a Token?</h3>
          <p className="text-xs text-gray-500">
            Enter your Ticket ID to open your live pass on this device.
          </p>
          <form onSubmit={handleLookupSubmit} className="space-y-2">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => {
                setLookupId(e.target.value);
                setLookupError(null);
              }}
              placeholder="Paste Ticket ID..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {lookupError && (
              <p className="text-[11px] text-red-600 font-medium">{lookupError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition"
            >
              Track Token →
            </button>
          </form>
        </div>

        {/* How It Works Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h4 className="text-sm font-bold text-gray-900">Choose Service & Token</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Select your required MP Online service above. Your digital ticket number is generated instantly.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600">Pure Digital Queue</span>
        </div>

        {/* How It Works Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2 flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h4 className="text-sm font-bold text-gray-900">Live Call to Counter</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Relax in the lounge. When your number is called, your pass flashes your assigned counter number.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600">Realtime Notifications</span>
        </div>
      </section>
    </div>
  );
}
