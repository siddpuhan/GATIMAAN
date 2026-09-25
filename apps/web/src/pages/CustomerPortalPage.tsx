import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, TicketDTO, ServiceUpdatedPayload } from '@gatimaan/shared';
import { ServiceGrid } from '../components/customer/ServiceGrid.js';
import { ActiveTicketBanner } from '../components/customer/ActiveTicketBanner.js';
import { useServicesSubscription } from '../hooks/useRealtime.js';
import { AlertBanner } from '../components/ui/FeedbackStates.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
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
        const data = await res.json().catch(() => ({}));
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

  // Realtime Service Catalog Subscription (instant reflection when admin creates/edits/toggles services)
  const handleServiceUpdated = useCallback((payload: ServiceUpdatedPayload) => {
    if (!payload?.service) return;
    setServices((prev) => {
      const updated = payload.service;
      const exists = prev.some((s) => s.id === updated.id);

      if (!updated.isActive) {
        return prev.filter((s) => s.id !== updated.id);
      }

      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }

      return [...prev, updated].sort(
        (a, b) => a.priority - b.priority || a.code.localeCompare(b.code)
      );
    });
  }, []);

  useServicesSubscription(handleServiceUpdated);

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to issue token. Please try again.');
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
      setLookupError('Please enter a valid Token ID or Token Number');
      return;
    }
    navigate(`/ticket/${cleanId}`);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Active Ticket Banner (if user already has a live pass) */}
      {!isCheckingActiveTicket && activeTicket && (
        <ActiveTicketBanner
          ticket={activeTicket}
          onDismiss={() => setActiveTicket(null)}
        />
      )}

      {/* Calm, Trustworthy Government Explainer & 3-Step Journey */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 space-y-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MP Online Citizen Facilitation
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
            Digital Queue Token & Live Counter Dispatch
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Generate an instant queue token for government citizen services, monitor your live waiting
            position in real-time, and proceed directly to your assigned service desk when summoned.
          </p>
        </div>

        {/* 3-Step Journey */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-start gap-3 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <strong className="text-slate-100 block text-xs">Choose Service</strong>
              <span className="text-slate-400 text-[11px]">Select your department service below</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <strong className="text-slate-100 block text-xs">Get Digital Token</strong>
              <span className="text-slate-400 text-[11px]">Instant pass with wait estimate</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <strong className="text-slate-100 block text-xs">Track & Get Called</strong>
              <span className="text-slate-400 text-[11px]">Live alert when desk is ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ticket Issuance Error Alert */}
      {issueError && (
        <AlertBanner
          type="error"
          title="Token Issuance Failed"
          message={issueError}
          onClose={() => setIssueError(null)}
        />
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

      {/* Quick Lookup & Citizen Information Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Token Lookup Box */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Track Existing Token</CardTitle>
            <CardDescription>
              Enter your Token Number (e.g. DOM001) or Token ID to view live waiting status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookupSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={lookupId}
                  onChange={(e) => {
                    setLookupId(e.target.value);
                    setLookupError(null);
                  }}
                  placeholder="e.g. DOM001 or Token ID..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono uppercase"
                />
                {lookupError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{lookupError}</p>
                )}
              </div>
              <Button type="submit" variant="primary" size="md" fullWidth>
                <span>Track Token</span>
                <span>→</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Citizen Facilitation Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Citizen Guidelines & Information</CardTitle>
            <CardDescription>
              Important requirements for citizen facilitation at MP Online centers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                •
              </span>
              <p>
                <strong>Keep Documents Ready:</strong> Please have your original Aadhaar card,
                supporting identity proofs, and application reference numbers available before your
                token is called.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                •
              </span>
              <p>
                <strong>Desk Summoning:</strong> When your token is called, your pass will display the
                assigned counter number. Please proceed promptly to the designated desk.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                •
              </span>
              <p>
                <strong>Need Assistance?</strong> Visit the center reception desk or contact the toll-free
                citizen helpline at <strong>1800-233-0194</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
