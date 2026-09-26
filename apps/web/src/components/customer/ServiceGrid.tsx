import React, { useState, useEffect, useMemo } from 'react';
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

interface CategoryDefinition {
  id: string;
  name: string;
  hindiName: string;
  description: string;
  codes: string[];
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'revenue',
    name: 'Revenue & Tehsil Services',
    hindiName: 'राजस्व एवं तहसील सेवाएं',
    description: 'Domicile, Income, Caste, EWS, and Land Record certifications',
    codes: ['DOM', 'INC', 'CAST', 'EWS', 'LAND', 'REV'],
  },
  {
    id: 'municipal',
    name: 'Municipal & Local Body Services',
    hindiName: 'नगर निगम एवं स्थानीय निकाय सेवाएं',
    description: 'Birth certificates, Death registrations, and urban local body facilitation',
    codes: ['BTH', 'DTH'],
  },
  {
    id: 'utility',
    name: 'Utility & Bill Payments',
    hindiName: 'उपयोगिता एवं बिल भुगतान',
    description: 'Electricity bill payments, civic utility facilitation, and fees',
    codes: ['ELEC'],
  },
  {
    id: 'citizen',
    name: 'Citizen & Identity Services',
    hindiName: 'नागरिक एवं पहचान सेवाएं',
    description: 'Samagra ID, Aadhaar biometric enrollment, e-KYC updates, and general citizen desks',
    codes: ['SAM', 'AAD', 'ADH'],
  },
];

function renderCategoryIcon(id: string, className = 'w-5 h-5') {
  switch (id) {
    case 'revenue':
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21h18M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M12 3L2 10h20L12 3z"
          />
        </svg>
      );
    case 'municipal':
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'utility':
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'citizen':
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
  }
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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
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

    const available = result.filter((cat) => cat.services.length > 0);

    if (selectedCategoryTab === 'all') {
      return available;
    }

    return available.filter((cat) => cat.id === selectedCategoryTab);
  }, [filteredServices, selectedCategoryTab]);

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
      {/* Search & Filter Header (Wide Layout) */}
      <div className="bg-white border border-[#B8AEA4] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0B1730] tracking-tight">
              Department Service Catalogues
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Browse public services across MP Online departments and issue a digital queue pass.
            </p>
          </div>

          <div className="relative max-w-md w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by service or certificate (e.g. Domicile, Aadhaar, Caste)..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0B1730] focus:border-[#0B1730] transition shadow-2xs"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
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
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCategoryTab === 'all'
                ? 'bg-[#0B1730] text-white shadow-2xs'
                : 'bg-[#F4F7FA] text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Departments ({services.length})
          </button>
          {CATEGORY_DEFINITIONS.map((cat) => {
            const count = services.filter((s) => cat.codes.includes(s.code)).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                  selectedCategoryTab === cat.id
                    ? 'bg-[#0B1730] text-white shadow-2xs'
                    : 'bg-[#F4F7FA] text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span className="shrink-0">{renderCategoryIcon(cat.id, 'w-3.5 h-3.5')}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Category Sections */}
      {groupedCategories.length === 0 ? (
        <EmptyState
          title="No matching services found"
          message={
            searchQuery
              ? `No services matching "${searchQuery}". Try a different keyword.`
              : 'No services are currently available in this department.'
          }
          action={
            searchQuery || selectedCategoryTab !== 'all'
              ? {
                  label: 'Reset Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedCategoryTab('all');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-12">
          {groupedCategories.map((category) => (
            <section key={category.id} className="space-y-6">
              {/* Unified Category Header */}
              <div className="space-y-2 pb-3 border-b border-[#B8AEA4] px-0.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg bg-[#0B1220]/5 border border-[#B8AEA4] flex items-center justify-center shrink-0 text-[#0B1220]"
                      aria-hidden="true"
                    >
                      {renderCategoryIcon(category.id, 'w-5 h-5')}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0B1220] tracking-tight">
                      {category.name}
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B1220] text-white border border-[#0B1220] shadow-2xs shrink-0">
                    {category.services.length} {category.services.length === 1 ? 'Service' : 'Services'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed pl-12">
                  {category.hindiName} · {category.description}
                </p>
              </div>

              {/* Service Cards Grid for Category (Wide 3-Column Desktop Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6 items-stretch">
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
