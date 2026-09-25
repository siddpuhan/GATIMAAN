import React from 'react';
import { Badge } from '../ui/Badge.js';

interface CounterCalloutProps {
  counterNumber: number | null | undefined;
  counterName: string | null | undefined;
  status: string;
}

export function CounterCallout({
  counterNumber,
  counterName,
  status,
}: CounterCalloutProps) {
  if (status !== 'CALLED' && status !== 'SERVING') {
    return null;
  }

  const isCalled = status === 'CALLED';

  return (
    <div
      role="alert"
      className={`rounded-2xl p-5 border transition-all duration-300 ${
        isCalled
          ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/40 shadow-xs'
          : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-black font-mono ${
            isCalled ? 'bg-amber-600 text-white shadow-xs' : 'bg-emerald-700 text-white shadow-xs'
          }`}
        >
          {counterNumber ? `#${counterNumber}` : '!'}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {isCalled ? (
              <Badge variant="warning" size="sm" dot pulse>
                YOUR TURN NOW
              </Badge>
            ) : (
              <Badge variant="success" size="sm" dot pulse>
                CURRENTLY SERVING
              </Badge>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            {counterNumber ? `Proceed to Desk #${counterNumber}` : 'Proceed to Assigned Desk'}
          </h3>

          {counterName && (
            <p className="text-xs text-slate-600">{counterName}</p>
          )}

          {isCalled && (
            <p className="text-xs text-amber-900 font-medium pt-1">
              Please walk over to Desk #{counterNumber || ''} and present your token number to the operator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
