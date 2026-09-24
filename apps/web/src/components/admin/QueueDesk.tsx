import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  CounterWithSessionDTO,
  ServiceDTO,
  TicketDTO,
  TicketStatus,
  DemandLevel,
  QueueUpdatedPayload,
  TicketUpdatedPayload,
  CounterSessionDTO,
} from '@gatimaan/shared';
import { useQueueSubscription, useTicketSubscription } from '../../hooks/useRealtime.js';
import { WaitTimeDisplay } from '../customer/WaitTimeDisplay.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const STORAGE_COUNTER_KEY = 'gatimaan_admin_desk_counter_id';
const STORAGE_TICKET_KEY = 'gatimaan_admin_desk_active_ticket_id';

export function QueueDesk() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_COUNTER_KEY);
  });
  const [selectedServiceId, setSelectedServiceId] = useState<string>(''); // '' means All Services
  const [activeTicket, setActiveTicket] = useState<TicketDTO | null>(null);

  const [queueMetrics, setQueueMetrics] = useState<{
    waitingCount: number;
    activeCountersCount: number;
    estimatedWaitSeconds: number | null;
    demandLevel: DemandLevel;
  } | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [servingDuration, setServingDuration] = useState<string>('00:00');

  // 1. Fetch initial counters and active services
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      };

      const [countersRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/counters`, { headers }),
        fetch(`${API_BASE}/api/services`, { headers }),
      ]);

      if (!countersRes.ok) {
        const data = await countersRes.json();
        throw new Error(data.message || 'Failed to load counters');
      }

      const countersData: CounterWithSessionDTO[] = await countersRes.json();
      const servicesData: ServiceDTO[] = servicesRes.ok ? await servicesRes.json() : [];

      setCounters(countersData);
      setServices(servicesData.filter((s) => s.isActive));

      // Auto-select counter: match active session of logged-in admin, or stored ID, or first counter
      if (countersData.length > 0) {
        setSelectedCounterId((current) => {
          if (current && countersData.some((c) => c.id === current)) {
            return current;
          }
          const userSessionCounter = countersData.find(
            (c) =>
              c.currentSession &&
              (c.currentSession.userId === user?.id ||
                c.currentSession.user?.email === user?.primaryEmailAddress?.emailAddress)
          );
          if (userSessionCounter) {
            sessionStorage.setItem(STORAGE_COUNTER_KEY, userSessionCounter.id);
            return userSessionCounter.id;
          }
          const defaultId = countersData[0].id;
          sessionStorage.setItem(STORAGE_COUNTER_KEY, defaultId);
          return defaultId;
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error initializing Queue Desk');
    } finally {
      setInitialLoading(false);
    }
  }, [getToken, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Recover active ticket for desk from storage if present
  const recoverActiveTicket = useCallback(async () => {
    const storedTicketId = sessionStorage.getItem(STORAGE_TICKET_KEY);
    if (!storedTicketId) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${storedTicketId}`);
      if (res.ok) {
        const ticket: TicketDTO = await res.json();
        if (ticket.status === TicketStatus.CALLED || ticket.status === TicketStatus.SERVING) {
          setActiveTicket(ticket);
        } else {
          sessionStorage.removeItem(STORAGE_TICKET_KEY);
          setActiveTicket(null);
        }
      } else {
        sessionStorage.removeItem(STORAGE_TICKET_KEY);
      }
    } catch {
      // Ignore recovery network failure
    }
  }, []);

  useEffect(() => {
    recoverActiveTicket();
  }, [recoverActiveTicket]);

  // Find currently selected counter object
  const selectedCounter = useMemo(() => {
    return counters.find((c) => c.id === selectedCounterId) || null;
  }, [counters, selectedCounterId]);

  // Check if selected counter has an active session
  const hasActiveSession = Boolean(selectedCounter?.currentSession?.isActive);

  // 3. Realtime Queue Updates (via useQueueSubscription)
  const handleQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueueMetrics({
      waitingCount: payload.waitingCount,
      activeCountersCount: payload.activeCountersCount || 0,
      estimatedWaitSeconds: payload.estimatedWaitSeconds ?? null,
      demandLevel: payload.demandLevel || DemandLevel.LOW,
    });
  }, []);

  useQueueSubscription(selectedServiceId || undefined, handleQueueUpdated);

  // 4. Realtime Ticket Updates (via useTicketSubscription with canonical UUID)
  const handleTicketUpdated = useCallback((payload: TicketUpdatedPayload) => {
    if (payload.ticket && activeTicket && payload.ticket.id === activeTicket.id) {
      if (
        payload.ticket.status === TicketStatus.COMPLETED ||
        payload.ticket.status === TicketStatus.NO_SHOW ||
        payload.ticket.status === TicketStatus.CANCELLED
      ) {
        setActiveTicket(null);
        sessionStorage.removeItem(STORAGE_TICKET_KEY);
      } else {
        setActiveTicket(payload.ticket);
      }
    }
  }, [activeTicket]);

  useTicketSubscription(activeTicket?.id, handleTicketUpdated);

  // 5. Serving duration live timer
  useEffect(() => {
    if (!activeTicket || activeTicket.status !== TicketStatus.SERVING || !activeTicket.servedAt) {
      setServingDuration('00:00');
      return;
    }

    const startTime = new Date(activeTicket.servedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsedTotalSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
      const mins = String(Math.floor(elapsedTotalSeconds / 60)).padStart(2, '0');
      const secs = String(elapsedTotalSeconds % 60).padStart(2, '0');
      setServingDuration(`${mins}:${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  // -------------------------------------------------------------
  // Desk Action Handlers
  // -------------------------------------------------------------

  // Open Desk Shift
  const handleOpenDesk = async () => {
    if (!selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('openDesk');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/counters/${selectedCounterId}/open`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to open desk session');
      }

      const data: { session: CounterSessionDTO } = await res.json();
      setCounters((prev) =>
        prev.map((c) =>
          c.id === selectedCounterId ? { ...c, currentSession: data.session } : c
        )
      );
      setSuccessMsg(`Counter #${selectedCounter?.counterNumber} desk shift is now OPEN`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error opening desk');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Close Desk Shift
  const handleCloseDesk = async () => {
    if (!selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('closeDesk');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/counters/${selectedCounterId}/close`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to close desk session');
      }

      setCounters((prev) =>
        prev.map((c) =>
          c.id === selectedCounterId ? { ...c, currentSession: null } : c
        )
      );
      setActiveTicket(null);
      sessionStorage.removeItem(STORAGE_TICKET_KEY);
      setSuccessMsg(`Counter #${selectedCounter?.counterNumber} desk shift closed`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing desk');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Call Next Ticket
  const handleCallNext = async () => {
    if (!selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('callNext');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/call-next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          counterId: selectedCounterId,
          ...(selectedServiceId ? { serviceId: selectedServiceId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to call next ticket');
      }

      const data: { message: string; ticket: TicketDTO | null } = await res.json();

      if (!data.ticket) {
        setSuccessMsg('No waiting tickets in the queue');
        setActiveTicket(null);
        sessionStorage.removeItem(STORAGE_TICKET_KEY);
      } else {
        setActiveTicket(data.ticket);
        sessionStorage.setItem(STORAGE_TICKET_KEY, data.ticket.id);
        setSuccessMsg(`Ticket ${data.ticket.ticketNumber} CALLED to Counter #${selectedCounter?.counterNumber}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error calling next ticket');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Start Serving
  const handleStartServing = async () => {
    if (!activeTicket || !selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('serve');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${activeTicket.id}/serve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to start serving ticket');
      }

      const data: { message: string; ticket: TicketDTO } = await res.json();
      setActiveTicket(data.ticket);
      setSuccessMsg(`Now serving Ticket ${data.ticket.ticketNumber}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting service');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Complete Service
  const handleCompleteService = async () => {
    if (!activeTicket || !selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('complete');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${activeTicket.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to complete ticket');
      }

      const data: { message: string; ticket: TicketDTO } = await res.json();
      setSuccessMsg(`Ticket ${data.ticket.ticketNumber} completed successfully`);
      setActiveTicket(null);
      sessionStorage.removeItem(STORAGE_TICKET_KEY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error completing ticket');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Skip / Mark No-Show
  const handleSkipTicket = async () => {
    if (!activeTicket || !selectedCounterId) return;
    try {
      setIsActionPending(true);
      setActionType('skip');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${activeTicket.id}/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to mark ticket as skipped');
      }

      const data: { message: string; ticket: TicketDTO } = await res.json();
      setSuccessMsg(`Ticket ${data.ticket.ticketNumber} marked as No-Show / Skipped`);
      setActiveTicket(null);
      sessionStorage.removeItem(STORAGE_TICKET_KEY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error skipping ticket');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  // Demand Level Badge helper
  const getDemandBadge = (level?: DemandLevel) => {
    switch (level) {
      case DemandLevel.SURGE:
        return 'bg-red-100 text-red-800 border-red-200 font-bold';
      case DemandLevel.HIGH:
        return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
      case DemandLevel.MEDIUM:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case DemandLevel.LOW:
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  if (initialLoading) {
    return (
      <div className="py-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        Initializing Queue Desk...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert Messages */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 font-bold hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-green-600 font-bold hover:text-green-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Desk & Service Selection Strip */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Counter Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Select Service Counter / Desk
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedCounterId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCounterId(val);
                sessionStorage.setItem(STORAGE_COUNTER_KEY, val);
                setError(null);
                setSuccessMsg(null);
              }}
              disabled={isActionPending}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              {counters.map((c) => {
                const sessionStatus = c.currentSession?.isActive
                  ? `(Open: ${c.currentSession.user?.name || 'Operator'})`
                  : '(Closed)';
                return (
                  <option key={c.id} value={c.id}>
                    Counter #{c.counterNumber} — {c.name} {sessionStatus}
                  </option>
                );
              })}
            </select>

            {/* Shift Open/Close Toggle Button */}
            {selectedCounter && (
              hasActiveSession ? (
                <button
                  type="button"
                  onClick={handleCloseDesk}
                  disabled={isActionPending}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-100 transition whitespace-nowrap disabled:opacity-50"
                >
                  {isActionPending && actionType === 'closeDesk' ? 'Closing...' : 'Close Shift'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenDesk}
                  disabled={isActionPending || !selectedCounter.isActive}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition whitespace-nowrap disabled:opacity-50"
                >
                  {isActionPending && actionType === 'openDesk' ? 'Opening...' : 'Open Shift'}
                </button>
              )
            )}
          </div>
          {selectedCounter && !selectedCounter.isActive && (
            <p className="text-[11px] text-amber-700 font-medium">
              ⚠ This counter is marked inactive. Enable it in the Counters tab to open shifts.
            </p>
          )}
        </div>

        {/* Service Queue Filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Target Service Queue Filter
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setError(null);
            }}
            disabled={isActionPending}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Services (Global FIFO & Priority)</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.prefix}] {s.name} ({s.code})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500">
            {selectedServiceId
              ? 'Desk will prioritize tickets issued for the selected service.'
              : 'Desk will pull from any waiting service queue based on priority & issuance order.'}
          </p>
        </div>
      </div>

      {/* Main Grid: Current Ticket Action Hero & Live Queue Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Ticket & Calling Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Active Desk Operation</h3>
                <p className="text-xs text-gray-500">
                  {selectedCounter
                    ? `Counter #${selectedCounter.counterNumber} — ${selectedCounter.name}`
                    : 'Select a counter'}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    hasActiveSession ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs font-semibold text-gray-700">
                  {hasActiveSession ? 'SHIFT ACTIVE' : 'SHIFT CLOSED'}
                </span>
              </div>
            </div>

            {/* Warning if Shift is closed */}
            {!hasActiveSession && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                <p className="text-xs text-amber-900 font-medium">
                  An active operator shift is required on Counter #{selectedCounter?.counterNumber || ''} to call and serve tickets.
                </p>
                <button
                  type="button"
                  onClick={handleOpenDesk}
                  disabled={isActionPending || !selectedCounter?.isActive}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isActionPending && actionType === 'openDesk' ? 'Opening...' : 'Open Desk Shift Now'}
                </button>
              </div>
            )}

            {/* Active Ticket Card States */}
            {activeTicket ? (
              <div className="p-6 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white rounded-2xl shadow-sm space-y-5">
                <div className="flex items-center justify-between text-xs text-blue-200 border-b border-white/10 pb-3">
                  <span className="uppercase font-semibold tracking-wider text-[10px]">
                    {activeTicket.status === TicketStatus.CALLED ? 'Ticket Called to Desk' : 'Service in Progress'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">
                    Priority: {activeTicket.priority}
                  </span>
                </div>

                {/* Big Token Number Hero */}
                <div className="text-center py-2 space-y-1">
                  <span className="text-5xl sm:text-6xl font-black font-mono tracking-wider block drop-shadow-sm">
                    {activeTicket.ticketNumber}
                  </span>
                  <p className="text-sm font-semibold text-blue-100">
                    {activeTicket.service?.name || 'Citizen Service'}
                  </p>
                </div>

                {/* Metadata & Timer Bar */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <span className="text-[10px] text-blue-300 block uppercase font-medium">Status</span>
                    <span className="font-bold text-white uppercase">{activeTicket.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-300 block uppercase font-medium">
                      {activeTicket.status === TicketStatus.SERVING ? 'Serving Duration' : 'Called At'}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {activeTicket.status === TicketStatus.SERVING
                        ? servingDuration
                        : activeTicket.calledAt
                        ? new Date(activeTicket.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </span>
                  </div>
                </div>

                {/* State-Specific Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {activeTicket.status === TicketStatus.CALLED && (
                    <>
                      <button
                        type="button"
                        onClick={handleStartServing}
                        disabled={isActionPending}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isActionPending && actionType === 'serve' ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Starting Service...</span>
                          </>
                        ) : (
                          <>
                            <span>▶ Start Serving</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSkipTicket}
                        disabled={isActionPending}
                        className="px-4 py-3 bg-white/10 hover:bg-red-600/80 text-white rounded-xl text-xs font-bold transition border border-white/20 disabled:opacity-50"
                      >
                        {isActionPending && actionType === 'skip' ? 'Skipping...' : '✕ Mark No-Show'}
                      </button>
                    </>
                  )}

                  {activeTicket.status === TicketStatus.SERVING && (
                    <button
                      type="button"
                      onClick={handleCompleteService}
                      disabled={isActionPending}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isActionPending && actionType === 'complete' ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Completing Service...</span>
                        </>
                      ) : (
                        <>
                          <span>✓ Complete Service</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Idle Desk: No Ticket in Progress */
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-900">Desk Ready for Next Citizen</h4>
                  <p className="text-xs text-gray-500">
                    No active ticket at Counter #{selectedCounter?.counterNumber || '-'}. Click below to call the next waiting citizen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={isActionPending || !hasActiveSession}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionPending && actionType === 'callNext' ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Calling Next...</span>
                    </>
                  ) : (
                    <>
                      <span>⏭ Call Next Ticket</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Realtime Queue Telemetry (1 col) */}
        <div className="space-y-4">
          <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Queue Telemetry</h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-3">
              {/* Waiting Citizens */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Waiting in Line</span>
                  <span className="text-2xl font-black font-mono text-gray-900">
                    {queueMetrics?.waitingCount ?? '--'}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">citizens</span>
              </div>

              {/* Estimated Wait Time */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Estimated Wait Time</span>
                  <span className="text-base font-bold text-blue-700 block mt-0.5">
                    <WaitTimeDisplay
                      estimatedWaitSeconds={queueMetrics?.estimatedWaitSeconds}
                      showIcon={false}
                    />
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">ETA Engine</span>
              </div>

              {/* Active Open Desks */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Active Counters</span>
                  <span className="text-lg font-bold text-gray-800">
                    {queueMetrics?.activeCountersCount ?? counters.filter((c) => c.currentSession?.isActive).length} / {counters.length}
                  </span>
                </div>
                <span className="text-xs text-emerald-600 font-medium font-mono">Open</span>
              </div>

              {/* Demand Level Indicator */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Queue Demand Level</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getDemandBadge(
                      queueMetrics?.demandLevel
                    )}`}
                  >
                    {queueMetrics?.demandLevel || DemandLevel.LOW}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Statistical</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-gray-400 leading-relaxed text-center">
              Queue positions and wait times update in real-time across citizen and operator portals.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
