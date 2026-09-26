import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  CounterWithSessionDTO,
  CreateCounterInput,
  CounterDTO,
  CounterSessionDTO,
} from '@gatimaan/shared';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { AlertBanner, LoadingState, EmptyState } from '../ui/FeedbackStates.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CountersManagement() {
  const { getToken } = useAuth();

  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterWithSessionDTO | null>(null);

  const [formData, setFormData] = useState<CreateCounterInput>({
    counterNumber: 1,
    name: '',
    isActive: true,
  });

  const fetchCounters = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/counters`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch counters list');
      }

      const data: CounterWithSessionDTO[] = await res.json();
      setCounters(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching counters');
    } finally {
      setInitialLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleOpenCreate = () => {
    setEditingCounter(null);
    const nextNumber =
      counters.length > 0 ? Math.max(...counters.map((c) => c.counterNumber)) + 1 : 1;

    setFormData({
      counterNumber: nextNumber,
      name: `Counter ${nextNumber}`,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (counter: CounterWithSessionDTO) => {
    setEditingCounter(counter);
    setFormData({
      counterNumber: counter.counterNumber,
      name: counter.name,
      isActive: counter.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const url = editingCounter
        ? `${API_BASE}/api/counters/${editingCounter.id}`
        : `${API_BASE}/api/counters`;
      const method = editingCounter ? 'PATCH' : 'POST';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save counter');
      }

      const saved: CounterWithSessionDTO = await res.json();

      if (editingCounter) {
        setCounters((prev) =>
          prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c))
        );
        setSuccessMsg(`Desk #${saved.counterNumber} updated successfully`);
      } else {
        setCounters((prev) => [...prev, { ...saved, currentSession: null }]);
        setSuccessMsg(`Desk #${saved.counterNumber} created successfully`);
      }

      setShowModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving counter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (counter: CounterWithSessionDTO) => {
    try {
      setActionPendingId(counter.id);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          isActive: !counter.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to toggle status');
      }

      const updated: CounterDTO = await res.json();
      setCounters((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, isActive: updated.isActive } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling counter status');
    } finally {
      setActionPendingId(null);
    }
  };

  const handleOpenSession = async (counter: CounterWithSessionDTO) => {
    try {
      setActionPendingId(counter.id);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/open`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to open desk session');
      }

      const data: { session: CounterSessionDTO } = await res.json();
      setSuccessMsg(`Desk #${counter.counterNumber} operator session opened successfully`);

      setCounters((prev) =>
        prev.map((c) => (c.id === counter.id ? { ...c, currentSession: data.session } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error opening counter desk');
    } finally {
      setActionPendingId(null);
    }
  };

  const handleCloseSession = async (counter: CounterWithSessionDTO) => {
    try {
      setActionPendingId(counter.id);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/close`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to close counter desk session');
      }

      setSuccessMsg(`Desk #${counter.counterNumber} session concluded`);
      setCounters((prev) =>
        prev.map((c) => (c.id === counter.id ? { ...c, currentSession: null } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing counter desk');
    } finally {
      setActionPendingId(null);
    }
  };

  const filteredCounters = counters.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.counterNumber.toString().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Counters & Desks</h2>
          <p className="text-xs text-slate-500">
            Manage physical service counters and live operator desk shifts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search counters..."
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 min-w-[200px]"
          />

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            icon={<span>+</span>}
          >
            Add Counter
          </Button>
        </div>
      </div>

      {/* Error / Success Feedback */}
      {error && (
        <AlertBanner
          type="error"
          title="Desk Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {successMsg && (
        <AlertBanner
          type="success"
          title="Desk Update"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {/* Counter Table */}
      {initialLoading ? (
        <LoadingState message="Loading counters & desk roster..." />
      ) : filteredCounters.length === 0 ? (
        <EmptyState
          title="No counters found"
          message={
            searchQuery
              ? `No counters matching "${searchQuery}".`
              : 'No counters configured yet. Click "Add Counter" to create one.'
          }
          action={
            searchQuery
              ? {
                  label: 'Clear Filter',
                  onClick: () => setSearchQuery(''),
                }
              : {
                  label: 'Add First Counter',
                  onClick: handleOpenCreate,
                }
          }
        />
      ) : (
        <div className="overflow-x-auto border border-slate-200/90 rounded-2xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Desk #</th>
                <th className="py-3 px-4">Desk Name</th>
                <th className="py-3 px-4">Active Session</th>
                <th className="py-3 px-4">Hardware Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCounters.map((c) => {
                const isPending = actionPendingId === c.id;
                const hasSession = !!c.currentSession?.isActive;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                      #{c.counterNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">{c.name}</td>

                    <td className="py-3.5 px-4">
                      {hasSession ? (
                        <div className="space-y-0.5">
                          <Badge variant="success" size="sm" dot pulse>
                            Session Open
                          </Badge>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Opened:{' '}
                            {c.currentSession?.openedAt
                              ? new Date(c.currentSession.openedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Standby / Closed
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          Disabled
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasSession ? (
                          <Button
                            variant="destructive-outline"
                            size="sm"
                            isLoading={isPending}
                            onClick={() => handleCloseSession(c)}
                          >
                            Close Shift
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            isLoading={isPending}
                            disabled={!c.isActive}
                            onClick={() => handleOpenSession(c)}
                          >
                            Open Shift
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(c)}
                          disabled={isPending}
                        >
                          Edit
                        </Button>

                        <Button
                          variant={c.isActive ? 'destructive-outline' : 'secondary'}
                          size="sm"
                          isLoading={isPending}
                          onClick={() => handleToggleStatus(c)}
                        >
                          {c.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-5 shadow-lg my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCounter ? 'Edit Counter Desk' : 'Register New Counter Desk'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-sm rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Desk Number
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.counterNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterNumber: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Desk Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Counter 1 (Revenue Desk)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isCounterActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                />
                <label htmlFor="isCounterActiveToggle" className="text-xs font-semibold text-slate-700">
                  Desk hardware is enabled for operator sessions
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  loadingText="Saving..."
                >
                  {editingCounter ? 'Update Desk' : 'Register Desk'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}