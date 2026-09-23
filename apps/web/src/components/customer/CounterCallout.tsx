import React from 'react';

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
      className={`rounded-xl p-4 border transition-all duration-300 ${
        isCalled
          ? 'bg-amber-500/10 border-amber-500 text-amber-950 ring-2 ring-amber-400/30'
          : 'bg-emerald-500/10 border-emerald-500 text-emerald-950'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${
            isCalled ? 'bg-amber-500 text-white shadow-xs animate-bounce' : 'bg-emerald-600 text-white shadow-xs'
          }`}
        >
          {counterNumber ? `#${counterNumber}` : '!'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isCalled ? 'bg-amber-200 text-amber-900 font-mono' : 'bg-emerald-200 text-emerald-900 font-mono'
              }`}
            >
              {isCalled ? 'Your Turn Now' : 'Currently Serving'}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold mt-1 text-gray-900">
            {counterNumber ? `Proceed to Desk #${counterNumber}` : 'Proceed to Counter'}
          </h3>

          {counterName && (
            <p className="text-xs text-gray-600 mt-0.5">{counterName}</p>
          )}

          {isCalled && (
            <p className="text-xs text-amber-800 font-medium mt-2 bg-amber-100/60 p-2 rounded-lg border border-amber-200/60">
              Please present your digital pass or token number to the desk operator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
