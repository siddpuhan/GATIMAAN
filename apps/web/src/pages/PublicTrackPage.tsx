import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';

export function PublicTrackPage() {
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = tokenInput.trim();
    if (!cleanInput) {
      setError('Please enter a valid Token Number (e.g. DOM001) or Token ID');
      return;
    }
    setError(null);
    navigate(`/ticket/${cleanInput}`);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-800 transition">
          Home
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">Track Token</span>
      </div>

      {/* Tier 3 Focal Block: Main Track Section */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-800 space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Queue Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Track Your Queue Token
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Enter your Token Number or Token ID below to view your real-time waiting position,
            estimated wait duration, and counter dispatch status.
          </p>
        </div>

        {/* Search / Lookup Form */}
        <form onSubmit={handleTrackSubmit} className="max-w-xl space-y-3">
          <div>
            <label htmlFor="token-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Token Number or Token ID
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <input
                id="token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. DOM001 or 3fa85f64..."
                className="flex-1 px-4 py-3 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 font-mono uppercase"
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 shrink-0"
              >
                <span>Track Live Pass</span>
                <span>→</span>
              </Button>
            </div>
            {error && <p className="text-xs text-rose-400 font-medium mt-2">{error}</p>}
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: You can find your Token Number on your digital pass receipt or SMS confirmation.
          </p>
        </form>
      </div>

      {/* Tier 2: Helper Guidance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Where is my Token Number?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your Token Number is a short code prefixed by your department service (e.g.{' '}
            <strong className="font-mono text-slate-800">DOM001</strong> for Domicile Certificate,{' '}
            <strong className="font-mono text-slate-800">AAD012</strong> for Aadhaar Update).
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Need to generate a token?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            If you haven’t received a digital queue token yet, browse available department services to
            get one instantly.
          </p>
          <Link to="/services" className="block">
            <Button variant="outline" size="sm" fullWidth>
              <span>Browse Services →</span>
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Saved on this device?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            If you previously requested a token on this device, visit your dashboard to recover it
            automatically.
          </p>
          <Link to="/dashboard" className="block">
            <Button variant="outline" size="sm" fullWidth>
              <span>Go to Dashboard →</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
