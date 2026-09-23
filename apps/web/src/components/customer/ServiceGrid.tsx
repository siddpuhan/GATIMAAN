import React, { useState, useEffect } from 'react';
import {
  ServiceDTO,
  QueueUpdatedPayload,
  REALTIME_EVENTS,
  REALTIME_TOPICS,
} from '@gatimaan/shared';
import { ServiceCard } from './ServiceCard.js';
import { ServiceGridSkeleton } from './LoadingSkeleton.js';
import { getSocket } from '../../lib/socket.js';

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
  const [waitingCounts, setWaitingCounts] = useState<Record<string, number>>({});

  // Centralized Socket.IO queue subscription for all active services
  useEffect(() => {
    if (!services || services.length === 0) return;

    const socket = getSocket();

    const handleQueueUpdate = (payload: QueueUpdatedPayload) => {
      if (payload?.serviceId) {
        setWaitingCounts((prev) => ({
          ...prev,
          [payload.serviceId]: payload.waitingCount,
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
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <ServiceGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-lg font-bold">
          !
        </div>
        <h4 className="text-sm font-bold text-red-900">Failed to Load Services</h4>
        <p className="text-xs text-red-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition shadow-xs"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Available Government Services</h2>
          <p className="text-xs text-gray-500">
            Select a service to generate an instant digital queue ticket
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services (e.g. Aadhaar, Pan)..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-2xs"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
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
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid of Services */}
      {filteredServices.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">No matching services found</p>
          <p>Try searching for a different keyword or clear the search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              waitingCount={waitingCounts[service.id]}
              isIssuing={issuingServiceId === service.id}
              onIssueTicket={onIssueTicket}
            />
          ))}
        </div>
      )}
    </div>
  );
}
