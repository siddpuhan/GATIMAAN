import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ServiceDTO, CreateServiceInput } from '@gatimaan/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function ServicesManagement() {
  const { getToken } = useAuth();
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDTO | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateServiceInput>({
    code: '',
    name: '',
    description: '',
    prefix: '',
    avgDurationMinutes: 15,
    priority: 1,
    isActive: true,
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/services`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch services');
      }

      const data = await res.json();
      setServices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

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
      setError(null);
      const token = await getToken();
      const url = editingService
        ? `${API_BASE}/api/services/${editingService.id}`
        : `${API_BASE}/api/services`;
      const method = editingService ? 'PATCH' : 'POST';

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
        throw new Error(data.message || 'Failed to save service');
      }

      setShowModal(false);
      await fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving service');
    }
  };

  const handleToggleStatus = async (service: ServiceDTO) => {
    try {
      setError(null);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/services/${service.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ isActive: !service.isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to toggle status');
      }

      await fetchServices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Services Catalog</h3>
          <p className="text-xs text-gray-500">Configure center services, token prefixes, and duration weights</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
        >
          + Add Service
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-xs text-gray-500">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
          No services configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Code</th>
                <th className="py-2.5 px-4 font-semibold">Name</th>
                <th className="py-2.5 px-4 font-semibold">Prefix</th>
                <th className="py-2.5 px-4 font-semibold">Avg Duration</th>
                <th className="py-2.5 px-4 font-semibold">Priority</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="py-2.5 px-4 font-mono font-medium text-gray-900">{s.code}</td>
                  <td className="py-2.5 px-4 text-gray-800 font-medium">
                    {s.name}
                    {s.description && (
                      <p className="text-[11px] text-gray-500 font-normal">{s.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono font-bold">
                      {s.prefix}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-600">{s.avgDurationMinutes} mins</td>
                  <td className="py-2.5 px-4 text-gray-600">{s.priority}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        s.isActive
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`font-medium ${
                        s.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-gray-900">
              {editingService ? 'Edit Service' : 'Create New Service'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Service Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. ADH"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Ticket Prefix *</label>
                  <input
                    type="text"
                    required
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. A"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aadhaar Services"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Service requirements or details"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Avg Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.avgDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, avgDurationMinutes: parseInt(e.target.value, 10) || 15 })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Priority Rank</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                >
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
