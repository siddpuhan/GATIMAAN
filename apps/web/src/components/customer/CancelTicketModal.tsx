import React from 'react';
import { Button } from '../ui/Button.js';

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-2xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>

        <div className="text-center space-y-1">
          <h3 id="modal-title" className="text-base font-bold text-slate-900">
            Cancel Queue Token?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to release Token{' '}
            <strong className="font-mono text-slate-900 font-bold">{ticketNumber}</strong>?
            You will lose your current position in the live queue.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            disabled={isCancelling}
            onClick={onClose}
          >
            Keep My Place
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="md"
            fullWidth
            isLoading={isCancelling}
            loadingText="Cancelling..."
            onClick={onConfirm}
          >
            Confirm Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
