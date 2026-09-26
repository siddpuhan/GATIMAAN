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
  ServiceUpdatedPayload,
  CounterSessionDTO,
} from '@gatimaan/shared';
import {
  useQueueSubscription,
  useTicketSubscription,
  useServicesSubscription,
} from '../../hooks/useRealtime.js';
import { WaitTimeDisplay } from '../customer/WaitTimeDisplay.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card.js';
import { LoadingState } from '../ui/FeedbackStates.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const STORAGE_COUNTER_KEY = 'gatimaan_admin_desk_counter_id';
const STORAGE_TICKET_KEY = 'gatimaan_admin_desk_active_ticket_id';

const KNOWN_SERVICE_METADATA: Record<string, { hindi: string; category: string }> = {
  DOM: { hindi: 'स्थानीय निवासी प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  INC: { hindi: 'आय प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  CAST: { hindi: 'जाति प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  EWS: { hindi: 'EWS आय एवं संपत्ति प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  LAND: { hindi: 'भू-अभिलेख', category: 'Revenue / Land Records' },
  REV: { hindi: 'भू-अभिलेख एवं राजस्व', category: 'Revenue / Land Records' },
  BTH: { hindi: 'जन्म प्रमाण पत्र', category: 'Municipal / Local Body Services' },
  DTH: { hindi: 'मृत्यु प्रमाण पत्र', category: 'Municipal / Local Body Services' },
  SAM: { hindi: 'समग्र ID / ई-KYC', category: 'Citizen Services' },
  AAD: { hindi: 'आधार नामांकन / अपडेट', category: 'Aadhaar / Citizen Services' },
  ADH: { hindi: 'आधार सेवा केंद्र', category: 'Aadhaar / Citizen Services' },
  ELEC: { hindi: 'बिजली बिल / उपयोगिता भुगतान', category: 'Utility Services' },
};

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

  // 3. Realtime Queue Updates
  const handleQueueUpdated = useCallback((payload: QueueUpdatedPayload) => {
    setQueueMetrics({
      waitingCount: payload.waitingCount,
      activeCountersCount: payload.activeCountersCount || 0,
      estimatedWaitSeconds: payload.estimatedWaitSeconds ?? null,
      demandLevel: payload.demandLevel || DemandLevel.LOW,
    });
  }, []);

  useQueueSubscription(selectedServiceId || undefined, handleQueueUpdated);

  // 4. Realtime Ticket Updates
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

  // 5. Realtime Services Catalog Updates
  const handleServiceUpdated = useCallback((payload: ServiceUpdatedPayload) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === payload.service.id);
      if (payload.service.isActive) {
        if (exists) {
          return prev.map((s) => (s.id === payload.service.id ? payload.service : s));
        } else {
          return [...prev, payload.service];
        }
      } else {
        return prev.filter((s) => s.id !== payload.service.id);
      }
    });
  }, []);

  useServicesSubscription(handleServiceUpdated);

  // Auto-dismiss notification toasts after 4 seconds
  useEffect(() => {
    if (!error && !successMsg) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccessMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [error, successMsg]);

  // 6. Serving duration live timer
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

  // Desk Action Handlers
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
        setSuccessMsg(`Ticket ${data.ticket.ticketNumber} CALLED to Desk #${selectedCounter?.counterNumber}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error calling next ticket');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

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
        throw new Error(data.message || 'Failed to skip ticket');
      }

      const data: { message: string; ticket: TicketDTO } = await res.json();
      setSuccessMsg(`Ticket ${data.ticket.ticketNumber} marked as No-Show`);
      setActiveTicket(null);
      sessionStorage.removeItem(STORAGE_TICKET_KEY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error skipping ticket');
    } finally {
      setIsActionPending(false);
      setActionType(null);
    }
  };

  if (initialLoading) {
    return <LoadingState message="Connecting to Queue Desk cockpit..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback Messages */}
      <div className="fixed top-16 right-6 z-50 max-w-sm w-full space-y-2 pointer-events-none">
        {error && (
          <div className="pointer-events-auto p-3.5 bg-white border border-rose-200 border-l-4 border-l-rose-600 rounded-2xl text-xs text-slate-900 shadow-lg flex items-start justify-between gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">
              !
            </span>
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-1 text-sm leading-none shrink-0"
              aria-label="Close error notification"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="pointer-events-auto p-3.5 bg-white border border-emerald-200 border-l-4 border-l-emerald-600 rounded-2xl text-xs text-slate-900 shadow-lg flex items-start justify-between gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
              ✓
            </span>
            <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-1 text-sm leading-none shrink-0"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Operational Cockpit 65/35 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ~65% (8 cols): Current Desk / Serving Token Cockpit */}
        <div className="lg:col-span-8 space-y-5">
          <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-2xs space-y-6">
            {/* Cockpit Desk Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    OPERATIONAL DESK
                  </span>
                  <Badge variant="navy" size="sm" className="font-mono font-bold">
                    Desk #{selectedCounter?.counterNumber || '-'}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  {selectedCounter ? selectedCounter.name : 'Select a counter desk'}
                </h3>
              </div>

              {/* Live Shift Status */}
              <div>
                {hasActiveSession ? (
                  <Badge variant="success" size="md" dot pulse>
                    Shift Active
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="md">
                    Shift Closed
                  </Badge>
                )}
              </div>
            </div>

            {/* Warning if Shift is closed */}
            {!hasActiveSession && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  An active operator shift is required on Desk #{selectedCounter?.counterNumber || ''} to call and serve citizen tokens.
                </p>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleOpenDesk}
                  isLoading={isActionPending && actionType === 'openDesk'}
                  loadingText="Opening Shift..."
                  disabled={isActionPending || !selectedCounter?.isActive}
                >
                  Open Desk Shift Now
                </Button>
              </div>
            )}

            {/* Active Ticket Hero Cockpit */}
            {activeTicket ? (
              <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-sm space-y-5 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="uppercase font-bold tracking-wider text-[10px] text-slate-300">
                      {activeTicket.status === TicketStatus.CALLED ? 'Token Summoned to Desk' : 'Service in Progress'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300 border border-slate-700">
                    Priority: {activeTicket.priority}
                  </span>
                </div>

                {/* Dominant Token Number Display */}
                <div className="text-center py-2 space-y-1">
                  <span className="text-5xl sm:text-7xl font-black font-mono tracking-widest block text-white drop-shadow-sm">
                    {activeTicket.ticketNumber}
                  </span>
                  <p className="text-base font-bold text-slate-100">
                    {activeTicket.service?.name || 'Citizen Service'}
                  </p>
                  {activeTicket.service?.code && KNOWN_SERVICE_METADATA[activeTicket.service.code]?.hindi && (
                    <p className="text-xs text-slate-400 font-medium">
                      {KNOWN_SERVICE_METADATA[activeTicket.service.code]?.hindi}
                    </p>
                  )}
                </div>

                {/* Status & Live Duration Timer Bar */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs py-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Queue State</span>
                    <span className="font-bold text-white uppercase text-xs mt-0.5 block">{activeTicket.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      {activeTicket.status === TicketStatus.SERVING ? 'Serving Duration' : 'Called At'}
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                      {activeTicket.status === TicketStatus.SERVING
                        ? servingDuration
                        : activeTicket.calledAt
                        ? new Date(activeTicket.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </span>
                  </div>
                </div>

                {/* State-Specific Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {activeTicket.status === TicketStatus.CALLED && (
                    <>
                      <Button
                        variant="success"
                        size="lg"
                        fullWidth
                        onClick={handleStartServing}
                        isLoading={isActionPending && actionType === 'serve'}
                        loadingText="Starting Service..."
                        disabled={isActionPending}
                        className="font-bold text-sm"
                      >
                        <span>▶ Start Serving Citizen</span>
                      </Button>

                      <Button
                        variant="destructive-outline"
                        size="lg"
                        onClick={handleSkipTicket}
                        isLoading={isActionPending && actionType === 'skip'}
                        loadingText="Marking No-Show..."
                        disabled={isActionPending}
                        className="shrink-0 bg-slate-800 text-rose-300 border-slate-700 hover:bg-rose-900/40 hover:text-white"
                      >
                        <span>✕ Mark No-Show</span>
                      </Button>
                    </>
                  )}

                  {activeTicket.status === TicketStatus.SERVING && (
                    <>
                      <Button
                        variant="success"
                        size="lg"
                        fullWidth
                        onClick={handleCompleteService}
                        isLoading={isActionPending && actionType === 'complete'}
                        loadingText="Completing Service..."
                        disabled={isActionPending}
                        className="font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <span>✓ Complete Service Session</span>
                      </Button>

                      <Button
                        variant="destructive-outline"
                        size="lg"
                        onClick={handleSkipTicket}
                        isLoading={isActionPending && actionType === 'skip'}
                        loadingText="Cancelling..."
                        disabled={isActionPending}
                        className="shrink-0 bg-slate-800 text-rose-300 border-slate-700 hover:bg-rose-900/40 hover:text-white"
                      >
                        <span>✕ Cancel / Skip</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Idle Desk Cockpit: Ready to Call Next */
              <div className="p-8 sm:p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-5 bg-slate-50/50">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
                  🪑
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">Desk Standby · Ready for Next Citizen</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Desk #{selectedCounter?.counterNumber || '-'} is open and waiting. Click the primary button
                    below to summon the next citizen according to FIFO priority.
                  </p>
                </div>

                {/* Primary Action Button: CALL NEXT (The dominant action on the page) */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleCallNext}
                    isLoading={isActionPending && actionType === 'callNext'}
                    loadingText="Calling Next Citizen..."
                    disabled={isActionPending || !hasActiveSession}
                    className="px-10 py-4 text-sm sm:text-base font-extrabold shadow-md mx-auto"
                  >
                    <span>📢 CALL NEXT CITIZEN</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ~35% (4 cols): Persistent Telemetry Rail */}
        <div className="lg:col-span-4 space-y-4">
          {/* Desk Session Controller Card */}
          <Card>
            <CardHeader>
              <CardTitle>Desk & Shift Controller</CardTitle>
              <CardDescription>Select active hardware counter and shift state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Active Service Desk
                </label>
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
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
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
              </div>

              {/* Shift Toggle Button */}
              {selectedCounter && (
                <div>
                  {hasActiveSession ? (
                    <Button
                      variant="destructive-outline"
                      size="sm"
                      fullWidth
                      onClick={handleCloseDesk}
                      isLoading={isActionPending && actionType === 'closeDesk'}
                      loadingText="Closing..."
                      disabled={isActionPending}
                    >
                      Close Desk Shift
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="sm"
                      fullWidth
                      onClick={handleOpenDesk}
                      isLoading={isActionPending && actionType === 'openDesk'}
                      loadingText="Opening..."
                      disabled={isActionPending || !selectedCounter.isActive}
                    >
                      Open Desk Shift
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Queue Filter Card */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Priority Filter</CardTitle>
              <CardDescription>Filter tickets summoned to this desk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Service Specialization
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setError(null);
                  }}
                  disabled={isActionPending}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                >
                  <option value="">All Services (Global FIFO)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefix}] {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {selectedServiceId
                  ? 'Desk will prioritize tickets issued for this specific service.'
                  : 'Desk will pull from any waiting service queue based on arrival order.'}
              </p>
            </CardContent>
          </Card>

          {/* Live Queue Telemetry Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Live Center Telemetry</CardTitle>
              <CardDescription>Real-time queue load and citizen volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Waiting Citizens</span>
                  <span className="text-xl font-black font-mono text-slate-900 block mt-0.5">
                    {queueMetrics?.waitingCount ?? 0}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Demand Level</span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        queueMetrics?.demandLevel === DemandLevel.HIGH
                          ? 'destructive'
                          : queueMetrics?.demandLevel === DemandLevel.MEDIUM
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {queueMetrics?.demandLevel || 'LOW'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Est. Wait Ahead</span>
                <span className="font-bold text-slate-900 text-sm block">
                  <WaitTimeDisplay
                    estimatedWaitSeconds={queueMetrics?.estimatedWaitSeconds}
                    showIcon={true}
                  />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
