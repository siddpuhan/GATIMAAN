import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, CounterWithSessionDTO } from '@gatimaan/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { LoadingState, AlertBanner } from '../components/ui/FeedbackStates.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = useCallback(async () => {
    try {
      setIsLoading(true);
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

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }

      if (countersRes.ok) {
        const countersData = await countersRes.json();
        setCounters(countersData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching center metrics');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const activeCounters = counters.filter((c) => c.currentSession && c.currentSession.isActive);
  const activeServices = services.filter((s) => s.isActive);
  const avgDurationOverall = services.length > 0
    ? Math.round(services.reduce((acc, s) => acc + (s.avgDurationMinutes || 15), 0) / services.length)
    : 15;

  return (
    <div className="space-y-6">
      {/* Connected "State of the Centre" Operational Snapshot Strip */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-700 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              State of the Centre · Command Telemetry
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Facilitation & Queue Command Center
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Live supervision of active physical desks, department queues, and operator shifts
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/admin/queue">
              <Button variant="primary" size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold">
                <span>Open Queue Desk Cockpit →</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Item Operational Snapshot Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Desks</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">{activeCounters.length}</span>
              <span className="text-slate-400 text-[11px]">/ {counters.length} Total</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active Services</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">{activeServices.length}</span>
              <span className="text-slate-400 text-[11px]">/ {services.length} Total</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Avg Target SLA</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">~{avgDurationOverall}</span>
              <span className="text-slate-400 text-[11px]">mins / citizen</span>
            </div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Telemetry Feed</span>
            <div className="flex items-center gap-1.5 mt-1.5 text-emerald-400 font-bold text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE · SYNCED</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <AlertBanner
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {isLoading ? (
        <LoadingState message="Loading center snapshot..." />
      ) : (
        /* Operational Two-Column Layout (Left 65% / Right 35%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT ~65% (8 cols): Live Queue Snapshot & Desk Roster */}
          <div className="lg:col-span-8 space-y-5">
            {/* Department Service Queues */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Department Service Queues</CardTitle>
                  <CardDescription>Live citizen facilitation services and status</CardDescription>
                </div>
                <Link to="/admin/services">
                  <Button variant="secondary" size="sm">
                    <span>Manage Services</span>
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {services.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No services configured yet.</p>
                ) : (
                  services.map((service) => (
                    <div
                      key={service.id}
                      className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="navy" size="sm">
                          <span className="font-mono font-bold">{service.prefix}</span>
                        </Badge>
                        <div>
                          <strong className="text-slate-900 block font-semibold">{service.name}</strong>
                          <span className="text-slate-500 text-[11px] font-mono">Code: {service.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500">
                          Est. {service.avgDurationMinutes} mins/token
                        </span>
                        {service.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Configured Physical Counters Snapshot */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Physical Desks & Shifts</CardTitle>
                  <CardDescription>Operator desk availability and shift status</CardDescription>
                </div>
                <Link to="/admin/counters">
                  <Button variant="secondary" size="sm">
                    <span>Manage Desks</span>
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {counters.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No physical counters configured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {counters.map((counter) => (
                      <div
                        key={counter.id}
                        className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">Desk #{counter.counterNumber}</span>
                            <span className="text-slate-400 font-normal">({counter.name})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {counter.currentSession?.isActive ? 'Session Active' : 'Desk Standby / Offline'}
                          </span>
                        </div>

                        <div>
                          {counter.currentSession?.isActive ? (
                            <Badge variant="success" size="sm" dot pulse>
                              In Service
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT ~35% (4 cols): Quick Actions Cockpit & Guidelines */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operator Quick Actions</CardTitle>
                <CardDescription>Direct navigation to operational tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Link to="/admin/queue" className="block">
                  <Button variant="primary" size="md" fullWidth className="justify-between font-bold">
                    <span>Queue Desk Cockpit</span>
                    <span>→</span>
                  </Button>
                </Link>

                <Link to="/admin/queue-operations" className="block">
                  <Button variant="secondary" size="md" fullWidth className="justify-between">
                    <span>Queue Operations</span>
                    <span>→</span>
                  </Button>
                </Link>

                <Link to="/admin/services" className="block">
                  <Button variant="secondary" size="md" fullWidth className="justify-between">
                    <span>Services Management</span>
                    <span>→</span>
                  </Button>
                </Link>

                <Link to="/admin/counters" className="block">
                  <Button variant="secondary" size="md" fullWidth className="justify-between">
                    <span>Counters & Desks</span>
                    <span>→</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Operational Guidelines Notice */}
            <Card>
              <CardHeader>
                <CardTitle>Operational Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  • Counter operators should start desk sessions in the <strong>Queue Desk</strong> before
                  summoning citizens.
                </p>
                <p>
                  • To modify service durations or prefixes, use the <strong>Services Management</strong>{' '}
                  console.
                </p>
                <p>
                  • Realtime updates are broadcast automatically to citizen mobile devices via WebSocket
                  channels.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
