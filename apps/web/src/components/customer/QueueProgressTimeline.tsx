import React from 'react';
import { TicketStatus } from '@gatimaan/shared';

interface QueueProgressTimelineProps {
  status: TicketStatus | string;
}

interface Step {
  id: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'ISSUED', label: 'Issued', description: 'Token Generated' },
  { id: 'WAITING', label: 'In Queue', description: 'Waiting for Call' },
  { id: 'CALLED', label: 'Called', description: 'Proceed to Desk' },
  { id: 'SERVING', label: 'Serving', description: 'At the Counter' },
];

export function QueueProgressTimeline({ status }: QueueProgressTimelineProps) {
  const getStepState = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    // Determine active index based on ticket status
    let activeIndex = 0;
    if (status === TicketStatus.WAITING) activeIndex = 1;
    else if (status === TicketStatus.CALLED) activeIndex = 2;
    else if (status === TicketStatus.SERVING) activeIndex = 3;
    else if (status === TicketStatus.COMPLETED) activeIndex = 4; // all done

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'current';
    return 'upcoming';
  };

  const isTerminalCancelled =
    status === TicketStatus.CANCELLED || status === TicketStatus.NO_SHOW;

  if (isTerminalCancelled) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500 font-medium">
        Ticket lifecycle ended ({status === TicketStatus.CANCELLED ? 'Cancelled' : 'Marked as No-Show'})
      </div>
    );
  }

  return (
    <div className="w-full py-3" aria-label="Queue Progress">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-gray-200 -z-0" />

        {STEPS.map((step, idx) => {
          const state = getStepState(idx);

          return (
            <div
              key={step.id}
              className="flex flex-col items-center text-center relative z-10 flex-1"
            >
              {/* Node Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  state === 'completed'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : state === 'current'
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}
              >
                {state === 'completed' ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Labels */}
              <span
                className={`text-[11px] font-semibold mt-1.5 leading-tight ${
                  state === 'current'
                    ? 'text-blue-700'
                    : state === 'completed'
                      ? 'text-gray-800'
                      : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-gray-500 hidden sm:block">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
