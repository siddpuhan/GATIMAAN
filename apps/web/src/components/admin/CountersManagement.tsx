import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CounterWithSessionDTO, CreateCounterInput, CounterDTO, CounterSessionDTO } from '@gatimaan/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function CountersManagement() {
  const { getToken } = useAuth();
  const [counters, setCounters] = useState<CounterWithSessionDTO[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState<CounterWithSessionDTO | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCounterInput>({
    counterNumber: 1,
    name: '',
    isActive: true,
  });

  const fetchCounters = async () => {
    try {
      setError(null);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/counters`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch counters');
      }

      const data = await res.json();
      setCounters(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching counters');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCounters();
  }, []);

  const handleOpenCreate = () => {
    setEditingCounter(null);
    const nextNumber = counters.length > 0 ? Math.max(...counters.map((c) => c.counterNumber)) + 1 : 1;
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

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save counter');
      }

      const savedCounter: CounterDTO = await res.json();

      setCounters((prev) => {
        if (editingCounter) {
          return prev.map((c) =>
            c.id === savedCounter.id
              ? { ...c, counterNumber: savedCounter.counterNumber, name: savedCounter.name, isActive: savedCounter.isActive }
              : c
          );
        }
        const newCounterWithSession: CounterWithSessionDTO = {
          ...savedCounter,
          currentSession: null,
        };
        return [...prev, newCounterWithSession].sort((a, b) => a.counterNumber - b.counterNumber);
      });

      setShowModal(false);
      setSuccessMsg(editingCounter ? 'Counter updated successfully' : 'Counter created successfully');
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
      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ isActive: !counter.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to toggle status');
      }

      const updated: CounterDTO = await res.json();
      setCounters((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, isActive: updated.isActive } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling status');
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
      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/open`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to open counter');
      }

      const data: { session: CounterSessionDTO } = await res.json();
      setSuccessMsg(`Counter ${counter.counterNumber} desk session opened`);

      setCounters((prev) =>
        prev.map((c) => (c.id === counter.id ? { ...c, currentSession: data.session } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error opening counter');
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
      const res = await fetch(`${API_BASE}/api/counters/${counter.id}/close`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to close counter');
      }

      setSuccessMsg(`Counter ${counter.counterNumber} desk session closed`);

      setCounters((prev) =>
        prev.map((c) => (c.id === counter.id ? { ...c, currentSession: null } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing counter');
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Counters & Desks</h3>
          <p className="text-xs text-gray-500">Manage physical service desks and active operator shifts</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition shadow-xs"
        >
          + Add Counter
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          {successMsg}
        </div>
      )}

      {initialLoading ? (
        <div className="text-center py-8 text-xs text-gray-500 flex items-center justify-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Loading counters...
        </div>
      ) : counters.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
          No counters configured yet. Click &quot;+ Add Counter&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Desk #</th>
                <th className="py-2.5 px-4 font-semibold">Counter Name</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Session State</th>
                <th className="py-2.5 px-4 font-semibold text-right">Desk Actions</th>
                <th className="py-2.5 px-4 font-semibold text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {counters.map((c) => {
                const isSessionOpen = !!c.currentSession;
                const isPending = actionPendingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/75 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                      #{c.counterNumber}
                    </td>
                    <td className="py-2.5 px-4 text-gray-800 font-medium">{c.name}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.isActive
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {isSessionOpen ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          OPEN ({c.currentSession?.user?.name || c.currentSession?.user?.email || 'Logged In'})
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-[10px]">
                          CLOSED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {isSessionOpen ? (
                        <button
                          onClick={() => handleCloseSession(c)}
                          disabled={isPending}
                          className="px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded font-medium hover:bg-amber-100 transition disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {isPending && (
                            <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                          )}
                          Close Session
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenSession(c)}
                          disabled={!c.isActive || isPending}
                          className="px-2.5 py-1 bg-green-50 border border-green-300 text-green-800 rounded font-medium hover:bg-green-100 transition disabled:opacity-40 inline-flex items-center gap-1"
                        >
                          {isPending && (
                            <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                          )}
                          Open Session
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        disabled={isPending}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={isPending}
                        className={`font-medium disabled:opacity-40 inline-flex items-center gap-1 ${
                          c.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {isPending && (
                          <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                        )}
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-gray-900">
              {editingCounter ? 'Edit Counter' : 'Create New Counter'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Counter / Desk Number *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.counterNumber}
                  onChange={(e) => setFormData({ ...formData, counterNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Counter Name / Label *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Counter 1 (General Assistance)"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSaving && (
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  {editingCounter ? 'Save Changes' : 'Create Counter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

