import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TicketDTO, TicketStatus } from '@gatimaan/shared';
import { getActiveTicketId, clearActiveTicketId, isActiveStatus } from '../lib/ticketStorage.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { Card, CardTitle, CardDescription } from '../components/ui/Card.js';
import { LoadingState } from '../components/ui/FeedbackStates.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CitizenDashboardPage() {
  const navigate = useNavigate();
  const [activeTicket, setActiveTicket] = useState<TicketDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkActiveTicket = useCallback(async () => {
    const storedId = getActiveTicketId();
    if (!storedId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tickets/${storedId}`);
      if (res.ok) {
        const data: TicketDTO = await res.json();
        if (isActiveStatus(data.status)) {
          setActiveTicket(data);
        } else {
          clearActiveTicketId();
          setActiveTicket(null);
        }
      } else {
        clearActiveTicketId();
        setActiveTicket(null);
      }
    } catch {
      // Retain stored ID on network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkActiveTicket();
  }, [checkActiveTicket]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
              Home
            </Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-700 font-bold">Citizen Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citizen Dashboard</h1>
          <p className="text-xs text-slate-500">
            Manage your active tokens, track queue progression, and access facilitation services
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/services">
            <Button variant="primary" size="sm">
              <span>+ Get New Token</span>
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Checking active queue tokens..." />
      ) : activeTicket ? (
        /* Tier 3 Focal Block: Active Ticket Dashboard Card */
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Citizen Token
              </div>
              <span className="text-xs text-slate-400">
                Issued: {activeTicket.issuedAt ? new Date(activeTicket.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase">Department Service</span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  {activeTicket.service?.name || 'Public Facilitation Service'}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  Prefix: {activeTicket.service?.prefix || '-'} • Code: {activeTicket.service?.code || '-'}
                </span>
              </div>

              {/* Dominant Token Number Display */}
              <div className="bg-slate-800/90 border border-slate-700/80 px-6 py-4 rounded-2xl text-center shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Your Token
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-widest block mt-0.5">
                  {activeTicket.ticketNumber}
                </span>
              </div>
            </div>

            {/* Subordinate Status & Destination Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                <div className="mt-1">
                  {activeTicket.status === TicketStatus.WAITING && (
                    <Badge variant="navy" size="sm" dot pulse className="bg-slate-700 text-slate-100 border-slate-600">
                      In Queue
                    </Badge>
                  )}
                  {activeTicket.status === TicketStatus.CALLED && (
                    <Badge variant="warning" size="sm" dot pulse className="bg-amber-500 text-white font-bold">
                      Summoned to Desk #{activeTicket.counter?.counterNumber || ''}
                    </Badge>
                  )}
                  {activeTicket.status === TicketStatus.SERVING && (
                    <Badge variant="success" size="sm" dot pulse className="bg-emerald-600 text-white font-bold">
                      Serving at Desk #{activeTicket.counter?.counterNumber || ''}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Desk</span>
                <span className="font-bold text-slate-100 block mt-1">
                  {activeTicket.counter ? `Counter #${activeTicket.counter.counterNumber} (${activeTicket.counter.name})` : 'Auto / Next Available'}
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Live Pass</span>
                <Link
                  to={`/ticket/${activeTicket.id}`}
                  className="font-bold text-emerald-400 hover:text-emerald-300 transition block mt-1"
                >
                  Open Live Tracking Pass →
                </Link>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold"
                onClick={() => navigate(`/ticket/${activeTicket.id}`)}
              >
                <span>View Full Live Status Pass</span>
                <span>→</span>
              </Button>

              <Link to="/services">
                <Button variant="outline" size="md" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                  <span>Browse More Services</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <Card className="text-center py-10 px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto text-2xl mb-4">
            🎫
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">No Active Tokens</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1">
            You do not currently have any active digital queue passes stored on this device.
          </CardDescription>
          <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/services">
              <Button variant="primary" size="md">
                <span>Browse Services & Get Token</span>
                <span>→</span>
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="md">
                <span>Return to Home</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Tier 2: Subordinate Citizen Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">How Token Tracking Works</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            When you generate a token, your browser stores the pass reference so you can return to
            this dashboard anytime without losing your queue position. When the counter operator
            summons your token, your screen will alert you with the designated counter number.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900">Citizen Helpline</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            For queries regarding citizen services, document requirements, or portal support, contact
            the MP Online toll-free helpline:
          </p>
          <p className="font-bold text-slate-900 text-xs">📞 1800-233-0194 (Mon - Sat, 9 AM - 6 PM)</p>
        </div>
      </div>
    </div>
  );
}
