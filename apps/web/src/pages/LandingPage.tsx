import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ServiceDTO, TicketDTO } from '@gatimaan/shared';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.js';
import { LiveIndicator } from '../components/citizen/LiveIndicator.js';
import {
  getActiveTicketId,
  isActiveStatus,
  clearActiveTicketId,
} from '../lib/ticketStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function LandingPage() {
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [activeTicket, setActiveTicket] = useState<TicketDTO | null>(null);

  // 1. Fetch available services catalogue
  const fetchServices = useCallback(async () => {
    try {
      setIsLoadingServices(true);
      const res = await fetch(`${API_BASE}/api/services`);
      if (res.ok) {
        const data: ServiceDTO[] = await res.json();
        setServices(data.filter((s) => s.isActive));
      }
    } catch {
      // Gracefully retain empty array on network failure
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // 2. Check for active ticket in local storage
  const checkActiveTicket = useCallback(async () => {
    const storedId = getActiveTicketId();
    if (!storedId) return;

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
      // Offline / network failure: retain state without crashing
    }
  }, []);

  useEffect(() => {
    fetchServices();
    checkActiveTicket();
  }, [fetchServices, checkActiveTicket]);

  // Featured services for the popular services section (first 6 active services)
  const popularServices = services.slice(0, 6);

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* 1. Government Identity & Center Operating Status Notice Bar */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LiveIndicator state="live" />
          <span className="font-bold text-slate-900">
            MP Online Citizen Facilitation Network
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-600 hidden sm:inline">
            Bhopal Central Facilitation Centre
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold text-slate-700">
          <span className="text-slate-500 text-[11px] hidden md:inline">
            Mon–Sat: 9:00 AM – 6:00 PM IST
          </span>
          <Link
            to="/services"
            className="text-slate-900 hover:text-emerald-800 transition inline-flex items-center gap-1 font-bold"
          >
            <span>Citizen Services Catalogue</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* 2. Citizen-First Hero Section (Asymmetric: Narrative Left + Live Pass Preview Right) */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-slate-800 relative overflow-hidden">
        {/* Subtle ambient lighting accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left Column (Hero Content ~58%) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
              <span className="font-serif text-sm">🏛️</span>
              <span>Government of Madhya Pradesh · लोक सेवा प्रबंधन विभाग</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Get your government service without waiting in a long queue.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Choose your public service, generate a verified digital token on your phone, track your
              live queue position from anywhere, and walk directly to your assigned counter desk when
              summoned.
            </p>

            {/* Contextual Primary & Secondary Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link to="/services">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 shadow-xs border-white"
                >
                  <span>Find a Service</span>
                  <span aria-hidden="true">→</span>
                </Button>
              </Link>

              {activeTicket ? (
                <Link to={`/ticket/${activeTicket.id}`}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200 font-bold"
                  >
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                      aria-hidden="true"
                    />
                    <span>View My Active Token ({activeTicket.ticketNumber})</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <span>Citizen Dashboard</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Micro-Metrics & Service Commitments */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Token Issuance
                </span>
                <span className="text-base sm:text-lg font-bold text-white mt-0.5 block font-mono">
                  100% Free
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Access Mode
                </span>
                <span className="text-base sm:text-lg font-bold text-white mt-0.5 block font-mono">
                  No App Needed
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Wait Estimates
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block font-mono">
                  Live Telemetry
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Live Token Pass Representation (~42%) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950/85 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Live Token Pass Preview
                  </span>
                </div>
                <Badge
                  variant="navy"
                  size="sm"
                  className="bg-slate-800 text-slate-200 border-slate-700"
                >
                  DOMICILE
                </Badge>
              </div>

              {/* Token Number Display */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Token Number
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-widest block drop-shadow-sm">
                  DOM-104
                </span>
                <span className="text-xs text-slate-300 font-semibold block pt-0.5">
                  स्थानीय निवासी प्रमाण पत्र · Domicile Certificate
                </span>
              </div>

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Position
                  </span>
                  <span className="text-base font-bold font-mono text-white block mt-0.5">#4</span>
                  <span className="text-[9px] text-slate-400 block">3 ahead</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Est. Wait
                  </span>
                  <span className="text-base font-bold text-emerald-400 block mt-0.5">~6 min</span>
                  <span className="text-[9px] text-slate-400 block">Fast pace</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Desk
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5">#02</span>
                  <span className="text-[9px] text-slate-400 block">Assigned</span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Realtime Center Telemetry
                </span>
                <span className="font-mono text-slate-400">Lok Seva Kendra</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Centre Operating Status Card */}
      <section>
        <Card variant="flat" className="p-5 sm:p-6 bg-slate-50 border-slate-200/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Center Operational Status
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bhopal Lok Seva Facilitation Complex · Live Center Telemetry
              </p>
            </div>
            <Badge variant="success" size="md">
              Operational & Issuing Tokens
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] block font-medium">Active Catalogue</span>
              <span className="text-sm font-bold text-slate-900 block font-mono">
                {services.length > 0 ? `${services.length} Public Services` : '10 Services Available'}
              </span>
              <span className="text-slate-500 text-[11px] block">Revenue, Municipal, Identity</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] block font-medium">Operating Schedule</span>
              <span className="text-sm font-bold text-slate-900 block">Mon – Sat: 9 AM – 6 PM</span>
              <span className="text-slate-500 text-[11px] block">Closed Sundays & Holidays</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] block font-medium">Pass Delivery</span>
              <span className="text-sm font-bold text-slate-900 block">Instant Web & SMS</span>
              <span className="text-slate-500 text-[11px] block">Direct token confirmation</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] block font-medium">Queue Estimation</span>
              <span className="text-sm font-bold text-emerald-700 block">Dynamic Realtime</span>
              <span className="text-slate-500 text-[11px] block">Calculated upon service selection</span>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Connected 4-Step How GATIMAAN Works Flow */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Process</span>
            <span>•</span>
            <span>How GATIMAAN Works</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            A Transparent 4-Step Citizen Experience
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            From service selection to counter facilitation — transparent, orderly, and fast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                Step 01
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Choose Service</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Browse our departmental catalogue to select your required revenue, municipal, or
                certificate service.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                Step 02
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Get Digital Token</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Generate an authenticated digital pass with your unique token number and initial wait
                estimate.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                3
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                Step 03
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Track Your Position</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Watch live queue progression, citizens ahead, and updated wait times on your phone
                browser.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                4
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">
                Step 04
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Visit When Called</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                When your token number is summoned, walk directly to your designated counter desk for
                facilitation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Popular Public Services Section (Dynamic from /api/services) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Catalogue</span>
              <span>•</span>
              <span>Public Services</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Popular Citizen Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a service below to generate an instant token or explore all available public
              desks.
            </p>
          </div>

          <Link to="/services" className="shrink-0">
            <Button variant="outline" size="sm" className="font-semibold text-xs">
              <span>View All Services ({services.length || '10'})</span>
              <span aria-hidden="true">→</span>
            </Button>
          </Link>
        </div>

        {/* Dynamic Grid / Skeleton Loading */}
        {isLoadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 animate-pulse"
              >
                <div className="w-16 h-5 bg-slate-200 rounded-md" />
                <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
                <div className="w-full h-10 bg-slate-100 rounded-md" />
                <div className="w-1/2 h-4 bg-slate-100 rounded-md pt-2" />
              </div>
            ))}
          </div>
        ) : popularServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularServices.map((svc) => (
              <Card
                key={svc.id}
                className="hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="navy" size="sm">
                      {svc.code}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ~{svc.avgDurationMinutes} min avg
                    </span>
                  </div>
                  <CardTitle className="text-base line-clamp-1">{svc.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[32px]">
                    {svc.description || 'Public service desk facilitation at Lok Seva Kendra.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/services" className="block w-full">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="text-xs font-semibold justify-between bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    >
                      <span>Select Service</span>
                      <span aria-hidden="true">→</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Fallback static preview if offline or no backend connection */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                code: 'AADHAAR',
                name: 'Aadhaar Biometric & Demographic Update',
                desc: 'Address change, mobile number linkage, photo and fingerprint updates.',
                time: '15 min',
              },
              {
                code: 'DOMICILE',
                name: 'Domicile & Native Residence Certificate',
                desc: 'M.P. local resident proof issued by the Tehsildar & Sub-Divisional Magistrate.',
                time: '12 min',
              },
              {
                code: 'INCOME',
                name: 'Income & Asset Certificate',
                desc: 'Official income evaluation certificate for state scholarships and welfare schemes.',
                time: '10 min',
              },
              {
                code: 'LAND',
                name: 'Khasra / Khatauni Certified Land Records',
                desc: 'Official certified copies of land ownership records, map mutations, and titling.',
                time: '10 min',
              },
              {
                code: 'BIRTH',
                name: 'Birth & Death Civil Registration',
                desc: 'Municipal vital statistics record issuance, digital extract, and corrections.',
                time: '15 min',
              },
              {
                code: 'RATION',
                name: 'Public Food Security & Ration Card',
                desc: 'New BPL/APL card issuance, member additions, and biometric e-KYC validation.',
                time: '20 min',
              },
            ].map((svc) => (
              <Card
                key={svc.code}
                className="hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="navy" size="sm">
                      {svc.code}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-mono">~{svc.time} avg</span>
                  </div>
                  <CardTitle className="text-base line-clamp-1">{svc.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[32px]">
                    {svc.desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link to="/services" className="block w-full">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="text-xs font-semibold justify-between bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    >
                      <span>Select Service</span>
                      <span aria-hidden="true">→</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 6. Smart Queue / "Know Before You Go" Value Grid */}
      <section className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Benefits</span>
            <span>•</span>
            <span>Civic Dignity</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Why Citizens Rely on GATIMAAN
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Public facilitation designed for transparent pacing, clear desk dispatch, and zero physical standing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
          <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-lg block">⏱️</span>
            <h3 className="text-sm font-bold text-slate-900">Live Position Visibility</h3>
            <p className="leading-relaxed">
              Know exactly how many citizens are ahead of you in line and watch your queue count advance in real time.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-lg block">📊</span>
            <h3 className="text-sm font-bold text-slate-900">Dynamic Wait Estimates</h3>
            <p className="leading-relaxed">
              Statistical algorithms calculate estimated wait times based on live desk processing speeds.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-lg block">🔔</span>
            <h3 className="text-sm font-bold text-slate-900">Desk Summon Alerts</h3>
            <p className="leading-relaxed">
              Get an instant visual callout and audio notification the moment your assigned counter desk calls your token.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-lg block">🪑</span>
            <h3 className="text-sm font-bold text-slate-900">Zero Line Standing</h3>
            <p className="leading-relaxed">
              Wait comfortably in shaded seating areas or nearby without crowding counters or standing in queues.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Citizen Trust & Public Service Support Section */}
      <section>
        <Card className="border-slate-200/80">
          <CardHeader>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Assurance</span>
              <span>•</span>
              <span>Public Service Standards</span>
            </div>
            <CardTitle className="text-lg">Citizen Rights & Centre Facilitation</CardTitle>
            <CardDescription>
              Government of Madhya Pradesh Lok Seva guarantees for every citizen
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-base block">🏛️</span>
                <strong className="text-slate-900 block">Official Digital Tokens</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Every token generated through GATIMAAN is recognized by all facilitation center desk operators.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-base block">💸</span>
                <strong className="text-slate-900 block">100% Free Service</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Token issuance and queue tracking are entirely free public services with no additional service fee.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-base block">🔒</span>
                <strong className="text-slate-900 block">Privacy Protected</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Your phone number and details are used strictly for your immediate token queue dispatch notifications.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-base block">♿</span>
                <strong className="text-slate-900 block">Priority Help Desk</strong>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Dedicated in-person facilitation at Counter #1 for senior citizens and persons with disabilities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

