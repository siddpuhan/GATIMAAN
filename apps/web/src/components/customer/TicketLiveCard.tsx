import React from 'react';
import { TicketDTO, QueuePositionDTO, TicketStatus } from '@gatimaan/shared';
import { QueueProgressTimeline } from './QueueProgressTimeline.js';
import { WaitTimeDisplay } from './WaitTimeDisplay.js';
import { CounterCallout } from './CounterCallout.js';

interface TicketLiveCardProps {
  ticket: TicketDTO;
  positionData: QueuePositionDTO | null;
  onOpenCancelModal: () => void;
}

function getStatusBadge(status: TicketStatus | string) {
  switch (status) {
    case TicketStatus.WAITING:
      return {
        label: 'Waiting in Queue',
        classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-400/20',
        dotClass: 'bg-blue-500 animate-pulse',
      };
    case TicketStatus.CALLED:
      return {
        label: 'Now Called',
        classes: 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400 font-bold animate-pulse',
        dotClass: 'bg-amber-600',
      };
    case TicketStatus.SERVING:
      return {
        label: 'Now Serving',
        classes: 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-500 font-semibold',
        dotClass: 'bg-emerald-600 animate-pulse',
      };
    case TicketStatus.COMPLETED:
      return {
        label: 'Service Completed',
        classes: 'bg-gray-100 text-gray-700 border-gray-300',
        dotClass: 'bg-gray-500',
      };
    case TicketStatus.CANCELLED:
      return {
        label: 'Ticket Cancelled',
        classes: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
      };
    case TicketStatus.NO_SHOW:
      return {
        label: 'Skipped / No-Show',
        classes: 'bg-gray-100 text-gray-600 border-gray-200',
        dotClass: 'bg-gray-400',
      };
    default:
      return {
        label: status,
        classes: 'bg-gray-100 text-gray-700 border-gray-200',
        dotClass: 'bg-gray-400',
      };
  }
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

export function TicketLiveCard({
  ticket,
  positionData,
  onOpenCancelModal,
}: TicketLiveCardProps) {
  const badge = getStatusBadge(ticket.status);
  const isWaiting = ticket.status === TicketStatus.WAITING;
  const isCalled = ticket.status === TicketStatus.CALLED;
  const isServing = ticket.status === TicketStatus.SERVING;
  const hindiTitle = ticket.service?.code ? KNOWN_SERVICE_METADATA[ticket.service.code]?.hindi : undefined;

  const formattedIssuedTime = ticket.issuedAt
    ? new Date(ticket.issuedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden max-w-xl mx-auto transition-all">
      {/* Top Pass Brand Strip */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 sm:p-6 text-center relative">
        <div className="flex items-center justify-between text-xs text-blue-200 mb-2">
          <span className="font-semibold tracking-wider uppercase text-[10px]">
            MP Online Citizen Pass
          </span>
          <span>Issued: {formattedIssuedTime}</span>
        </div>

        <p className="text-sm text-blue-100 font-bold">{ticket.service?.name || 'Center Service'}</p>
        {hindiTitle && (
          <p className="text-xs text-blue-200/90 font-medium mt-0.5">{hindiTitle}</p>
        )}

        {/* Token Hero */}
        <div className="py-2.5">
          <span className="text-5xl sm:text-7xl font-black font-mono tracking-wider text-white drop-shadow-sm">
            {ticket.ticketNumber}
          </span>
        </div>

        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs border font-medium bg-white/95 text-gray-900 shadow-xs">
          <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Progress Timeline */}
        <QueueProgressTimeline status={ticket.status} />

        {/* Callout when Called or Serving */}
        {(isCalled || isServing) && (
          <CounterCallout
            counterNumber={ticket.counter?.counterNumber}
            counterName={ticket.counter?.name}
            status={ticket.status}
          />
        )}

        {/* Dynamic Queue Metrics (When Waiting) */}
        {isWaiting && (
          <div className="grid grid-cols-2 gap-3.5 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 block uppercase tracking-wider">
                Position in Line
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-blue-700">
                {positionData ? `#${positionData.position}` : '--'}
              </span>
              <span className="text-[11px] text-gray-500 block mt-0.5">
                {positionData?.aheadCount === 0
                  ? 'You are next!'
                  : `${positionData?.aheadCount ?? 0} ahead of you`}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white border border-blue-100/80 shadow-2xs">
              <span className="text-[11px] font-medium text-gray-500 block uppercase tracking-wider">
                Est. Wait Time
              </span>
              <span className="text-xl sm:text-2xl font-black text-gray-800 block pt-1">
                <WaitTimeDisplay
                  estimatedWaitSeconds={positionData?.estimatedWaitSeconds}
                  showIcon={false}
                />
              </span>
              <span className="text-[11px] text-gray-500 block mt-1">
                Avg. {ticket.service?.avgDurationMinutes || 15}m per citizen
              </span>
            </div>
          </div>
        )}

        {/* Terminal Status Explanations */}
        {ticket.status === TicketStatus.COMPLETED && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto text-base font-bold">
              ✓
            </div>
            <h4 className="text-sm font-bold text-green-900">Service Completed</h4>
            <p className="text-xs text-green-700">
              Your service request has been completed at Counter #{ticket.counter?.counterNumber || '-'}. Thank you for using GATIMAAN!
            </p>
          </div>
        )}

        {ticket.status === TicketStatus.NO_SHOW && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1">
            <h4 className="text-sm font-bold text-amber-900">Ticket Marked as No-Show</h4>
            <p className="text-xs text-amber-700">
              This ticket was called to the counter but was not claimed. Please generate a new ticket to rejoin the queue.
            </p>
          </div>
        )}

        {ticket.status === TicketStatus.CANCELLED && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-1">
            <h4 className="text-sm font-bold text-gray-800">Ticket Cancelled</h4>
            <p className="text-xs text-gray-500">
              This digital pass was cancelled. If you still need service, please generate a new token.
            </p>
          </div>
        )}

        {/* Ticket Metadata Bar */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Service Code</span>
            <span className="font-mono font-bold text-gray-800">{ticket.service?.code || '---'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Priority</span>
            <span className="font-medium text-gray-800">Standard ({ticket.priority})</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Pass ID</span>
            <span className="font-mono text-gray-500 text-[11px]">{ticket.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Cancel Button if Waiting or Called */}
        {(isWaiting || isCalled) && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onOpenCancelModal}
              className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium inline-flex items-center gap-1 transition"
            >
              Cancel this ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
