import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, TicketDTO, ServiceUpdatedPayload } from '@gatimaan/shared';
import { ServiceGrid } from '../components/customer/ServiceGrid.js';
import { ActiveTicketBanner } from '../components/customer/ActiveTicketBanner.js';
import { useServicesSubscription } from '../hooks/useRealtime.js';
import { AlertBanner } from '../components/ui/FeedbackStates.js';
import { Button } from '../components/ui/Button.js';
import {
  getActiveTicketId,
  setActiveTicketId,
  clearActiveTicketId,
  isActiveStatus,
} from '../lib/ticketStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CitizenServicesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSignedIn, getToken } = useAuth();

  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [activeTicket, setActiveTicket] = useState<TicketDTO | null>(null);
  const [isCheckingActiveTicket, setIsCheckingActiveTicket] = useState(true);

  // Modal and issuance state
  const [selectedServiceForConfirmation, setSelectedServiceForConfirmation] = useState<ServiceDTO | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

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

  // Handle URL query parameter serviceId for returning authenticated users
  useEffect(() => {
    const serviceIdParam = searchParams.get('serviceId');
    if (serviceIdParam && services.length > 0) {
      const matched = services.find((s) => s.id === serviceIdParam);
      if (matched && isSignedIn) {
        setSelectedServiceForConfirmation(matched);
      }
    }
  }, [searchParams, services, isSignedIn]);

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

  // 3. Initiate ticket issuance (auth check + confirmation modal)
  const handleInitiateIssueTicket = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    if (!isSignedIn) {
      // Preserve return URL with serviceId param for seamless return
      const redirectUrl = `/services?serviceId=${encodeURIComponent(serviceId)}`;
      navigate(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Citizen is authenticated: open confirmation dialog
    setIssueError(null);
    setSelectedServiceForConfirmation(service);
  };

  // 4. Cancel confirmation dialog
  const handleCloseConfirmation = () => {
    setSelectedServiceForConfirmation(null);
    setIssueError(null);
    if (searchParams.has('serviceId')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('serviceId');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // 5. Confirm and execute ticket issuance
  const handleConfirmIssueTicket = async () => {
    if (!selectedServiceForConfirmation) return;

    try {
      setIsIssuing(true);
      setIssueError(null);

      // Require Clerk token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      const res = await fetch(`${API_BASE}/api/tickets/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedServiceForConfirmation.id,
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

      // Clean up search params
      if (searchParams.has('serviceId')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('serviceId');
        setSearchParams(nextParams, { replace: true });
      }

      setSelectedServiceForConfirmation(null);

      // Instant navigate to live ticket tracking pass with seeded state
      navigate(`/ticket/${createdTicket.id}`, {
        state: { initialTicket: createdTicket },
      });
    } catch (err: unknown) {
      setIssueError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="w-full space-y-8 sm:space-y-10">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
        <Link to="/" className="hover:text-slate-900 transition">
          Home
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-900">Services Catalogue</span>
      </div>

      {/* Active Ticket Banner (if user already has a live pass) */}
      {!isCheckingActiveTicket && activeTicket && (
        <ActiveTicketBanner
          ticket={activeTicket}
          onDismiss={() => setActiveTicket(null)}
        />
      )}

      {/* Government Explainer & 3-Step Journey (Wide Banner) */}
      <section className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-slate-800 space-y-6">
        <div className="max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            MP Online Citizen Facilitation
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Department Citizen Services & Digital Token Issuance
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            Select your required public department service below to generate an instant digital queue
            token. Your token will be registered in the live center dispatch system with an estimated
            wait time and counter assignment.
          </p>
        </div>

        {/* 3-Step Journey */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="flex items-start gap-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs border border-slate-600">
              1
            </span>
            <div>
              <strong className="text-slate-100 block text-xs font-bold">Choose Service</strong>
              <span className="text-slate-400 text-[11px] mt-0.5 block">
                Select your department service below
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs border border-slate-600">
              2
            </span>
            <div>
              <strong className="text-slate-100 block text-xs font-bold">Sign In & Confirm</strong>
              <span className="text-slate-400 text-[11px] mt-0.5 block">
                Verify details & issue your digital token
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="w-7 h-7 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-xs border border-slate-600">
              3
            </span>
            <div>
              <strong className="text-slate-100 block text-xs font-bold">Track & Get Called</strong>
              <span className="text-slate-400 text-[11px] mt-0.5 block">
                Live queue position & desk summon alert
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Standalone Ticket Issuance Error Alert (if outside modal) */}
      {issueError && !selectedServiceForConfirmation && (
        <AlertBanner
          type="error"
          title="Token Issuance Failed"
          message={issueError}
          onClose={() => setIssueError(null)}
        />
      )}

      {/* Services Catalog Grid (3-column wide desktop layout) */}
      <section className="space-y-4">
        <ServiceGrid
          services={services}
          isLoading={isLoadingServices}
          error={servicesError}
          issuingServiceId={isIssuing ? selectedServiceForConfirmation?.id || null : null}
          onIssueTicket={handleInitiateIssueTicket}
          onRetry={fetchServices}
        />
      </section>

      {/* Citizen Facilitation Information */}
      <section className="pt-2">
        <div className="bg-white border border-[#B8AEA4] rounded-2xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200">
            <h2 className="text-lg sm:text-xl font-bold text-[#0B1220] tracking-tight">
              Citizen Guidelines & Instructions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-normal mt-0.5">
              Important requirements for citizen facilitation at MP Online facilitation centers
            </p>
          </div>

          {/* Guideline Items */}
          <div className="divide-y divide-slate-200">
            {/* 1. Keep Original Documents Ready */}
            <div className="p-5 sm:p-6 flex items-start gap-4">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F8FAFC] border border-slate-300 text-[#0B1220] font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-2xs"
                aria-hidden="true"
              >
                1
              </div>
              <div className="max-w-4xl space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#0B1220]">
                  Keep Original Documents Ready:
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                  Please have your original Aadhaar card, supporting identity documents, and application reference numbers available before your token is summoned.
                </p>
              </div>
            </div>

            {/* 2. Desk Summoning & Callouts */}
            <div className="p-5 sm:p-6 flex items-start gap-4">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F8FAFC] border border-slate-300 text-[#0B1220] font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-2xs"
                aria-hidden="true"
              >
                2
              </div>
              <div className="max-w-4xl space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#0B1220]">
                  Desk Summoning & Callouts:
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                  When your token is called, your pass will display the assigned counter number. Please proceed promptly to the designated desk.
                </p>
              </div>
            </div>

            {/* 3. Need Assistance? */}
            <div className="p-5 sm:p-6 flex items-start gap-4">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F8FAFC] border border-slate-300 text-[#0B1220] font-bold flex items-center justify-center shrink-0 text-xs sm:text-sm shadow-2xs"
                aria-hidden="true"
              >
                3
              </div>
              <div className="max-w-4xl space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#0B1220]">
                  Need Assistance?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                  Visit the center reception desk or contact the toll-free citizen helpline at <strong className="font-semibold text-slate-900">1800-233-0194</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Generation Confirmation Modal */}
      {selectedServiceForConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#B8AEA4] shadow-2xl p-6 sm:p-7 space-y-5 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B1730] text-white flex items-center justify-center text-lg font-bold shrink-0">
                  🏛️
                </div>
                <div>
                  <h3 id="modal-title" className="text-lg font-black text-[#0B1730] tracking-tight">
                    Confirm Queue Token
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review service details before issuing your queue pass
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseConfirmation}
                disabled={isIssuing}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-sm transition cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Service Summary Card */}
            <div className="bg-[#F8FAFC] border border-[#B8AEA4]/80 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-[#0B1730]">
                  {selectedServiceForConfirmation.name}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[#0B1220] text-white border border-[#0B1220]">
                  {selectedServiceForConfirmation.code}
                </span>
              </div>

              {selectedServiceForConfirmation.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedServiceForConfirmation.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Est. Duration
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    ~{selectedServiceForConfirmation.avgDurationMinutes} mins
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Queue Status
                  </span>
                  <span className="font-bold text-emerald-700 text-xs mt-0.5 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Open & Active
                  </span>
                </div>
              </div>
            </div>

            {/* Explainer Note */}
            <p className="text-xs text-slate-600 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl leading-relaxed">
              <strong>Please Note:</strong> Confirming will register your position in the live dispatch queue. You will receive real-time updates on your phone as counters advance.
            </p>

            {/* Error inside modal if issuance failed */}
            {issueError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <strong>Error:</strong> {issueError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseConfirmation}
                disabled={isIssuing}
                className="cursor-pointer text-xs px-4 py-2 border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmIssueTicket}
                disabled={isIssuing}
                className="cursor-pointer text-xs font-bold px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-2"
              >
                {isIssuing ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Issuing Token...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Issue Token</span>
                    <span>→</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
