import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { TicketDTO, QueuePositionDTO, TicketUpdatedPayload } from '@gatimaan/shared';
import { TicketLiveCard } from '../components/customer/TicketLiveCard.js';
import { CancelTicketModal } from '../components/customer/CancelTicketModal.js';
import { LoadingState, ErrorState, AlertBanner } from '../components/ui/FeedbackStates.js';
import { Badge } from '../components/ui/Badge.js';
import { useTicketSubscription } from '../hooks/useRealtime.js';
import {
  setActiveTicketId,
  clearActiveTicketId,
  isActiveStatus,
} from '../lib/ticketStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function TicketTrackingPage() {
  const { id: ticketId } = useParams<{ id: string }>();
  const location = useLocation();
  const initialTicket = (location.state as { initialTicket?: TicketDTO } | undefined)?.initialTicket;

  const [ticket, setTicket] = useState<TicketDTO | null>(
    initialTicket && initialTicket.id === ticketId ? initialTicket : null
  );
  const [positionData, setPositionData] = useState<QueuePositionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTicket || initialTicket.id !== ticketId);
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
          throw new Error('Token not found. Please check your Token ID.');
        }
        const data = await ticketRes.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load token details.');
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
      setError(err instanceof Error ? err.message : 'Error fetching token');
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
  // Ensure subscription strictly uses the resolved database UUID (never raw token string like A001)
  const isUuidParam = ticketId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
  const resolvedTicketId = ticket?.id || (isUuidParam ? ticketId : null);

  const handleRealtimeUpdate = useCallback(
    (payload: TicketUpdatedPayload) => {
      if (
        payload.ticket &&
        (payload.ticket.id === resolvedTicketId ||
          payload.ticket.id === ticket?.id ||
          payload.ticket.id === ticketId ||
          (ticketId && payload.ticket.ticketNumber.toUpperCase() === ticketId.toUpperCase()))
      ) {
        setTicket(payload.ticket);

        if (isActiveStatus(payload.ticket.status)) {
          setActiveTicketId(payload.ticket.id);
        } else {
          clearActiveTicketId();
        }

        // When ticket transitions out of WAITING (e.g. CALLED, SERVING, COMPLETED),
        // position is known to be 0 without requiring a server REST roundtrip.
        if (payload.ticket.status !== 'WAITING') {
          setPositionData((prev) =>
            prev
              ? {
                ...prev,
                status: payload.ticket.status,
                position: 0,
                aheadCount: 0,
                estimatedWaitSeconds: null,
              }
              : null
          );
        } else if (ticketId) {
          // Re-fetch position only when still waiting and queue state advances
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
    [resolvedTicketId, ticket?.id, ticketId]
  );

  useTicketSubscription(resolvedTicketId, handleRealtimeUpdate);

  // 3. Cancel Ticket Handler
  const handleConfirmCancel = async () => {
    const targetId = ticket?.id || ticketId;
    if (!targetId) return;

    try {
      setIsCancelling(true);
      setCancelError(null);

      const res = await fetch(`${API_BASE}/api/tickets/${targetId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to cancel token');
      }

      const data = await res.json();
      setTicket(data.ticket);
      clearActiveTicketId();
      setShowCancelModal(false);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Error cancelling token');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading live queue token..." />;
  }

  if (error || !ticket) {
    return (
      <ErrorState
        title="Token Not Found"
        message={error || 'The requested queue token could not be located. Please check the Token ID.'}
        onRetry={() => (ticketId ? fetchTicketData(ticketId) : undefined)}
      />
    );
  }

  return (
    <div className="py-2 space-y-6 max-w-2xl mx-auto">
      {/* Top Breadcrumb & Live Socket Status */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <Link
          to="/services"
          className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Services Catalogue</span>
        </Link>

        <Badge variant="success" size="sm" dot pulse>
          Live Realtime Pass
        </Badge>
      </div>

      {/* Cancellation Error Alert */}
      {cancelError && (
        <AlertBanner
          type="error"
          title="Cancellation Failed"
          message={cancelError}
          onClose={() => setCancelError(null)}
        />
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
          className="text-xs text-slate-500 hover:text-slate-900 font-semibold inline-flex items-center gap-1 transition"
        >
          Book another service or return to catalog →
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
