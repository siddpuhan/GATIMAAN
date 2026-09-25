import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, CreateServiceInput } from '@gatimaan/shared';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import {
  AlertBanner,
  LoadingState,
  EmptyState,
} from '../ui/FeedbackStates.js';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function ServicesManagement() {
  const { getToken } = useAuth();

  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] =
    useState<ServiceDTO | null>(null);

  const [formData, setFormData] = useState<CreateServiceInput>({
    code: '',
    name: '',
    description: '',
    prefix: '',
    avgDurationMinutes: 15,
    priority: 1,
    isActive: true,
  });

  const fetchServices = useCallback(async () => {
    try {
      setError(null);

      const token = await getToken();

      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/services`, { headers });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || 'Failed to fetch services catalog'
        );
      }

      const data: ServiceDTO[] = await res.json();
      setServices(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error fetching services'
      );
    } finally {
      setInitialLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenCreate = () => {
    setEditingService(null);

    setFormData({
      code: '',
      name: '',
      description: '',
      prefix: '',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    });

    setShowModal(true);
  };

  const handleOpenEdit = (service: ServiceDTO) => {
    setEditingService(service);

    setFormData({
      code: service.code,
      name: service.name,
      description: service.description || '',
      prefix: service.prefix,
      avgDurationMinutes: service.avgDurationMinutes,
      priority: service.priority,
      isActive: service.isActive,
    });

    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError(null);

      const token = await getToken();

      const url = editingService
        ? `${API_BASE}/api/services/${editingService.id}`
        : `${API_BASE}/api/services`;

      const method = editingService ? 'PATCH' : 'POST';

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
          data.message || 'Failed to save service'
        );
      }

      const savedService: ServiceDTO = await res.json();

      setServices((prev) => {
        if (editingService) {
          return prev.map((s) =>
            s.id === savedService.id ? savedService : s
          );
        }

        return [...prev, savedService].sort(
          (a, b) =>
            a.priority - b.priority ||
            a.code.localeCompare(b.code)
        );
      });

      setShowModal(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error saving service'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (service: ServiceDTO) => {
    try {
      setActionPendingId(service.id);
      setError(null);

      const token = await getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE}/api/services/${service.id}/status`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            isActive: !service.isActive,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message || 'Failed to toggle status'
        );
      }

      const updatedService: ServiceDTO = await res.json();

      setServices((prev) =>
        prev.map((s) =>
          s.id === updatedService.id ? updatedService : s
        )
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error toggling service status'
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();

    if (!q) return true;

    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.prefix.toLowerCase().includes(q) ||
      (s.description &&
        s.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Services Catalog
          </h2>

          <p className="text-xs text-slate-500">
            Configure citizen department services, token prefix
            codes, and average duration weights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog..."
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 min-w-[200px]"
          />

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            icon={<span>+</span>}
          >
            Add Service
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <AlertBanner
          type="error"
          title="Catalog Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Services */}
      {initialLoading ? (
        <LoadingState message="Loading services catalog..." />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title="No services found"
          message={
            searchQuery
              ? `No services matching "${searchQuery}".`
              : 'No services configured yet. Click "Add Service" to create one.'
          }
          action={
            searchQuery
              ? {
                label: 'Clear Filter',
                onClick: () => setSearchQuery(''),
              }
              : {
                label: 'Add First Service',
                onClick: handleOpenCreate,
              }
          }
        />
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Prefix</th>
                <th className="py-3 px-4">Avg Duration</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((s) => {
                const isPending =
                  actionPendingId === s.id;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.code}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{s.name}</div>

                      {s.description && (
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5 max-w-sm">
                          {s.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="navy" size="sm">
                        <span className="font-mono font-bold">
                          {s.prefix}
                        </span>
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {s.avgDurationMinutes} mins
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      Rank {s.priority}
                    </td>

                    <td className="py-3.5 px-4">
                      {s.isActive ? (
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

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleOpenEdit(s)}
                      >
                        Edit
                      </Button>

                      <Button
                        variant={
                          s.isActive
                            ? 'destructive-outline'
                            : 'success'
                        }
                        size="sm"
                        disabled={isPending}
                        isLoading={isPending}
                        onClick={() =>
                          handleToggleStatus(s)
                        }
                      >
                        {s.isActive
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200">

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingService
                  ? 'Edit Citizen Service'
                  : 'Configure New Service'}
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Set token numbering prefix, department code,
                and average wait weights
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-xs"
            >
              {/* Code + Prefix */}
              <div className="grid grid-cols-2 gap-3">

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">
                    Service Code *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. ADH"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">
                    Token Prefix *
                  </label>

                  <input
                    type="text"
                    required
                    value={formData.prefix}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prefix: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. A"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  Service Name *
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
                  placeholder="e.g. Aadhaar Card Biometric Update"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold">
                  Description
                </label>

                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Public citizen guidance and document requirements..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 text-xs"
                />
              </div>

              {/* Duration + Priority */}
              <div className="grid grid-cols-2 gap-3">

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">
                    Avg Duration (mins)
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={formData.avgDurationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avgDurationMinutes:
                          parseInt(e.target.value, 10) || 15,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">
                    Priority Rank
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority:
                          parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={isSaving}
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
                  {editingService
                    ? 'Save Changes'
                    : 'Create Service'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}