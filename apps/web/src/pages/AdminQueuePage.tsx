import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ServiceDTO,
  CounterWithSessionDTO,
  TicketDTO,
  TicketStatus,
  QueueUpdatedPayload,
  TicketUpdatedPayload,
} from '@gatimaan/shared';
import { useQueueSubscription, useTicketSubscription } from '../hooks/useRealtime.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { AlertBanner, LoadingState } from '../components/ui/FeedbackStates.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function AdminQueuePage() {
  const { getToken } = useAuth();

  // Data Sources
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('');

  // Queue & Desk State
  const [currentTicket, setCurrentTicket] = useState<TicketDTO | null>(null);
  const [waitingCount, setWaitingCount] = useState<number | null>(null);

  // Status & Feedback
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Selected counter helper
  const selectedCounter = counters.find((c) => c.id === selectedCounterId) || null;
  const hasActiveSession = !!selectedCounter?.currentSession;

  // Selected service helper
  const selectedService = services.find((s) => s.id === selectedServiceId) || null;

  // Fetch initial services and counters
  const fetchMetadata = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [servicesRes, countersRes] = await Promise.all([
        fetch(`${API_BASE}/api/services`, { headers }),
        fetch(`${API_BASE}/api/counters`, { headers }),
      ]);

      if (!servicesRes.ok) {
        const data = await servicesRes.json().catch(() => ({}));
        throw new Error(data.message || `Failed to fetch services (HTTP ${servicesRes.status})`);
      }

      if (!countersRes.ok) {
        const data = await countersRes.json().catch(() => ({}));
        throw new Error(data.message || `Failed to fetch counters (HTTP ${countersRes.status})`);
      }

      const servicesData: ServiceDTO[] = await servicesRes.json();
      const countersData: CounterWithSessionDTO[] = await countersRes.json();

      setServices(servicesData);
      setCounters(countersData);

      // Auto-select first counter if none currently selected
      setSelectedCounterId((prevId) => {
        if (prevId) return prevId;
        const openCounter = countersData.find((c) => !!c.currentSession);
        return openCounter ? openCounter.id : countersData[0]?.id || '';
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error initializing desk operations');
    } finally {
      setIsLoadingInitial(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Realtime Subscriptions
  const handleQueueUpdate = useCallback(
    (payload: QueueUpdatedPayload) => {
      if (selectedServiceId && payload.serviceId === selectedServiceId) {
        setWaitingCount(payload.waitingCount);
      }
    },
    [selectedServiceId]
  );

  useQueueSubscription(selectedServiceId || null, handleQueueUpdate);

  const handleTicketUpdate = useCallback(
    (payload: TicketUpdatedPayload) => {
      if (currentTicket && payload.ticket && payload.ticket.id === currentTicket.id) {
        setCurrentTicket(payload.ticket);
      }
    },
    [currentTicket]
  );

  useTicketSubscription(currentTicket?.id, handleTicketUpdate);

  // Clear feedback when changing selections
  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedServiceId(e.target.value);
    setWaitingCount(null);
    setError(null);
    setSuccessMsg(null);
    setShowSkipConfirm(false);
  };

  const handleCounterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCounterId(e.target.value);
    setError(null);
    setSuccessMsg(null);
    setShowSkipConfirm(false);
  };

  // 1. Call Next
  const handleCallNext = async () => {
    if (!selectedCounterId) {
      setError('Please select a counter before calling a token.');
      return;
    }

    if (!hasActiveSession) {
      setError('Selected counter has no active session. Please open the counter desk first.');
      return;
    }

    try {
      setIsActionPending(true);
      setPendingActionType('call-next');
      setError(null);
      setSuccessMsg(null);
      setShowSkipConfirm(false);

      const token = await getToken();
      const payload: { counterId: string; serviceId?: string } = {
        counterId: selectedCounterId,
      };
      if (selectedServiceId) {
        payload.serviceId = selectedServiceId;
      }

      const res = await fetch(`${API_BASE}/api/tickets/call-next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to call next token');
      }

      if (data.ticket) {
        setCurrentTicket(data.ticket);
        setSuccessMsg(`Token ${data.ticket.ticketNumber} summoned to Counter #${selectedCounter?.counterNumber}`);
      } else {
        setCurrentTicket(null);
        setSuccessMsg(data.message || 'No waiting citizens in queue for this service.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error calling next token');
    } finally {
      setIsActionPending(false);
      setPendingActionType(null);
    }
  };

  // 2. Serve
  const handleServe = async () => {
    if (!currentTicket) {
      setError('No active token to serve.');
      return;
    }

    if (!selectedCounterId) {
      setError('Please select a counter.');
      return;
    }

    try {
      setIsActionPending(true);
      setPendingActionType('serve');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicket.id}/serve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to serve token');
      }

      setCurrentTicket(data.ticket);
      setSuccessMsg(`Now serving Token ${data.ticket.ticketNumber}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting service for token');
    } finally {
      setIsActionPending(false);
      setPendingActionType(null);
    }
  };

  // 3. Complete
  const handleComplete = async () => {
    if (!currentTicket) {
      setError('No active token to complete.');
      return;
    }

    if (!selectedCounterId) {
      setError('Please select a counter.');
      return;
    }

    try {
      setIsActionPending(true);
      setPendingActionType('complete');
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicket.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to complete token');
      }

      setSuccessMsg(`Token ${data.ticket.ticketNumber} completed successfully.`);
      setCurrentTicket(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error completing token');
    } finally {
      setIsActionPending(false);
      setPendingActionType(null);
    }
  };

  // 4. Skip / No-show
  const handleConfirmSkip = async () => {
    if (!currentTicket) {
      setError('No active token to skip.');
      return;
    }

    if (!selectedCounterId) {
      setError('Please select a counter.');
      return;
    }

    try {
      setIsActionPending(true);
      setPendingActionType('skip');
      setError(null);
      setSuccessMsg(null);
      setShowSkipConfirm(false);

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/tickets/${currentTicket.id}/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ counterId: selectedCounterId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to mark token as no-show');
      }

      setSuccessMsg(`Token ${data.ticket.ticketNumber} marked as no-show / skipped.`);
      setCurrentTicket(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error skipping token');
    } finally {
      setIsActionPending(false);
      setPendingActionType(null);
    }
  };

  if (isLoadingInitial) {
    return <LoadingState message="Loading desk queue operations..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1"
            >
              ← Admin Shell
            </Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-700 font-bold">Queue Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Desk Queue Operations
          </h1>
          <p className="text-xs text-slate-500">
            Citizen dispatching, token summoning, and live counter service execution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="navy" size="md">
            OPERATOR DESK ACTIVE
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <AlertBanner
          type="error"
          title="Operation Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {successMsg && (
        <AlertBanner
          type="success"
          title="Desk Notice"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {/* Control Configuration Bar */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
          {/* Counter Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Active Desk / Counter *
            </label>
            <select
              value={selectedCounterId}
              onChange={handleCounterChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            >
              {counters.length === 0 ? (
                <option value="">No counters configured</option>
              ) : (
                counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Desk #{c.counterNumber} — {c.name} {c.currentSession ? '(SESSION OPEN)' : '(CLOSED)'}
                  </option>
                ))
              )}
            </select>

            {/* Active Session Info */}
            <div className="pt-1 text-xs">
              {selectedCounter ? (
                hasActiveSession ? (
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>
                      <strong>Desk Session Open:</strong> Operator{' '}
                      {selectedCounter.currentSession?.user?.name ||
                        selectedCounter.currentSession?.user?.email ||
                        'Logged In'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Desk session is closed. Open desk session in Counters tab to summon citizens.</span>
                    </div>
                    <Link
                      to="/admin"
                      className="underline text-[11px] font-bold text-amber-950 hover:text-black ml-2"
                    >
                      Open Desk →
                    </Link>
                  </div>
                )
              ) : (
                <span className="text-slate-400">Please select a desk.</span>
              )}
            </div>
          </div>

          {/* Service Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Department Service Filter
            </label>
            <select
              value={selectedServiceId}
              onChange={handleServiceChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            >
              <option value="">All Services (Global FIFO Priority)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.prefix}] {s.name} ({s.code}) — {s.avgDurationMinutes}m avg
                </option>
              ))}
            </select>

            {/* Service Info Preview */}
            <div className="pt-1 text-xs text-slate-500">
              {selectedService ? (
                <span>
                  Summoning for <strong>{selectedService.name}</strong> (Prefix:{' '}
                  <code className="font-bold font-mono text-slate-800">{selectedService.prefix}</code>)
                </span>
              ) : (
                <span>Summoning across all active queues based on priority rank</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Waiting Queue & Active Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Waiting Queue Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiting Queue</CardTitle>
                <Badge variant="navy" size="sm" dot pulse>
                  Live Realtime
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Citizens Waiting
                </span>
                <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono block">
                  {waitingCount !== null ? waitingCount : '—'}
                </span>
                <p className="text-[11px] text-slate-500 pt-1">
                  {selectedServiceId
                    ? `Waiting for ${selectedService?.name || 'selected service'}`
                    : 'Select a service filter for live queue tally'}
                </p>
              </div>

              {/* Waiting Queue Roster Limitation Note */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>ℹ️</span> Dispatch Roster:
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Waiting queue list is not available from the current API.
                </p>
                <p className="text-[10px] text-slate-400">
                  Tokens are automatically dispatched in priority and timestamp order upon &quot;Call Next&quot;.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Current Active Ticket & Primary Action Desk */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Desk Token</CardTitle>
                  <CardDescription>Citizen currently summoned or stationed at this desk</CardDescription>
                </div>
                {currentTicket && (
                  <div>
                    {currentTicket.status === TicketStatus.CALLED && (
                      <Badge variant="warning" size="md" dot pulse>
                        CALLED (AT DESK)
                      </Badge>
                    )}
                    {currentTicket.status === TicketStatus.SERVING && (
                      <Badge variant="success" size="md" dot pulse>
                        CURRENTLY SERVING
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentTicket ? (
                <div className="space-y-5">
                  {/* Big Dominant Token Callout */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Active Token
                      </span>
                      <div className="text-5xl font-black text-slate-900 font-mono tracking-tight mt-1">
                        {currentTicket.ticketNumber}
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {currentTicket.service?.name || 'Department Service'}
                      </div>
                    </div>

                    <div className="text-right text-xs space-y-1 sm:border-l sm:border-slate-200 sm:pl-6">
                      <div>
                        <span className="text-slate-400">Priority: </span>
                        <span className="font-mono font-bold text-slate-900">
                          Rank {currentTicket.priority}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Issued: </span>
                        <span className="font-mono text-slate-700">
                          {new Date(currentTicket.issuedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      {currentTicket.calledAt && (
                        <div>
                          <span className="text-slate-400">Called: </span>
                          <span className="font-mono text-slate-700">
                            {new Date(currentTicket.calledAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      {currentTicket.servedAt && (
                        <div>
                          <span className="text-slate-400">Served: </span>
                          <span className="font-mono text-slate-700">
                            {new Date(currentTicket.servedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Next-Action Area with Clear Visual Hierarchy */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Desk Action Workflow
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Serve Button: CALLED -> SERVING */}
                      {currentTicket.status === TicketStatus.CALLED && (
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          isLoading={isActionPending && pendingActionType === 'serve'}
                          loadingText="Starting Service..."
                          disabled={isActionPending || !hasActiveSession}
                          onClick={handleServe}
                        >
                          <span>▶ Start Serving Citizen</span>
                        </Button>
                      )}

                      {/* Complete Button: SERVING -> COMPLETED */}
                      {currentTicket.status === TicketStatus.SERVING && (
                        <Button
                          variant="success"
                          size="lg"
                          fullWidth
                          isLoading={isActionPending && pendingActionType === 'complete'}
                          loadingText="Completing..."
                          disabled={isActionPending || !hasActiveSession}
                          onClick={handleComplete}
                        >
                          <span>✓ Complete Service</span>
                        </Button>
                      )}

                      {/* Skip / No-Show Button with Confirmation Safeguard */}
                      {!showSkipConfirm ? (
                        <Button
                          variant="destructive-outline"
                          size="lg"
                          fullWidth
                          disabled={isActionPending || !hasActiveSession}
                          onClick={() => setShowSkipConfirm(true)}
                        >
                          <span>⏭ Citizen No-Show / Skip</span>
                        </Button>
                      ) : (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-rose-900">Confirm Skip?</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isActionPending}
                              onClick={() => setShowSkipConfirm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              isLoading={isActionPending && pendingActionType === 'skip'}
                              loadingText="Skipping..."
                              onClick={handleConfirmSkip}
                            >
                              Yes, Mark No-Show
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 border border-slate-200 flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
                    🎫
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Citizen Currently at Desk</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Click <strong className="text-slate-800">&quot;Call Next Citizen&quot;</strong> below to summon the next waiting token.
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Dispatch Action: CALL NEXT (Prominent, High-Contrast) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                  {hasActiveSession ? (
                    <span>Ready for dispatch at <strong>Desk #{selectedCounter?.counterNumber}</strong></span>
                  ) : (
                    <span className="text-amber-800 font-semibold">
                      ⚠️ Desk session must be opened before summoning tokens.
                    </span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={isActionPending || !selectedCounterId || !hasActiveSession}
                  isLoading={isActionPending && pendingActionType === 'call-next'}
                  loadingText="Calling Next..."
                  onClick={handleCallNext}
                  className="sm:min-w-[200px]"
                >
                  <span>📢 Call Next Citizen</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
