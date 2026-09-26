import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ServiceDTO,
  CounterWithSessionDTO,
  FootfallSummaryDTO,
  PredictionSummaryDTO,
  DemandLevel,
  ServiceUpdatedPayload,
  FootfallUpdatedPayload,
  PredictionUpdatedPayload,
} from '@gatimaan/shared';
import {
  useServicesSubscription,
  useFootfallSubscription,
  usePredictionSubscription,
  useSocketStatus,
} from '../hooks/useRealtime.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { LoadingState, AlertBanner } from '../components/ui/FeedbackStates.js';
import { formatWaitTime } from '../components/customer/WaitTimeDisplay.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function AdminOverviewPage() {
  const { getToken } = useAuth();
  const isSocketConnected = useSocketStatus();

  // Core Data States
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [footfallSummary, setFootfallSummary] = useState<FootfallSummaryDTO | null>(null);
  const [predictions, setPredictions] = useState<PredictionSummaryDTO[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // 1. Fetch Comprehensive Center Telemetry
  const fetchOverviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [servicesRes, countersRes, footfallRes, predictionRes] = await Promise.all([
        fetch(`${API_BASE}/api/services`, { headers }),
        fetch(`${API_BASE}/api/counters`, { headers }),
        fetch(`${API_BASE}/api/footfall/current`, { headers }),
        fetch(`${API_BASE}/api/prediction/current`, { headers }),
      ]);

      if (servicesRes.ok) {
        const servicesData: ServiceDTO[] = await servicesRes.json();
        setServices(servicesData);
      }

      if (countersRes.ok) {
        const countersData: CounterWithSessionDTO[] = await countersRes.json();
        setCounters(countersData);
      }

      if (footfallRes.ok) {
        const footfallData: FootfallSummaryDTO = await footfallRes.json();
        setFootfallSummary(footfallData);
      }

      if (predictionRes.ok) {
        const predictionData: PredictionSummaryDTO[] = await predictionRes.json();
        setPredictions(predictionData);
      }

      setLastSyncTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching center metrics');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  // 2. Realtime Service Catalog Updates
  const handleServiceUpdate = useCallback((payload: ServiceUpdatedPayload) => {
    if (!payload?.service) return;
    setServices((prev) => {
      const updated = payload.service;
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }
      return [...prev, updated];
    });
    setLastSyncTime(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  useServicesSubscription(handleServiceUpdate);

  // 3. Realtime Footfall Updates
  const handleFootfallUpdate = useCallback((payload: FootfallUpdatedPayload) => {
    if (!payload) return;
    setFootfallSummary((prev: FootfallSummaryDTO | null) => {
      if (!prev) {
        return {
          currentOccupancy: payload.currentOccupancy,
          todayCountIn: 0,
          todayCountOut: 0,
          peakOccupancyToday: payload.currentOccupancy,
          lastEventAt: payload.timestamp,
        };
      }
      return {
        ...prev,
        currentOccupancy: payload.currentOccupancy,
        peakOccupancyToday: Math.max(prev.peakOccupancyToday, payload.currentOccupancy),
        lastEventAt: payload.timestamp,
      };
    });
    setLastSyncTime(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  useFootfallSubscription(handleFootfallUpdate);

  // 4. Realtime Prediction Updates
  const handlePredictionUpdate = useCallback((payload: PredictionUpdatedPayload) => {
    if (!payload?.serviceId) return;
    setPredictions((prev) =>
      prev.map((p) =>
        p.serviceId === payload.serviceId
          ? {
              ...p,
              predictedWaitSeconds: payload.predictedWaitSeconds,
              demandLevel: payload.demandLevel,
              timestamp: payload.timestamp,
            }
          : p
      )
    );
    setLastSyncTime(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  usePredictionSubscription(handlePredictionUpdate);

  // Derived Telemetry Values
  const activeCounters = counters.filter((c) => c.currentSession && c.currentSession.isActive);
  const activeServices = services.filter((s) => s.isActive);
  const totalWaiting = predictions.reduce((acc, p) => acc + (p.waitingCount || 0), 0);

  // Aggregate Center Demand Level
  const highestDemand = predictions.some((p) => p.demandLevel === DemandLevel.SURGE)
    ? DemandLevel.SURGE
    : predictions.some((p) => p.demandLevel === DemandLevel.HIGH)
    ? DemandLevel.HIGH
    : predictions.some((p) => p.demandLevel === DemandLevel.MEDIUM)
    ? DemandLevel.MEDIUM
    : DemandLevel.LOW;

  const totalForecastedFootfall = predictions.reduce(
    (acc, p) => acc + (p.forecastedFootfallNextHour || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official State of the Centre - Command Header Strip */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Center Command Overview · Live Telemetry</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Facilitation & Queue Command Center
            </h2>
            <p className="text-xs text-slate-300">
              Bhopal Citizen Facilitation Center #01 · Government of Madhya Pradesh
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchOverviewData}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition inline-flex items-center gap-1.5"
              title="Refresh telemetry"
            >
              <span>↻ Sync</span>
              <span className="text-[10px] text-slate-400 font-mono">({lastSyncTime})</span>
            </button>

            <Link to="/admin/queue">
              <Button
                variant="primary"
                size="md"
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-xs"
              >
                <span>Open Queue Desk Cockpit →</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 5-Metric Command Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-800 text-xs">
          {/* Metric 1: Active Desks */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">
              Active Desks
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {activeCounters.length}
              </span>
              <span className="text-slate-400 text-[11px]">/ {counters.length} Total</span>
            </div>
          </div>

          {/* Metric 2: Active Services */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">
              Active Services
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {activeServices.length}
              </span>
              <span className="text-slate-400 text-[11px]">/ {services.length} Total</span>
            </div>
          </div>

          {/* Metric 3: Waiting Citizens */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">
              Waiting Citizens
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">{totalWaiting}</span>
              <span className="text-slate-400 text-[11px]">In Queue</span>
            </div>
          </div>

          {/* Metric 4: Net Footfall */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">
              Current Footfall
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {footfallSummary?.currentOccupancy ?? '0'}
              </span>
              <span className="text-slate-400 text-[11px]">Citizens in Center</span>
            </div>
          </div>

          {/* Metric 5: Demand Level */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold tracking-wider">
              Center Demand
            </span>
            <div className="mt-1">
              <Badge
                variant={
                  highestDemand === DemandLevel.SURGE || highestDemand === DemandLevel.HIGH
                    ? 'destructive'
                    : highestDemand === DemandLevel.MEDIUM
                    ? 'warning'
                    : 'success'
                }
                size="md"
              >
                {highestDemand}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <AlertBanner
          type="error"
          title="Telemetry Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {isLoading ? (
        <LoadingState message="Loading center command telemetry..." />
      ) : (
        /* Operational Two-Column Layout (Left 65% / Right 35%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT ~65% (8 cols): Department Service Queues & Physical Desks */}
          <div className="lg:col-span-8 space-y-6">
            {/* Department Service Queues Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Department Citizen Queues</CardTitle>
                  <CardDescription>
                    Real-time wait times, waiting citizens, and queue dispatch state
                  </CardDescription>
                </div>
                <Link to="/admin/services">
                  <Button variant="secondary" size="sm">
                    <span>Manage Services →</span>
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No services configured yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50">
                    {services.map((service) => {
                      const pred = predictions.find((p) => p.serviceId === service.id);
                      const waitSec = pred?.predictedWaitSeconds;
                      const count = pred?.waitingCount ?? 0;
                      const demand = pred?.demandLevel || DemandLevel.LOW;

                      return (
                        <div
                          key={service.id}
                          className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Badge variant="navy" size="sm" className="shrink-0 mt-0.5">
                              <span className="font-mono font-bold">{service.prefix}</span>
                            </Badge>
                            <div className="min-w-0">
                              <strong className="text-slate-900 block font-semibold truncate">
                                {service.name}
                              </strong>
                              <span className="text-slate-500 text-[11px] font-mono">
                                Code: {service.code} • SLA: {service.avgDurationMinutes}m
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 block">
                                {count} waiting
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ~{waitSec ? formatWaitTime(waitSec) : `${count * service.avgDurationMinutes}m`}
                              </span>
                            </div>

                            <Badge
                              variant={
                                demand === DemandLevel.HIGH || demand === DemandLevel.SURGE
                                  ? 'destructive'
                                  : demand === DemandLevel.MEDIUM
                                  ? 'warning'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {demand}
                            </Badge>

                            {service.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Open
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Physical Service Desks & Operator Shifts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Physical Counters & Operator Shifts</CardTitle>
                  <CardDescription>
                    Hardware desk status, logged-in operators, and shift timestamps
                  </CardDescription>
                </div>
                <Link to="/admin/counters">
                  <Button variant="secondary" size="sm">
                    <span>Manage Desks →</span>
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {counters.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No physical counters configured yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {counters.map((counter) => {
                      const hasSession = !!counter.currentSession?.isActive;
                      const operator =
                        counter.currentSession?.user?.name ||
                        counter.currentSession?.user?.email ||
                        'Active Shift';

                      return (
                        <div
                          key={counter.id}
                          className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">
                                Desk #{counter.counterNumber}
                              </span>
                              <span className="text-slate-500 font-normal">({counter.name})</span>
                            </div>

                            <span className="text-[11px] text-slate-600 block mt-1">
                              {hasSession ? (
                                <span className="font-semibold text-slate-800">
                                  Operator: {operator}
                                </span>
                              ) : (
                                <span className="text-slate-400">Desk Standby / Shift Closed</span>
                              )}
                            </span>

                            {hasSession && counter.currentSession?.openedAt && (
                              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                Shift Open:{' '}
                                {new Date(counter.currentSession.openedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            {hasSession ? (
                              <Badge variant="success" size="sm" dot pulse>
                                Shift Active
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Offline
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT ~35% (4 cols): IoT Footfall, Forecast Snapshot & Quick Links */}
          <div className="lg:col-span-4 space-y-5">
            {/* IoT Optical Gate Footfall Telemetry Snapshot */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>IoT Footfall Telemetry</CardTitle>
                  <Badge variant="navy" size="sm" dot pulse>
                    IoT SENSORS
                  </Badge>
                </div>
                <CardDescription>Optical gate counters & center occupancy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Current Building Occupancy
                  </span>
                  <span className="text-4xl font-black font-mono text-slate-900 block">
                    {footfallSummary?.currentOccupancy ?? '0'}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Peak Today: {footfallSummary?.peakOccupancyToday ?? '0'} citizens
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Inbound Today
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      +{footfallSummary?.todayCountIn ?? '0'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Outbound Today
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                      -{footfallSummary?.todayCountOut ?? '0'}
                    </span>
                  </div>
                </div>

                <Link to="/admin/footfall" className="block pt-1">
                  <Button variant="secondary" size="sm" fullWidth className="justify-between">
                    <span>Detailed Footfall Analytics</span>
                    <span>→</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Predictive Demand Engine Snapshot */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Demand & Rush Forecast</CardTitle>
                  <span className="text-base" aria-hidden="true">
                    🔮
                  </span>
                </div>
                <CardDescription>Statistical wait & arrival projections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Forecasted Next Hour</span>
                    <span className="font-mono font-bold text-slate-900">
                      ~{totalForecastedFootfall} citizens
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Demand State</span>
                    <Badge
                      variant={
                        highestDemand === DemandLevel.HIGH || highestDemand === DemandLevel.SURGE
                          ? 'destructive'
                          : highestDemand === DemandLevel.MEDIUM
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {highestDemand}
                    </Badge>
                  </div>
                </div>

                {/* Recommendations */}
                {predictions[0]?.recommendation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                    <strong>Statistical Recommendation:</strong> {predictions[0].recommendation}
                  </div>
                )}

                <Link to="/admin/predictions" className="block pt-1">
                  <Button variant="secondary" size="sm" fullWidth className="justify-between">
                    <span>Open Predictive Engine</span>
                    <span>→</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* System Health & Telemetry Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Health & Telemetry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Socket.IO Queue Sync</span>
                  <span
                    className={`font-bold font-mono ${
                      isSocketConnected ? 'text-emerald-700' : 'text-amber-600'
                    }`}
                  >
                    {isSocketConnected ? '● LIVE' : '○ RECONNECTING'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>API REST Subsystem</span>
                  <span
                    className={`font-bold font-mono ${
                      error ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {error ? '● DEGRADED' : '● OPERATIONAL'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>IoT Telemetry Source</span>
                  <span className="text-slate-700 font-bold font-mono">
                    {footfallSummary ? '● INGESTION / SIMULATOR' : '○ STANDBY'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Statistical Prediction Engine</span>
                  <span
                    className={`font-bold font-mono ${
                      predictions.length > 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {predictions.length > 0 ? '● ACTIVE' : '○ STANDBY'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
