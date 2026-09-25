import React from 'react';
import { TicketDTO, QueuePositionDTO, TicketStatus } from '@gatimaan/shared';
import { QueueProgressTimeline } from './QueueProgressTimeline.js';
import { WaitTimeDisplay } from './WaitTimeDisplay.js';
import { CounterCallout } from './CounterCallout.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';

interface TicketLiveCardProps {
  ticket: TicketDTO;
  positionData: QueuePositionDTO | null;
  onOpenCancelModal: () => void;
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
  const isWaiting = ticket.status === TicketStatus.WAITING;
  const isCalled = ticket.status === TicketStatus.CALLED;
  const isServing = ticket.status === TicketStatus.SERVING;
  const isCompleted = ticket.status === TicketStatus.COMPLETED;
  const isNoShow = ticket.status === TicketStatus.NO_SHOW;
  const isCancelled = ticket.status === TicketStatus.CANCELLED;

  const hindiTitle = ticket.service?.code ? KNOWN_SERVICE_METADATA[ticket.service.code]?.hindi : undefined;

  const formattedIssuedTime = ticket.issuedAt
    ? new Date(ticket.issuedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden max-w-xl mx-auto transition-all">
      {/* Tier 3 Focal Header: Dominant Token Hero Strip */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 text-center border-b border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
          <span className="font-bold tracking-wider uppercase text-[10px] text-slate-400">
            MP Online Digital Token Pass
          </span>
          <span className="text-[11px] text-slate-400">Issued at {formattedIssuedTime}</span>
        </div>

        <p className="text-sm text-slate-200 font-semibold">{ticket.service?.name || 'Center Service'}</p>
        {hindiTitle && (
          <p className="text-xs text-slate-400 font-medium mt-0.5">{hindiTitle}</p>
        )}

        {/* Big Dominant Token Number Display */}
        <div className="py-4 my-2 bg-slate-800/80 rounded-2xl border border-slate-700/80 max-w-md mx-auto">
          <span className="text-5xl sm:text-7xl font-black font-mono tracking-widest text-white block">
            {ticket.ticketNumber}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block uppercase">
            Prefix: {ticket.service?.prefix || '-'}
          </span>
        </div>

        {/* Live Semantic Status Badge */}
        <div className="pt-1">
          {isWaiting && (
            <Badge variant="navy" size="md" dot pulse className="bg-slate-800 text-slate-100 border-slate-700">
              In Live Waiting Queue
            </Badge>
          )}
          {isCalled && (
            <Badge variant="warning" size="md" dot pulse className="bg-amber-500 text-white border-amber-400 font-bold">
              SUMMONED TO DESK #{ticket.counter?.counterNumber || ''}
            </Badge>
          )}
          {isServing && (
            <Badge variant="success" size="md" dot pulse className="bg-emerald-600 text-white border-emerald-500 font-bold">
              Currently Serving at Desk #{ticket.counter?.counterNumber || ''}
            </Badge>
          )}
          {isCompleted && (
            <Badge variant="success" size="md">
              ✓ Service Completed
            </Badge>
          )}
          {isNoShow && (
            <Badge variant="destructive" size="md">
              Skipped / No-Show
            </Badge>
          )}
          {isCancelled && (
            <Badge variant="neutral" size="md">
              Token Cancelled
            </Badge>
          )}
        </div>
      </div>

      {/* Main Body: Subordinate Information Tier */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Progress Timeline */}
        <QueueProgressTimeline status={ticket.status} />

        {/* Counter Summoning Alert Callout */}
        {(isCalled || isServing) && (
          <CounterCallout
            counterNumber={ticket.counter?.counterNumber}
            counterName={ticket.counter?.name}
            status={ticket.status}
          />
        )}

        {/* Subordinate Stat Trio: Position, Estimated Wait, Assigned Counter */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
          {/* Stat 1: Queue Position */}
          <div className="text-center p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Position
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 block mt-0.5">
              {isWaiting && positionData ? `#${positionData.position}` : isCalled || isServing ? 'Next' : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {isWaiting && positionData ? `${positionData.aheadCount} ahead` : 'Desk ready'}
            </span>
          </div>

          {/* Stat 2: Estimated Wait Time */}
          <div className="text-center p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Est. Wait
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 block mt-1">
              {isWaiting ? (
                <WaitTimeDisplay
                  estimatedWaitSeconds={positionData?.estimatedWaitSeconds}
                  showIcon={false}
                />
              ) : (
                '0 min'
              )}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{ticket.service?.avgDurationMinutes || 15}m / citizen
            </span>
          </div>

          {/* Stat 3: Assigned Counter */}
          <div className="text-center p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
              Desk
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 block mt-0.5">
              {ticket.counter?.counterNumber ? `#${ticket.counter.counterNumber}` : 'Auto'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {ticket.counter?.name || 'Next available'}
            </span>
          </div>
        </div>

        {/* Terminal Status Explanations */}
        {isCompleted && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-base font-bold">
              ✓
            </div>
            <h4 className="text-sm font-bold text-emerald-900">Service Completed Successfully</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your service request at Desk #{ticket.counter?.counterNumber || '-'} has concluded. Thank you for using GATIMAAN!
            </p>
          </div>
        )}

        {isNoShow && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1">
            <h4 className="text-sm font-bold text-amber-950">Token Marked as No-Show</h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              This token was summoned to the counter but was not claimed. Please generate a new token to rejoin the queue.
            </p>
          </div>
        )}

        {isCancelled && (
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Token Cancelled</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              This digital pass was cancelled. If you still require service, please select a service and generate a new token.
            </p>
          </div>
        )}

        {/* Token Details Metadata */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Service Code</span>
            <span className="font-mono font-bold text-slate-800">{ticket.service?.code || '---'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority</span>
            <span className="font-medium text-slate-800">Standard ({ticket.priority})</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Token ID</span>
            <span className="font-mono text-slate-500 text-[11px]">{ticket.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Cancel Button if Waiting or Called */}
        {(isWaiting || isCalled) && (
          <div className="pt-1 text-center">
            <Button
              type="button"
              variant="destructive-outline"
              size="sm"
              onClick={onOpenCancelModal}
            >
              Cancel this token
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
