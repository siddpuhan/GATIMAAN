import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TicketDTO, QueuePositionDTO, TicketUpdatedPayload } from '@gatimaan/shared';
import { TicketLiveCard } from '../components/customer/TicketLiveCard.js';
import { CancelTicketModal } from '../components/customer/CancelTicketModal.js';
import { TicketCardSkeleton } from '../components/customer/LoadingSkeleton.js';
import { useTicketSubscription } from '../hooks/useRealtime.js';
import {
  setActiveTicketId,
  clearActiveTicketId,
  isActiveStatus,
} from '../lib/ticketStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function TicketTrackingPage() {
  const { id: ticketId } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<TicketDTO | null>(null);
  const [positionData, setPositionData] = useState<QueuePositionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // 1. Fetch Ticket details & Position
  const fetchTicketData = useCallback(async (id: string) => {
    try {
      setError(null);
      const [ticketRes, posRes] = await Promise.all([
        fetch(`${API_BASE}/api/tickets/${id}`),
        fetch(`${API_BASE}/api/tickets/${id}/position`),
      ]);

      if (!ticketRes.ok) {
        if (ticketRes.status === 404) {
          throw new Error('Ticket not found. Please check your Ticket ID.');
        }
        const data = await ticketRes.json();
        throw new Error(data.message || 'Failed to load ticket details.');
      }

      const ticketData: TicketDTO = await ticketRes.json();
      setTicket(ticketData);

      // Manage local storage based on lifecycle state
      if (isActiveStatus(ticketData.status)) {
        setActiveTicketId(ticketData.id);
      } else {
        clearActiveTicketId();
      }

      if (posRes.ok) {
        const posData: QueuePositionDTO = await posRes.json();
        setPositionData(posData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching ticket');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ticketId) {
      fetchTicketData(ticketId);
    }
  }, [ticketId, fetchTicketData]);

  // 2. Realtime Ticket Subscription via Socket.IO
  const handleRealtimeUpdate = useCallback(
    (payload: TicketUpdatedPayload) => {
      if (payload.ticket && payload.ticket.id === ticketId) {
        setTicket(payload.ticket);

        if (isActiveStatus(payload.ticket.status)) {
          setActiveTicketId(payload.ticket.id);
        } else {
          clearActiveTicketId();
        }

        // Re-fetch position when queue state or status changes
        if (ticketId) {
          fetch(`${API_BASE}/api/tickets/${ticketId}/position`)
            .then((r) => (r.ok ? r.json() : null))
            .then((pos) => {
              if (pos) setPositionData(pos);
            })
            .catch(() => {
              // Ignore background fetch error
            });
        }
      }
    },
    [ticketId]
  );

  useTicketSubscription(ticketId, handleRealtimeUpdate);

  // 3. Cancel Ticket Handler
  const handleConfirmCancel = async () => {
    if (!ticketId) return;

    try {
      setIsCancelling(true);
      setCancelError(null);

      const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel ticket');
      }

      const data = await res.json();
      setTicket(data.ticket);
      clearActiveTicketId();
      setShowCancelModal(false);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Error cancelling ticket');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <TicketCardSkeleton />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 text-center space-y-4 bg-white rounded-3xl border border-gray-200 shadow-sm mt-6">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-gray-900">Ticket Not Found</h3>
        <p className="text-xs text-gray-500">{error || 'The requested queue ticket could not be found.'}</p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            ← Return to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-6 max-w-2xl mx-auto">
      {/* Top Breadcrumb & Live Socket Status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>All Services</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Realtime Live Pass</span>
        </div>
      </div>

      {/* Cancellation Error Alert */}
      {cancelError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {cancelError}
        </div>
      )}

      {/* Live Ticket Digital Card */}
      <TicketLiveCard
        ticket={ticket}
        positionData={positionData}
        onOpenCancelModal={() => setShowCancelModal(true)}
      />

      {/* Quick Action Footer */}
      <div className="text-center pt-2 space-y-2">
        <Link
          to="/"
          className="text-xs text-gray-500 hover:text-gray-800 font-medium inline-flex items-center gap-1 transition"
        >
          Book another service or return home →
        </Link>
      </div>

      {/* Confirmation Modal */}
      <CancelTicketModal
        isOpen={showCancelModal}
        ticketNumber={ticket.ticketNumber}
        isCancelling={isCancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelModal(false)}
      />
    </div>
  );
}
