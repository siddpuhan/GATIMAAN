import React from 'react';

interface CancelTicketModalProps {
  isOpen: boolean;
  ticketNumber: string;
  isCancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelTicketModal({
  isOpen,
  ticketNumber,
  isCancelling,
  onConfirm,
  onClose,
}: CancelTicketModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-gray-100">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="text-center space-y-1">
          <h3 id="cancel-modal-title" className="text-lg font-bold text-gray-900">
            Cancel Queue Ticket?
          </h3>
          <p className="text-xs text-gray-500">
            Are you sure you want to cancel ticket{' '}
            <strong className="font-mono text-gray-800">{ticketNumber}</strong>? You will lose
            your position in the queue.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            disabled={isCancelling}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Keep Ticket
          </button>
          <button
            type="button"
            disabled={isCancelling}
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            {isCancelling ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              'Yes, Cancel'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
