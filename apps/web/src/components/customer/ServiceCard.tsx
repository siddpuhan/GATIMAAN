import React from 'react';
import { ServiceDTO } from '@gatimaan/shared';
import { formatWaitTime } from './WaitTimeDisplay.js';

interface ServiceCardProps {
  service: ServiceDTO;
  waitingCount?: number;
  estimatedWaitSeconds?: number | null;
  isIssuing: boolean;
  onIssueTicket: (serviceId: string) => void;
}

const KNOWN_SERVICE_METADATA: Record<string, { hindi: string; category: string }> = {
  DOM: { hindi: 'स्थानीय निवासी प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  INC: { hindi: 'आय प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  CAST: { hindi: 'जाति प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  EWS: { hindi: 'EWS आय एवं संपत्ति प्रमाण पत्र', category: 'Revenue / Tehsil Services' },
  LAND: { hindi: 'भू-अभिलेख', category: 'Revenue / Land Records' },
  REV: { hindi: 'भू-अभिलेख एवं राजस्व', category: 'Revenue / Land Records' },
  BTH: { hindi: 'जन्म प्रमाण पत्र', category: 'Municipal / Local Body Services' },
  DTH: { hindi: 'मृत्यु प्रमाण पत्र', category: 'Municipal / Local Body Services' },
  SAM: { hindi: 'समग्र ID / ई-KYC', category: 'Citizen Services' },
  AAD: { hindi: 'आधार नामांकन / अपडेट', category: 'Aadhaar / Citizen Services' },
  ADH: { hindi: 'आधार सेवा केंद्र', category: 'Aadhaar / Citizen Services' },
  ELEC: { hindi: 'बिजली बिल / उपयोगिता भुगतान', category: 'Utility Services' },
};

export function ServiceCard({
  service,
  waitingCount,
  estimatedWaitSeconds,
  isIssuing,
  onIssueTicket,
}: ServiceCardProps) {
  const meta = KNOWN_SERVICE_METADATA[service.code];
  const hindiTitle = meta?.hindi;
  const categoryLabel = meta?.category;

  // Clean description: extract core description if category or hindi is appended
  const cleanDescription = service.description
    ? service.description.replace(/\(.*\)/, '').replace(/•.*$/, '').trim()
    : 'Public citizen service desk for digital token issuance.';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Header: Service Code + Department / Category Tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-md border border-blue-200">
              {service.code}
            </span>
            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              Prefix: {service.prefix}
            </span>
          </div>
          {categoryLabel && (
            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {categoryLabel}
            </span>
          )}
        </div>

        {/* Primary English Title */}
        <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {service.name}
        </h3>

        {/* Subtle Hindi Subtitle */}
        {hindiTitle && (
          <p className="text-xs text-blue-700/80 font-medium mt-0.5 tracking-wide">
            {hindiTitle}
          </p>
        )}

        {/* Service Scope Description */}
        <p className="text-xs text-gray-600 mt-2 line-clamp-2 min-h-[32px] leading-relaxed">
          {cleanDescription || service.description}
        </p>
      </div>

      {/* Metrics & Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          {waitingCount !== undefined ? (
            waitingCount === 0 ? (
              <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Currently no waiting citizens</span>
              </div>
            ) : (
              <div className="text-xs text-gray-800">
                <span className="font-bold text-blue-700">{waitingCount} waiting</span>
                <span className="text-gray-400 mx-1">•</span>
                <span className="text-gray-600 font-medium">
                  {estimatedWaitSeconds !== undefined && estimatedWaitSeconds !== null
                    ? `~${formatWaitTime(estimatedWaitSeconds)} wait`
                    : 'ETA calculating...'}
                </span>
              </div>
            )
          ) : (
            <div className="text-xs text-gray-500">
              Avg. {service.avgDurationMinutes} mins • Queue active
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={isIssuing}
          onClick={() => onIssueTicket(service.id)}
          className="py-2 px-3.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-98 transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
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
