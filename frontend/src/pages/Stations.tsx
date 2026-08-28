import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Station {
  id: string | number;
  name: string;
  locationType: string;
  corregimiento?: { id: number; name: string } | string | null;
  corregimientoId?: number | null;
  neighborhoodId?: number | null;
  neighborhood?: { id: number; name: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  status?: string;
  is_active?: boolean;
}

interface Corregimiento {
  id: number;
  name: string;
}

export default function Stations() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stations, setStations] = useState<Station[]>([]);
  const [corregimientos, setCorregimientos] = useState<Corregimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    locationType: 'urban' as 'urban' | 'rural',
    corregimientoId: '',
    neighborhoodId: '',
    latitude: '',
    longitude: '',
  });

  const fetchStations = async (locationType?: string) => {
    try {
      setIsLoading(true);
      setError('');
      const params = locationType ? { locationType } : {};
      const res = await api.get('/stations', { params });
      const data = res.data.stations || res.data.data || res.data || [];
      setStations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar estaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCorregimientos = async () => {
    try {
      const res = await api.get('/corregimientos');
      const data = res.data.corregimientos || res.data.data || res.data || [];
      setCorregimientos(Array.isArray(data) ? data : []);
    } catch {
      // silent - corregimientos optional
    }
  };

  useEffect(() => {
    fetchStations(filter || undefined);
  }, [filter]);

  useEffect(() => {
    fetchCorregimientos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        locationType: form.locationType,
      };
      if (form.locationType === 'rural' && form.corregimientoId) {
        payload.corregimientoId = Number(form.corregimientoId);
      }
      if (form.neighborhoodId) payload.neighborhoodId = Number(form.neighborhoodId);
      if (form.latitude) payload.latitude = Number(form.latitude);
      if (form.longitude) payload.longitude = Number(form.longitude);

      await api.post('/stations', payload);
      setShowModal(false);
      setForm({ name: '', locationType: 'urban', corregimientoId: '', neighborhoodId: '', latitude: '', longitude: '' });
      fetchStations(filter || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear estación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string | number) => {
    if (!confirm('¿Desactivar esta estación?')) return;
    try {
      await api.patch(`/stations/${id}/deactivate`);
      fetchStations(filter || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar estación');
    }
  };

  const getCorregimientoName = (s: Station) => {
    if (typeof s.corregimiento === 'string') return s.corregimiento;
    if (s.corregimiento && typeof s.corregimiento === 'object' && 'name' in s.corregimiento) return s.corregimiento.name;
    return '—';
  };

  const getStatus = (s: Station) => {
    if (typeof s.isActive === 'boolean') return s.isActive;
    if (typeof s.is_active === 'boolean') return s.is_active;
    if (s.status) return s.status === 'active' || s.status === 'activo';
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estaciones</h1>
          <p className="text-gray-500 mt-1">Gestión de estaciones urbanas y rurales</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Crear Estación
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filtrar por tipo:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
        >
          <option value="">Todos</option>
          <option value="urban">Urbano</option>
          <option value="rural">Rural</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
            <p>Cargando estaciones...</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg font-medium">No hay estaciones registradas</p>
            <p className="text-sm text-gray-400 mt-1">Crea la primera estación para comenzar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Corregimiento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stations.map((station) => (
                <tr key={String(station.id)} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{station.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${station.locationType === 'rural' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {station.locationType === 'rural' ? 'Rural' : 'Urbano'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCorregimientoName(station)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatus(station) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {getStatus(station) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isAdmin && getStatus(station) && (
                      <button onClick={() => handleDeactivate(station.id)} className="text-red-600 hover:text-red-900 font-medium">
                        Desactivar
                      </button>
                    )}
                    {!isAdmin && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Crear Estación</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Ej: Estación Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de ubicación</label>
                <select
                  value={form.locationType}
                  onChange={(e) => setForm({ ...form, locationType: e.target.value as 'urban' | 'rural', corregimientoId: e.target.value === 'urban' ? '' : form.corregimientoId })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                >
                  <option value="urban">Urbano</option>
                  <option value="rural">Rural</option>
                </select>
              </div>

              {form.locationType === 'rural' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corregimiento</label>
                  <select
                    value={form.corregimientoId}
                    onChange={(e) => setForm({ ...form, corregimientoId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  >
                    <option value="">Seleccione corregimiento</option>
                    {corregimientos.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Barrio (opcional)</label>
                <input
                  type="number"
                  value={form.neighborhoodId}
                  onChange={(e) => setForm({ ...form, neighborhoodId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Ej: 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitud (opcional)</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Ej: 8.123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitud (opcional)</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Ej: -73.123456"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Estación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
