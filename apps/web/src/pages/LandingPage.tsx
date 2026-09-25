import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';

export function LandingPage() {
  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* 1. Government Identity Notice Bar */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="font-bold text-slate-900">
            MP Online Citizen Facilitation Network
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-600 hidden sm:inline">
            Real-Time Token Issuance & Queue Telemetry
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold text-slate-600">
          <Link to="/services" className="hover:text-slate-900 transition">
            Citizen Services Catalog →
          </Link>
        </div>
      </div>

      {/* 2. Asymmetric Hero Section (55% Left Info / 45% Right Live Queue Visual) */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column ~55% (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
              <span className="font-serif">🏛️</span>
              <span>Government of Madhya Pradesh · लोक सेवा प्रबंधन विभाग</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Fast-Track Citizen Services with Digital Smart Queues
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Eliminate physical line congestion at Tehsil and Municipal facilitation centres. Generate
              an instant digital pass on your phone, track your live waiting position in real time, and
              walk directly to your assigned service desk when summoned.
            </p>

            {/* Primary & Secondary Call to Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link to="/services">
                <Button variant="primary" size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6">
                  <span>Get a Digital Token</span>
                  <span aria-hidden="true">→</span>
                </Button>
              </Link>

              <Link to="/track">
                <Button variant="outline" size="lg" className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                  <span>Track Existing Token</span>
                </Button>
              </Link>
            </div>

            {/* Supporting Micro-Stats */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Average Wait</span>
                <span className="text-base sm:text-lg font-bold text-white mt-0.5 block font-mono">~10-15 min</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Citizen Desks</span>
                <span className="text-base sm:text-lg font-bold text-white mt-0.5 block font-mono">Multi-Counter</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Telemetry Sync</span>
                <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block font-mono">Real-Time</span>
              </div>
            </div>
          </div>

          {/* Right Column ~45% (5 cols): Visual Token-Progress & Queue Status Representation */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Sample Pass Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Live Token Pass Preview
                  </span>
                </div>
                <Badge variant="navy" size="sm" className="bg-slate-800 text-slate-200 border-slate-700">
                  DOMICILE
                </Badge>
              </div>

              {/* Big Dominant Token Number Display */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Token Number
                </span>
                <span className="text-5xl font-black font-mono text-white tracking-widest block drop-shadow-sm">
                  DOM-104
                </span>
                <span className="text-xs text-slate-300 font-semibold block">
                  स्थानीय निवासी प्रमाण पत्र · Domicile Certificate
                </span>
              </div>

              {/* Live Status Indicators */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Position</span>
                  <span className="text-base font-bold font-mono text-white block mt-0.5">#4</span>
                  <span className="text-[9px] text-slate-500 block">3 ahead</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Est. Wait</span>
                  <span className="text-base font-bold text-white block mt-0.5">~6 min</span>
                  <span className="text-[9px] text-slate-500 block">Fast pace</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Desk</span>
                  <span className="text-base font-bold font-mono text-emerald-400 block mt-0.5">#02</span>
                  <span className="text-[9px] text-slate-500 block">Assigned</span>
                </div>
              </div>

              {/* Live Broadcast Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Socket.IO Queue Sync</span>
                <span className="text-emerald-400 font-medium font-mono">● LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Connected 4-Step How It Works Flow */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            How GATIMAAN Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A frictionless, transparent 4-step journey from token generation to counter facilitation
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                1
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Step 01</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Choose Service</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Select your required department from Revenue, Municipal, Utility, or Citizen desks.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                2
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Step 02</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Get Digital Token</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Receive an authenticated digital pass with your unique token number and wait estimation.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                3
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Step 03</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Track Your Turn</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Watch live queue progression and citizens ahead from your phone browser without standing in line.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 relative shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                4
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Step 04</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Visit the Counter</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                When summoned, proceed directly to your designated desk number for swift facilitation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why GATIMAAN Section */}
      <section className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Key Benefits of GATIMAAN
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Civic efficiency and transparent delivery built for citizen facilitation centres
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-base block">⏱️</span>
            <h3 className="text-sm font-bold text-slate-900">Transparent Wait Status</h3>
            <p className="leading-relaxed">
              Real-time algorithms compute dynamic wait durations based on active desk processing speed.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-base block">🚫</span>
            <h3 className="text-sm font-bold text-slate-900">Zero Physical Congestion</h3>
            <p className="leading-relaxed">
              Eliminates standing crowds in government facilitation halls by enabling remote queue tracking.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-base block">📋</span>
            <h3 className="text-sm font-bold text-slate-900">Easy Service Discovery</h3>
            <p className="leading-relaxed">
              Structured departmental catalogues for Revenue, Municipal, Utility, and Aadhaar citizen desks.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-2xs">
            <span className="text-base block">📱</span>
            <h3 className="text-sm font-bold text-slate-900">Instant Mobile Tracking</h3>
            <p className="leading-relaxed">
              Access digital passes and desk summon notifications from any smartphone without app downloads.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Citizen ↔ GATIMAAN ↔ Service Centre ↔ Admin Visual Flow */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Platform Coordination Ecosystem
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            How citizens, digital queue telemetry, service counters, and administrators connect seamlessly
          </p>
        </div>

        {/* Visual System Flowchart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                01 · CITIZEN
              </span>
              <span className="text-xs font-mono text-slate-400">Portal</span>
            </div>
            <h3 className="text-sm font-bold text-white">Requests Token & Tracks</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Citizens select public services, receive instant digital passes, and monitor wait times on their phones.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                02 · GATIMAAN
              </span>
              <span className="text-xs font-mono text-slate-400">Engine</span>
            </div>
            <h3 className="text-sm font-bold text-white">Queue Telemetry Dispatch</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Calculates wait estimates, balances desk workloads, and broadcasts real-time WebSocket events.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                03 · SERVICE CENTRE
              </span>
              <span className="text-xs font-mono text-slate-400">Counters</span>
            </div>
            <h3 className="text-sm font-bold text-white">Physical Desk Facilitation</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Desk operators summon waiting citizens, complete document verifications, and record service times.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                04 · ADMIN / STAFF
              </span>
              <span className="text-xs font-mono text-slate-400">Command</span>
            </div>
            <h3 className="text-sm font-bold text-white">Center SLA Oversight</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Supervisors monitor center footfall, adjust desk assignments, and ensure transparent public service.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
