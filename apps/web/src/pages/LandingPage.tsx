import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  // Real working animated queue state
  const [servingToken, setServingToken] = useState({
    number: 'DOM-104',
    desk: 'Counter 02',
    service: 'Domicile Certificate',
  });
  const [waitingQueue, setWaitingQueue] = useState([
    'DOM-105',
    'DOM-106',
    'DOM-107',
    'DOM-108',
    'DOM-109',
  ]);
  const [completedCount, setCompletedCount] = useState(43);
  const [tokenCounter, setTokenCounter] = useState(110);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Advance the queue by 1 step smoothly
  const advanceQueue = () => {
    setIsAdvancing(true);

    setTimeout(() => {
      setWaitingQueue((prev) => {
        const nextServing = prev[0] || 'DOM-105';
        const remaining = prev.slice(1);
        const nextNewToken = `DOM-${tokenCounter}`;

        setServingToken({
          number: nextServing,
          desk: nextServing.endsWith('2') || nextServing.endsWith('4') || nextServing.endsWith('6') || nextServing.endsWith('8') || nextServing.endsWith('0') ? 'Counter 02' : 'Counter 01',
          service: 'Domicile Certificate',
        });
        setCompletedCount((c) => c + 1);
        setTokenCounter((t) => t + 1);

        return [...remaining, nextNewToken];
      });

      setIsAdvancing(false);
    }, 450);
  };

  // Continuous auto-advancing queue timer
  useEffect(() => {
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      advanceQueue();
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, tokenCounter]);

  const handleScrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 w-full text-slate-900 pb-10">
      {/* 1. HERO — GATIMAAN PRODUCT IDENTITY (DARK NAVY FLOATING CARD) */}
      <section className="bg-[#0B1730] text-white rounded-3xl p-6 sm:p-10 lg:p-12 xl:p-14 border border-[#1e2e4f] relative overflow-hidden">
        {/* Subtle geometric background matrix */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"
          aria-hidden="true"
        />

        {/* Ambient emerald glow */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 bg-[#0E8F6E]/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
          {/* Left Column (Hero Content ~58%) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#162544] text-slate-200 text-xs font-semibold border border-[#24375e]">
              <span className="font-serif text-sm">🏛️</span>
              <span>MP Online · Lok Seva Management</span>
              <span className="text-slate-500">•</span>
              <span className="text-[#0E8F6E] font-bold">Smart Citizen Queue</span>
            </div>

            <h1 className="text-3xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Government services, without the waiting line.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
              Take a digital place in the queue, know when it&apos;s your turn, and arrive when you&apos;re
              called.
            </p>

            {/* CTAs (Strictly Primary and Secondary) */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/services">
                <button
                  type="button"
                  className="px-6 py-3.5 bg-[#0E8F6E] hover:bg-[#0c7a5e] text-white font-bold text-sm rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0E8F6E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1730]"
                >
                  <span>Get a Digital Token</span>
                  <span aria-hidden="true">→</span>
                </button>
              </Link>

              <a
                href="#how-it-works"
                onClick={handleScrollToHowItWorks}
                className="px-5 py-3.5 bg-[#162544] hover:bg-[#1f335c] text-slate-200 font-semibold text-sm rounded-xl border border-[#233862] transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <span>See How It Works</span>
                <span className="text-slate-400 text-xs" aria-hidden="true">
                  ↓
                </span>
              </a>
            </div>

            {/* Trust Micro-Row */}
            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 border-t border-[#1e2e4f]/80">
              <span className="flex items-center gap-1.5 pt-2">
                <span className="text-[#0E8F6E] font-bold">✓</span> No app download needed
              </span>
              <span className="flex items-center gap-1.5 pt-2">
                <span className="text-[#0E8F6E] font-bold">✓</span> Real-time position tracking
              </span>
              <span className="flex items-center gap-1.5 pt-2">
                <span className="text-[#0E8F6E] font-bold">✓</span> 100% Free public service
              </span>
            </div>
          </div>

          {/* Right Column: Framed GATIMAAN Product Visualization (~42%) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm bg-[#070F20] border-2 border-[#1e2e4f] rounded-2xl p-6 sm:p-7 space-y-5 relative">
              {/* Top Header */}
              <div className="flex items-center justify-between border-b border-[#1b2b4f] pb-3.5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white block">
                    GATIMAAN QUEUE
                  </span>
                  <span className="text-[11px] text-slate-400">Live digital dispatch</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E8F6E]">
                  <span className="w-2 h-2 rounded-full bg-[#0E8F6E] animate-pulse" />
                  Live
                </span>
              </div>

              {/* 1. NOW SERVING */}
              <div className="p-4 bg-[#0B1730] border border-[#1b2b4f] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E8F6E]">
                    NOW SERVING
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    Counter 02
                  </span>
                </div>
                <div className="text-3xl font-mono font-black text-white tracking-wider">
                  DOM-103
                </div>
                <div className="text-xs text-slate-400">
                  Domicile Certificate
                </div>
              </div>

              {/* Flow Arrow */}
              <div className="flex justify-center text-slate-500 text-xs">
                <span>↓</span>
              </div>

              {/* 2. YOUR PLACE */}
              <div className="p-4 bg-[#112244] border border-[#234275] rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    YOUR PLACE
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    ~6 min wait
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-white">#4</span>
                  <span className="text-xs text-slate-300">· 3 citizens ahead</span>
                </div>
              </div>

              {/* Flow Arrow */}
              <div className="flex justify-center text-slate-500 text-xs">
                <span>↓</span>
              </div>

              {/* 3. STATUS */}
              <div className="p-3 bg-[#0B1730]/80 border border-[#1b2b4f] rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Summon Alert</span>
                <span className="font-semibold text-slate-200">Arrive when called</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WATCH THE QUEUE MOVE — FRAMED DEMO (HEAVIER 2PX NAVY BORDER) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#08634B] mb-1">
              <span>● Interactive Demonstration</span>
              <span className="text-slate-700 font-semibold">· Simulated flow</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1730] tracking-tight">
              Watch the Queue Move
            </h2>
            <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1">
              Digital tokens continuously advance through the queue until summoned to the service counter.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-white border border-[#B8AEA4] hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer shadow-2xs"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              type="button"
              onClick={advanceQueue}
              className="px-3.5 py-1.5 bg-[#0B1730] hover:bg-[#162544] text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-2xs"
            >
              Next Token →
            </button>
          </div>
        </div>

        {/* Dynamic Queue Canvas — Framed with heavy 2px Navy Border */}
        <div className="bg-white border-2 border-[#1B263B] rounded-2xl p-6 sm:p-8 lg:p-10 space-y-8">
          {/* Waiting Queue Stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                WAITING IN DIGITAL QUEUE
              </span>
              <span className="text-xs font-mono font-semibold text-slate-600">
                Queue Speed: ~3 min / token
              </span>
            </div>

            {/* Horizontal Stream of Moving Tokens */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {waitingQueue.map((tok, idx) => (
                <div
                  key={tok}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                    idx === 0
                      ? 'bg-emerald-50/90 border-2 border-[#0E8F6E] scale-[1.02]'
                      : 'bg-[#F8FAFC] border border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        idx === 0
                          ? 'bg-[#0E8F6E] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {idx === 0 ? 'NEXT' : `#${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono font-semibold">
                      ~{(idx + 1) * 3} min
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-mono font-black text-[#0B1730] block">
                    {tok}
                  </span>
                  <span className="text-[11px] text-slate-600 mt-1 block font-semibold">
                    Domicile
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Directional Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>↓</span>
            <span>TOKEN CALLED TO SERVICE DESK</span>
            <span>↓</span>
          </div>

          {/* Now Serving Panel */}
          <div className="bg-[#0B1730] text-white rounded-2xl p-6 sm:p-8 border border-[#1e2e4f] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#162544] text-[#0E8F6E] text-xs font-semibold border border-[#24375e]">
                <span className="w-2 h-2 rounded-full bg-[#0E8F6E] animate-pulse" />
                <span>NOW SERVING AT COUNTER</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span
                  className={`text-4xl sm:text-5xl font-mono font-black tracking-wider text-white transition-all duration-300 ${
                    isAdvancing ? 'scale-105 text-emerald-300' : ''
                  }`}
                >
                  {servingToken.number}
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
                  {servingToken.desk}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {servingToken.service} · Citizen document verification at facilitation desk
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs relative z-10">
              <div className="p-3 bg-[#162544] border border-[#24375e] rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                  TODAY&apos;S THROUGHPUT
                </span>
                <span className="text-lg font-mono font-bold text-white mt-0.5 block">
                  {completedCount} Citizens Facilitated
                </span>
              </div>

              <Link to="/services">
                <button
                  type="button"
                  className="px-5 py-3 bg-[#0E8F6E] hover:bg-[#0c7a5e] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Get Real Token →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW GATIMAAN WORKS — 4-STEP CONNECTED PROCESS (STRUCTURED PROCESS COMPONENT) */}
      <section id="how-it-works" className="space-y-5 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              <span>Process Sequence</span>
              <span>•</span>
              <span>Citizen Journey</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1730] tracking-tight">
              How GATIMAAN Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1">
              From digital token issuance to counter facilitation in four transparent steps.
            </p>
          </div>
        </div>

        {/* Connected Step Surface (Architectural White Card with Process Track) */}
        <div className="bg-white border-2 border-[#1B263B] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 relative">
            {/* Step 01 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border-[1.5px] border-[#A8AEB8] flex flex-col justify-between space-y-4 relative group shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#0B1730] text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-2xs">
                  01
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  START
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#0B1730] uppercase tracking-wide">
                  Choose Service
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Browse the public services catalogue and select your required department desk from
                  any phone browser.
                </p>
              </div>
              {/* Desktop connector arrow */}
              <div
                className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 items-center justify-center text-[11px] font-bold text-slate-500 shadow-2xs"
                aria-hidden="true"
              >
                →
              </div>
            </div>

            {/* Step 02 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border-[1.5px] border-[#A8AEB8] flex flex-col justify-between space-y-4 relative group shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#0B1730] text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-2xs">
                  02
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  PASS
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#0B1730] uppercase tracking-wide">
                  Get Digital Token
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Receive an authenticated digital token pass with your unique number and initial wait
                  estimate.
                </p>
              </div>
              {/* Desktop connector arrow */}
              <div
                className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 items-center justify-center text-[11px] font-bold text-slate-500 shadow-2xs"
                aria-hidden="true"
              >
                →
              </div>
            </div>

            {/* Step 03 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border-[1.5px] border-[#A8AEB8] flex flex-col justify-between space-y-4 relative group shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#0B1730] text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-2xs">
                  03
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  REMOTE
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#0B1730] uppercase tracking-wide">
                  Track Position
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Watch real-time queue count and updated wait durations from anywhere without standing
                  in crowded lines.
                </p>
              </div>
              {/* Desktop connector arrow */}
              <div
                className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 items-center justify-center text-[11px] font-bold text-slate-500 shadow-2xs"
                aria-hidden="true"
              >
                →
              </div>
            </div>

            {/* Step 04 — Final Destination with Distinct Emerald Accent */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F0FDF4] border-[1.5px] border-[#0E8F6E] flex flex-col justify-between space-y-4 relative shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#0E8F6E] text-white flex items-center justify-center font-mono font-bold text-sm shrink-0 shadow-2xs">
                  04
                </div>
                <span className="text-[10px] font-mono font-bold text-[#08634B] bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-300/80">
                  DESK
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#08634B] uppercase tracking-wide">
                  Visit When Called
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  Proceed directly to your assigned counter desk the moment your token number is
                  summoned.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMPARISON — "THE QUEUE DOESN'T DISAPPEAR. THE WAITING DOES." */}
      <section className="space-y-5">
        <div className="max-w-3xl space-y-2 px-1">
          <h2 className="text-2xl sm:text-4xl font-black text-[#0B1730] tracking-tight">
            The queue doesn&apos;t disappear.<br />The waiting does.
          </h2>
          <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
            GATIMAAN gives citizens a digital place in the queue so they can spend their time
            elsewhere and arrive when their service is ready.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Model Panel (Light Structured Friction Model) */}
          <div className="p-6 sm:p-8 bg-white border-2 border-[#1B263B] rounded-2xl flex flex-col justify-between shadow-xs space-y-6 sm:space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    ● Physical Line Model
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#0B1730] mt-1">
                    Traditional In-Person Queue
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  Physical Lines
                </span>
              </div>

              {/* Vertical Step Timeline — Continuous Process */}
              <div className="relative pl-11 space-y-6 sm:space-y-7 before:absolute before:top-3.5 before:bottom-3.5 before:left-[13px] before:w-0.5 before:bg-rose-200">
                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    01
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-[#0B1730] uppercase tracking-wide">
                      Physical Arrival
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      Arrive early at the service centre and stand in a physical queue before your
                      service can begin.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    02
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-[#0B1730] uppercase tracking-wide">
                      Limited Visibility
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      Wait on-site without clear visibility into your position or how quickly the
                      queue is moving.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    03
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-[#0B1730] uppercase tracking-wide">
                      Centre Congestion
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      Crowded facilitation areas create congestion, uncertainty and unnecessary time
                      spent at the centre.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    04
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-[#0B1730] uppercase tracking-wide">
                      On-Site Waiting
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                      Citizens remain physically present throughout the waiting period before
                      finally reaching the service counter.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GATIMAAN Smart Queue Panel (Dark Navy Digital Dispatch Model) */}
          <div className="p-6 sm:p-8 bg-[#0B1730] text-white border-2 border-[#1B263B] rounded-2xl flex flex-col justify-between shadow-md space-y-6 sm:space-y-8 relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between border-b border-[#1e2e4f] pb-4">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-[#162544] px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Digital Dispatch Model
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    GATIMAAN Smart Queue
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-300 font-bold bg-[#162544] px-2.5 py-1 rounded-md border border-[#24375e]">
                  Digital Dispatch
                </span>
              </div>

              {/* Vertical Step Digital Pipeline — Continuous Process */}
              <div className="relative pl-11 space-y-6 sm:space-y-7 before:absolute before:top-3.5 before:bottom-3.5 before:left-[13px] before:w-0.5 before:bg-[#0E8F6E]/40">
                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-[#162544] border border-[#0E8F6E] text-[#0E8F6E] font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    01
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                      Digital Token
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal">
                      Generate a digital queue token from your smartphone without needing to stand in
                      a physical line.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-[#162544] border border-[#0E8F6E] text-[#0E8F6E] font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    02
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                      Live Position
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal">
                      Track your live queue position, citizens ahead and estimated waiting time from
                      anywhere.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-[#162544] border border-[#0E8F6E] text-[#0E8F6E] font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    03
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                      Desk Summon
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal">
                      Receive an on-screen notification when your token is approaching or your
                      assigned desk is ready.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <span className="w-7 h-7 rounded-full bg-[#162544] border border-[#0E8F6E] text-[#0E8F6E] font-mono font-bold text-xs flex items-center justify-center shrink-0 absolute -left-11 top-0 shadow-2xs">
                    04
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                      Direct Service
                    </h4>
                    <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed font-normal">
                      Arrive at the centre when required and proceed directly to the assigned counter
                      for service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PUBLIC SERVICE TRUST & GUARANTEES (STRUCTURED CAPABILITIES BANNER) */}
      <section className="p-6 sm:p-8 lg:p-10 bg-white border-2 border-[#1B263B] rounded-2xl shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <div className="lg:col-span-6 space-y-2 lg:border-r lg:border-slate-200 lg:pr-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300">
              <span>🏛️</span>
              <span>MP Online Public Service Facilitation</span>
            </div>
            <h3 className="font-black text-[#0B1730] text-lg sm:text-xl tracking-tight">
              Built for Public Service Delivery
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal">
              Operated under MP Online for transparent, dignified citizen facilitation across Madhya
              Pradesh Lok Seva Kendras.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-900">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/90 flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-[#08634B] flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </span>
              <span>Official digital token</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/90 flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-[#08634B] flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </span>
              <span>Real-time queue sync</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/90 flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-[#08634B] flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </span>
              <span>No app install needed</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/90 flex items-center gap-3">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-[#08634B] flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </span>
              <span>100% Free public service</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


