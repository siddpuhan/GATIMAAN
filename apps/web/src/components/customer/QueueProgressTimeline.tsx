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
  { id: 'ISSUED', label: 'Token Issued', description: 'Generated' },
  { id: 'WAITING', label: 'In Live Queue', description: 'Waiting' },
  { id: 'CALLED', label: 'Summoned to Desk', description: 'Your Turn' },
  { id: 'SERVING', label: 'At Counter', description: 'In Progress' },
];

export function QueueProgressTimeline({ status }: QueueProgressTimelineProps) {
  const getStepState = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    let activeIndex = 0;
    if (status === TicketStatus.WAITING) activeIndex = 1;
    else if (status === TicketStatus.CALLED) activeIndex = 2;
    else if (status === TicketStatus.SERVING) activeIndex = 3;
    else if (status === TicketStatus.COMPLETED) activeIndex = 4;

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'current';
    return 'upcoming';
  };

  const isTerminalCancelled =
    status === TicketStatus.CANCELLED || status === TicketStatus.NO_SHOW;

  if (isTerminalCancelled) {
    return (
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-600 font-medium">
        Token lifecycle concluded ({status === TicketStatus.CANCELLED ? 'Cancelled' : 'Marked as No-Show'})
      </div>
    );
  }

  return (
    <div className="w-full py-2" aria-label="Queue Progress">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

        {STEPS.map((step, idx) => {
          const state = getStepState(idx);

          return (
            <div
              key={step.id}
              className="flex flex-col items-center text-center relative z-10 flex-1"
            >
              {/* Node Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  state === 'completed'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : state === 'current'
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200 shadow-xs'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {state === 'completed' ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Labels */}
              <span
                className={`text-[11px] font-bold mt-2 leading-tight ${
                  state === 'current'
                    ? 'text-slate-900'
                    : state === 'completed'
                      ? 'text-slate-700'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
