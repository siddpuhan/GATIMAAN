import React, { useState, useEffect } from 'react';
import {
  ServiceDTO,
  QueueUpdatedPayload,
  REALTIME_EVENTS,
  REALTIME_TOPICS,
} from '@gatimaan/shared';
import { ServiceCard } from './ServiceCard.js';
import { getSocket } from '../../lib/socket.js';
import { LoadingState, EmptyState, ErrorState } from '../ui/FeedbackStates.js';

interface ServiceGridProps {
  services: ServiceDTO[];
  isLoading: boolean;
  error: string | null;
  issuingServiceId: string | null;
  onIssueTicket: (serviceId: string) => void;
  onRetry: () => void;
}

export function ServiceGrid({
  services,
  isLoading,
  error,
  issuingServiceId,
  onIssueTicket,
  onRetry,
}: ServiceGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [telemetryMap, setTelemetryMap] = useState<
    Record<string, { waitingCount: number; estimatedWaitSeconds?: number | null }>
  >({});

  // Centralized Socket.IO queue subscription for all active services
  useEffect(() => {
    if (!services || services.length === 0) return;

    const socket = getSocket();

    const handleQueueUpdate = (payload: QueueUpdatedPayload) => {
      if (payload?.serviceId) {
        setTelemetryMap((prev) => ({
          ...prev,
          [payload.serviceId]: {
            waitingCount: payload.waitingCount,
            estimatedWaitSeconds: payload.estimatedWaitSeconds,
          },
        }));
      }
    };

    services.forEach((s) => {
      socket.emit(REALTIME_TOPICS.QUEUE_SUBSCRIBE, { serviceId: s.id });
    });

    socket.on(REALTIME_EVENTS.QUEUE_UPDATED, handleQueueUpdate);

    return () => {
      socket.off(REALTIME_EVENTS.QUEUE_UPDATED, handleQueueUpdate);
      services.forEach((s) => {
        socket.emit(REALTIME_TOPICS.QUEUE_UNSUBSCRIBE, { serviceId: s.id });
      });
    };
  }, [services]);

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return <LoadingState message="Loading available services..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Load Services"
        message="We couldn't load the available services. Please check your connection and try again."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Available Citizen Services</h2>
          <p className="text-xs text-slate-500">
            Select a service to generate an instant digital queue token
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services (e.g. Aadhaar, Domicile)..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition shadow-2xs"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid of Services */}
      {filteredServices.length === 0 ? (
        <EmptyState
          title="No matching services found"
          message={
            searchQuery
              ? `No services matching "${searchQuery}". Try a different keyword.`
              : 'No services are currently available.'
          }
          action={
            searchQuery
              ? {
                  label: 'Clear Search',
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              waitingCount={telemetryMap[service.id]?.waitingCount}
              estimatedWaitSeconds={telemetryMap[service.id]?.estimatedWaitSeconds}
              isIssuing={issuingServiceId === service.id}
              onIssueTicket={onIssueTicket}
            />
          ))}
        </div>
      )}
    </div>
  );
}
