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
import {
  AlertBanner,
  LoadingState,
  EmptyState,
} from '../ui/FeedbackStates.js';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CountersManagement() {
  const { getToken } = useAuth();

  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionPendingId, setActionPendingId] =
    useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] =
    useState<CounterWithSessionDTO | null>(null);

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

      const res = await fetch(`${API_BASE}/api/counters`, {
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message || 'Failed to fetch counters list'
        );
      }

      const data: CounterWithSessionDTO[] = await res.json();

      setCounters(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error fetching counters'
      );
    } finally {
      setInitialLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const handleOpenCreate = () => {
    setEditingCounter(null);

    const nextNumber =
      counters.length > 0
        ? Math.max(
          ...counters.map((c) => c.counterNumber)
        ) + 1
        : 1;

    setFormData({
      counterNumber: nextNumber,
      name: `Counter ${nextNumber}`,
      isActive: true,
    });

    setShowModal(true);
  };

  const handleOpenEdit = (
    counter: CounterWithSessionDTO
  ) => {
    setEditingCounter(counter);

    setFormData({
      counterNumber: counter.counterNumber,
      name: counter.name,
      isActive: counter.isActive,
    });

    setShowModal(true);
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
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

        throw new Error(
          data.message || 'Failed to save counter'
        );
      }

      const savedCounter: CounterDTO =
        await res.json();

      setCounters((prev) => {
        if (editingCounter) {
          return prev.map((c) =>
            c.id === savedCounter.id
              ? {
                ...c,
                counterNumber:
                  savedCounter.counterNumber,
                name: savedCounter.name,
                isActive: savedCounter.isActive,
              }
              : c
          );
        }

        const newCounterWithSession: CounterWithSessionDTO =
        {
          ...savedCounter,
          currentSession: null,
        };

        return [...prev, newCounterWithSession].sort(
          (a, b) =>
            a.counterNumber - b.counterNumber
        );
      });

      setShowModal(false);

      setSuccessMsg(
        editingCounter
          ? 'Counter desk updated successfully'
          : 'Counter desk created successfully'
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error saving counter'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (
    counter: CounterWithSessionDTO
  ) => {
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

      const res = await fetch(
        `${API_BASE}/api/counters/${counter.id}/status`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            isActive: !counter.isActive,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message || 'Failed to toggle status'
        );
      }

      const updated: CounterDTO =
        await res.json();

      setCounters((prev) =>
        prev.map((c) =>
          c.id === updated.id
            ? {
              ...c,
              isActive: updated.isActive,
            }
            : c
        )
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error toggling counter status'
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const handleOpenSession = async (
    counter: CounterWithSessionDTO
  ) => {
    try {
      setActionPendingId(counter.id);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();

      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE}/api/counters/${counter.id}/open`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message || 'Failed to open desk session'
        );
      }

      const data: {
        session: CounterSessionDTO;
      } = await res.json();

      setSuccessMsg(
        `Desk #${counter.counterNumber} operator session opened successfully`
      );

      setCounters((prev) =>
        prev.map((c) =>
          c.id === counter.id
            ? {
              ...c,
              currentSession: data.session,
            }
            : c
        )
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error opening counter desk'
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const handleCloseSession = async (
    counter: CounterWithSessionDTO
  ) => {
    try {
      setActionPendingId(counter.id);
      setError(null);
      setSuccessMsg(null);

      const token = await getToken();

      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE}/api/counters/${counter.id}/close`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message ||
          'Failed to close counter desk session'
        );
      }

      setSuccessMsg(
        `Desk #${counter.counterNumber} session concluded`
      );

      setCounters((prev) =>
        prev.map((c) =>
          c.id === counter.id
            ? {
              ...c,
              currentSession: null,
            }
            : c
        )
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error closing counter desk'
      );
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Counters & Desks
          </h2>

          <p className="text-xs text-slate-500">
            Manage physical service counters and live operator
            desk shifts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
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

      {/* Error */}
      {error && (
        <AlertBanner
          type="error"
          title="Desk Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Success */}
      {successMsg && (
        <AlertBanner
          type="success"
          title="Desk Update"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {/* Counter List */}
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
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Desk #</th>
                <th className="py-3 px-4">Counter Name</th>
                <th className="py-3 px-4">Desk Status</th>
                <th className="py-3 px-4">
                  Operator Session
                </th>
                <th className="py-3 px-4 text-right">
                  Desk Shift
                </th>
                <th className="py-3 px-4 text-right">
                  Admin Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCounters.map((c) => {
                const isSessionOpen =
                  !!c.currentSession;

                const isPending =
                  actionPendingId === c.id;

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                      #{c.counterNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {c.name}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.isActive ? (
                        <Badge
                          variant="success"
                          size="sm"
                          dot
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="neutral"
                          size="sm"
                          dot
                        >
                          Inactive
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isSessionOpen ? (
                        <Badge
                          variant="navy"
                          size="sm"
                          dot
                          pulse
                        >
                          OPEN (
                          {c.currentSession?.user?.name ||
                            c.currentSession?.user?.email ||
                            'Operator'}
                          )
                        </Badge>
                      ) : (
                        <Badge
                          variant="neutral"
                          size="sm"
                        >
                          CLOSED
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isSessionOpen ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isPending}
                          isLoading={isPending}
                          onClick={() =>
                            handleCloseSession(c)
                          }
                        >
                          Close Shift
                        </Button>
                      ) : (
                        <Button
                          variant="success"
                          size="sm"
                          disabled={
                            !c.isActive || isPending
                          }
                          isLoading={isPending}
                          onClick={() =>
                            handleOpenSession(c)
                          }
                        >
                          Open Shift
                        </Button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          handleOpenEdit(c)
                        }
                      >
                        Edit
                      </Button>

                      <Button
                        variant={
                          c.isActive
                            ? 'destructive-outline'
                            : 'success'
                        }
                        size="sm"
                        disabled={isPending}
                        isLoading={isPending}
                        onClick={() =>
                          handleToggleStatus(c)
                        }
                      >
                        {c.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Counter Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-7 space-y-5 border border-slate-200">

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingCounter
                  ? 'Edit Counter Desk'
                  : 'Create Counter Desk'}
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Configure physical service window number and
                designation
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-xs"
            >
              {/* Counter Number */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  Counter / Desk Number *
                </label>

                <input
                  type="number"
                  required
                  min={1}
                  value={formData.counterNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterNumber:
                        parseInt(
                          e.target.value,
                          10
                        ) || 1,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                />
              </div>

              {/* Counter Name */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  Counter Name / Label *
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Counter 1 (General Assistance)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSaving}
                  onClick={() =>
                    setShowModal(false)
                  }
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
                  {editingCounter
                    ? 'Save Changes'
                    : 'Create Desk'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}