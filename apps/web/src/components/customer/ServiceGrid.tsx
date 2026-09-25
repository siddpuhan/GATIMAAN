import React, { useState, useEffect, useMemo } from 'react';
import {
  ServiceDTO,
  QueueUpdatedPayload,
  REALTIME_EVENTS,
  REALTIME_TOPICS,
} from '@gatimaan/shared';
import { ServiceCard } from './ServiceCard.js';
import { getSocket } from '../../lib/socket.js';
import { Badge } from '../ui/Badge.js';
import { LoadingState, EmptyState, ErrorState } from '../ui/FeedbackStates.js';

interface ServiceGridProps {
  services: ServiceDTO[];
  isLoading: boolean;
  error: string | null;
  issuingServiceId: string | null;
  onIssueTicket: (serviceId: string) => void;
  onRetry: () => void;
}

interface CategoryDefinition {
  id: string;
  name: string;
  hindiName: string;
  description: string;
  icon: string;
  codes: string[];
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'revenue',
    name: 'Revenue & Tehsil Services',
    hindiName: 'राजस्व एवं तहसील सेवाएं',
    description: 'Domicile, Income, Caste, EWS, and Land Record certifications',
    icon: '🏛️',
    codes: ['DOM', 'INC', 'CAST', 'EWS', 'LAND', 'REV'],
  },
  {
    id: 'municipal',
    name: 'Municipal & Local Body Services',
    hindiName: 'नगर निगम एवं स्थानीय निकाय सेवाएं',
    description: 'Birth certificates, Death registrations, and urban local body facilitation',
    icon: '🏢',
    codes: ['BTH', 'DTH'],
  },
  {
    id: 'utility',
    name: 'Utility & Bill Payments',
    hindiName: 'उपयोगिता एवं बिल भुगतान',
    description: 'Electricity bill payments, civic utility facilitation, and fees',
    icon: '⚡',
    codes: ['ELEC'],
  },
  {
    id: 'citizen',
    name: 'Citizen & Identity Services',
    hindiName: 'नागरिक एवं पहचान सेवाएं',
    description: 'Samagra ID, Aadhaar biometric enrollment, e-KYC updates, and general citizen desks',
    icon: '🆔',
    codes: ['SAM', 'AAD', 'ADH'],
  },
];

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

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.prefix.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  // Group services by official department categories
  const groupedCategories = useMemo(() => {
    const knownCodesMap = new Set<string>();
    CATEGORY_DEFINITIONS.forEach((cat) => cat.codes.forEach((c) => knownCodesMap.add(c)));

    const result = CATEGORY_DEFINITIONS.map((cat) => {
      const catServices = filteredServices.filter((s) => cat.codes.includes(s.code));
      return {
        ...cat,
        services: catServices,
      };
    });

    // Capture any dynamic or unlisted services into Citizen Services category
    const unclassifiedServices = filteredServices.filter((s) => !knownCodesMap.has(s.code));
    if (unclassifiedServices.length > 0) {
      const citizenCat = result.find((c) => c.id === 'citizen');
      if (citizenCat) {
        citizenCat.services = [...citizenCat.services, ...unclassifiedServices];
      }
    }

    return result.filter((cat) => cat.services.length > 0);
  }, [filteredServices]);

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
    <div className="space-y-8">
      {/* Search Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Department Service Catalogues
          </h2>
          <p className="text-xs text-slate-500">
            Browse services by department and generate an instant digital queue token
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services (e.g. Aadhaar, Domicile)..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition shadow-2xs"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
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
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs p-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grouped Category Sections */}
      {groupedCategories.length === 0 ? (
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
        <div className="space-y-10">
          {groupedCategories.map((category) => (
            <section key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg" aria-hidden="true">
                    {category.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {category.name}
                      </h3>
                      <Badge variant="navy" size="sm" className="text-[10px] px-1.5 py-0">
                        {category.services.length} {category.services.length === 1 ? 'Service' : 'Services'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {category.hindiName} • {category.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Cards Grid for Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.services.map((service) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
