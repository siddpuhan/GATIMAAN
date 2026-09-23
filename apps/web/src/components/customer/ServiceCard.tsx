import React from 'react';
import { ServiceDTO } from '@gatimaan/shared';

interface ServiceCardProps {
  service: ServiceDTO;
  waitingCount?: number;
  isIssuing: boolean;
  onIssueTicket: (serviceId: string) => void;
}

export function ServiceCard({
  service,
  waitingCount,
  isIssuing,
  onIssueTicket,
}: ServiceCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Header with Code Badge */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-100/80">
            {service.code}
          </span>
          <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            Prefix: {service.prefix}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          {service.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
          {service.description || 'Public government service desk for token issuance.'}
        </p>
      </div>

      {/* Metrics & Action Footer */}
      <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-[11px] text-gray-500 font-medium">
            Avg. {service.avgDurationMinutes} mins
          </div>
          {waitingCount !== undefined ? (
            <div className="text-xs font-semibold text-blue-700">
              {waitingCount === 0 ? 'No queue right now' : `${waitingCount} waiting`}
            </div>
          ) : (
            <div className="text-xs text-gray-400">Queue active</div>
          )}
        </div>

        <button
          type="button"
          disabled={isIssuing}
          onClick={() => onIssueTicket(service.id)}
          className="py-2 px-4 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-98 transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
        >
          {isIssuing ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Issuing...</span>
            </>
          ) : (
            <>
              <span>Get Token</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
