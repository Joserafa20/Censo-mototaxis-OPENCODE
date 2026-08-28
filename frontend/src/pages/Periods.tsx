import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CensusPeriod {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  closedAt?: string | null;
  closedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_STYLES: Record<string, string> = {
  INACTIVO: 'bg-gray-100 text-gray-700 border border-gray-200',
  ACTIVO: 'bg-green-100 text-green-800 border border-green-200',
  FINALIZADO: 'bg-blue-100 text-blue-800 border border-blue-200',
  CERRADO: 'bg-gray-800 text-white border border-gray-800',
};

function normalizeStatus(s: string) {
  return s?.toUpperCase() || '';
}

export default function Periods() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [periods, setPeriods] = useState<CensusPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });

  const fetchPeriods = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get('/census-periods');
      const data = res.data.periods || res.data.data || res.data || [];
      setPeriods(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al cargar períodos';
      // If not admin, show friendly message but keep layout
      if (err.response?.status === 403) {
        setError('No tienes permisos para ver períodos');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleClose = async (id: string) => {
    if (!confirm('¿Cerrar este período? Esta acción no se puede deshacer si hay registros pendientes se mostrará error.')) return;
    setClosingId(id);
    setError('');
    setSuccess('');
    try {
      await api.post(`/census-periods/${id}/close`);
      setSuccess('Período cerrado correctamente');
      fetchPeriods();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'PERIOD_HAS_PENDING_RECORDS') {
        setError(`No se puede cerrar: tiene registros pendientes (${data.pendingCount ?? ''} pendientes, ${data.inProgressCount ?? ''} en proceso)`);
      } else {
        setError(data?.message || data?.error || err.message || 'Error al cerrar período');
      }
    } finally {
      setClosingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/census-periods', {
        name: form.name,
        description: form.description || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setShowCreate(false);
      setForm({ name: '', description: '', startDate: '', endDate: '' });
      setSuccess('Período creado correctamente');
      fetchPeriods();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al crear período');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodos</h1>
          <p className="text-gray-500 mt-1">Gestión de periodos de censo</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Período
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
            <p>Cargando períodos...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay períodos</h3>
            <p className="text-gray-500 text-sm">Crea el primer período de censo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {periods.map((p) => {
                  const s = normalizeStatus(p.status);
                  const style = STATUS_STYLES[s] || 'bg-gray-100 text-gray-700 border border-gray-200';
                  const isActivo = s === 'ACTIVO';
                  const isCerrado = s === 'CERRADO' || s === 'FINALIZADO';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        {p.description && <div className="text-xs text-gray-500 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {p.startDate ? new Date(p.startDate).toLocaleDateString('es-PA') : '—'} — {p.endDate ? new Date(p.endDate).toLocaleDateString('es-PA') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
                          {isCerrado && s === 'CERRADO' ? 'CERRADO' : isCerrado ? 'FINALIZADO' : p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isAdmin && isActivo && (
                          <button
                            onClick={() => handleClose(p.id)}
                            disabled={closingId === p.id}
                            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {closingId === p.id ? 'Cerrando...' : 'Cerrar Período'}
                          </button>
                        )}
                        {isCerrado && <span className="text-xs text-gray-400">—</span>}
                        {!isAdmin && isActivo && <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Período</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Censo 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Descripción opcional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin *</label>
                  <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50">{isCreating ? 'Creando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
