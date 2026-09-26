import React from 'react';
import { ServiceDTO } from '@gatimaan/shared';
import { formatWaitTime } from './WaitTimeDisplay.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';

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
  const isQueueOpen = service.isActive;

  return (
    <div className="bg-white rounded-2xl border border-[#B8AEA4] p-5 sm:p-6 hover:border-slate-900 transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Header: Prefix Identifier & Queue Availability */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#0B1220] text-white border border-[#0B1220] tracking-wider shadow-2xs">
            Prefix: {service.prefix}
          </span>

          {isQueueOpen ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Queue Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Queue Closed
            </span>
          )}
        </div>

        {/* Primary English Title */}
        <h3 className="text-base sm:text-lg font-black text-[#0B1730] group-hover:text-slate-950 transition-colors leading-snug">
          {service.name}
        </h3>

        {/* Subtle Hindi Subtitle */}
        {hindiTitle && (
          <p className="text-xs text-slate-500 font-semibold mt-0.5 tracking-wide">
            {hindiTitle}
          </p>
        )}

        {/* Description: Clean text wrapping without awkward truncation */}
        <p className="text-xs text-slate-600 mt-2.5 leading-relaxed min-h-[38px]">
          {service.description || 'Public government service desk for digital token issuance.'}
        </p>
      </div>

      {/* Metrics & Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          {waitingCount !== undefined ? (
            waitingCount === 0 ? (
              <div className="text-xs font-semibold text-[#08634B] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0E8F6E]" />
                <span>No citizens waiting</span>
              </div>
            ) : (
              <div className="text-xs text-slate-800">
                <span className="font-bold text-slate-950">{waitingCount} waiting</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-slate-700 font-semibold">
                  {estimatedWaitSeconds !== undefined && estimatedWaitSeconds !== null
                    ? `~${formatWaitTime(estimatedWaitSeconds)} wait`
                    : `~${waitingCount * (service.avgDurationMinutes || 15)}m wait`}
                </span>
              </div>
            )
          ) : (
            <div className="text-xs text-slate-600 font-medium">
              Est. {service.avgDurationMinutes} mins / citizen
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          disabled={!isQueueOpen}
          isLoading={isIssuing}
          loadingText="Issuing..."
          onClick={() => onIssueTicket(service.id)}
          className="shrink-0 bg-[#0E8F6E] hover:bg-[#0c7a5e] text-white font-bold rounded-xl px-4 py-2 text-xs transition cursor-pointer"
        >
          <span>Get Token</span>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
