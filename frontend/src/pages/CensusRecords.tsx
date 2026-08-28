import { useState, useEffect } from 'react';
import api from '../services/api';

interface CensusRecord {
  id: string | number;
  cedula?: string;
  documentNumber?: string;
  fullName?: string;
  nombreCompleto?: string;
  name?: string;
  plate?: string;
  placa?: string;
  motoPlaca?: string;
  station?: { name: string } | string | null;
  stationName?: string;
  estado?: string;
  status?: string;
  [key: string]: unknown;
}

export default function CensusRecords() {
  const [records, setRecords] = useState<CensusRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    cedula: '',
    nombreCompleto: '',
    fechaNacimiento: '',
    genero: '',
    estadoCivil: '',
    telefonos: '',
    direccion: '',
    barrio: '',
    motoMarca: '',
    motoModelo: '',
    motoColor: '',
    motoPlaca: '',
    motoAnio: '',
    motoTipo: '',
    motoNumeroMotor: '',
    estado: 'activo',
    ingresosDiarios: '',
    horario: '',
    operacion: 'station',
    corregimientoOperacion: '',
    barrioOperacion: '',
    observaciones: '',
    stationId: '',
  });

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get('/census-records');
      const data = res.data.records || res.data.data || res.data.censusRecords || res.data || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar registros');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!search.trim()) {
      fetchRecords();
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get('/census-records/search', { params: { q: search.trim() } });
      const data = res.data.records || res.data.data || res.data.results || res.data || [];
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error en la búsqueda');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        cedula: form.cedula,
        nombreCompleto: form.nombreCompleto,
        fechaNacimiento: form.fechaNacimiento || undefined,
        genero: form.genero || undefined,
        estadoCivil: form.estadoCivil || undefined,
        telefonos: form.telefonos || undefined,
        direccion: form.direccion || undefined,
        barrio: form.barrio || undefined,
        motoMarca: form.motoMarca || undefined,
        motoModelo: form.motoModelo || undefined,
        motoColor: form.motoColor || undefined,
        motoPlaca: form.motoPlaca || undefined,
        motoAnio: form.motoAnio ? Number(form.motoAnio) : undefined,
        motoTipo: form.motoTipo || undefined,
        motoNumeroMotor: form.motoNumeroMotor || undefined,
        estado: form.estado || undefined,
        ingresosDiarios: form.ingresosDiarios ? Number(form.ingresosDiarios) : undefined,
        horario: form.horario || undefined,
        operacion: form.operacion || undefined,
        corregimientoOperacion: form.corregimientoOperacion || undefined,
        barrioOperacion: form.barrioOperacion || undefined,
        observaciones: form.observaciones || undefined,
        stationId: form.stationId ? Number(form.stationId) : undefined,
      };
      // Also send alternative keys for backend compatibility
      payload.documentNumber = payload.cedula;
      payload.fullName = payload.nombreCompleto;
      payload.placa = payload.motoPlaca;

      await api.post('/census-records', payload);
      setShowModal(false);
      setForm({
        cedula: '', nombreCompleto: '', fechaNacimiento: '', genero: '', estadoCivil: '',
        telefonos: '', direccion: '', barrio: '', motoMarca: '', motoModelo: '', motoColor: '',
        motoPlaca: '', motoAnio: '', motoTipo: '', motoNumeroMotor: '', estado: 'activo',
        ingresosDiarios: '', horario: '', operacion: 'station', corregimientoOperacion: '',
        barrioOperacion: '', observaciones: '', stationId: '',
      });
      fetchRecords();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCedula = (r: CensusRecord) => (r.cedula || r.documentNumber || '—') as string;
  const getNombre = (r: CensusRecord) => (r.nombreCompleto || r.fullName || r.name || '—') as string;
  const getPlaca = (r: CensusRecord) => (r.motoPlaca || r.placa || r.plate || '—') as string;
  const getEstacion = (r: CensusRecord) => {
    if (r.station && typeof r.station === 'object' && 'name' in r.station) return (r.station as { name: string }).name;
    if (typeof r.station === 'string') return r.station;
    if (r.stationName) return r.stationName as string;
    return '—';
  };
  const getEstado = (r: CensusRecord) => (r.estado || r.status || '—') as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Censo</h1>
          <p className="text-gray-500 mt-1">Registro de mototaxistas censados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Registro
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cédula o placa..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); fetchRecords(); }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </form>
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
            <p>Cargando registros...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No hay registros</p>
            <p className="text-sm text-gray-400 mt-1">Crea el primer registro de censo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((r) => (
                  <tr key={String(r.id)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getCedula(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getNombre(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPlaca(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getEstacion(r)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{getEstado(r)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-gray-600 hover:text-gray-900 font-medium">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Registro de Censo</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">
              {/* Datos personales */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Datos personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula *</label>
                    <input type="text" required value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 1234567890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input type="text" required value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha nacimiento</label>
                    <input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                    <select value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="">Seleccione</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado civil</label>
                    <select value={form.estadoCivil} onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="">Seleccione</option>
                      <option value="soltero">Soltero</option>
                      <option value="casado">Casado</option>
                      <option value="union_libre">Unión libre</option>
                      <option value="separado">Separado</option>
                      <option value="viudo">Viudo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfonos</label>
                    <input type="text" value={form.telefonos} onChange={(e) => setForm({ ...form, telefonos: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 3001234567" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Calle 10 #5-20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
                    <input type="text" value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Centro" />
                  </div>
                </div>
              </div>

              {/* Datos moto */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Datos de la moto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <input type="text" value={form.motoMarca} onChange={(e) => setForm({ ...form, motoMarca: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Yamaha" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                    <input type="text" value={form.motoModelo} onChange={(e) => setForm({ ...form, motoModelo: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: NMAX" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input type="text" value={form.motoColor} onChange={(e) => setForm({ ...form, motoColor: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Negro" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                    <input type="text" value={form.motoPlaca} onChange={(e) => setForm({ ...form, motoPlaca: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: ABC123" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                    <input type="number" value={form.motoAnio} onChange={(e) => setForm({ ...form, motoAnio: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 2023" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <input type="text" value={form.motoTipo} onChange={(e) => setForm({ ...form, motoTipo: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Automática" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de motor</label>
                    <input type="text" value={form.motoNumeroMotor} onChange={(e) => setForm({ ...form, motoNumeroMotor: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: ABC123456" />
                  </div>
                </div>
              </div>

              {/* Operación */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Operación</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="suspendido">Suspendido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ingresos diarios</label>
                    <input type="number" value={form.ingresosDiarios} onChange={(e) => setForm({ ...form, ingresosDiarios: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 50000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                    <input type="text" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 6am - 6pm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operación</label>
                    <select value={form.operacion} onChange={(e) => setForm({ ...form, operacion: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none">
                      <option value="station">Estación</option>
                      <option value="independiente">Independiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Corregimiento operación</label>
                    <input type="text" value={form.corregimientoOperacion} onChange={(e) => setForm({ ...form, corregimientoOperacion: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: La Mesa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barrio operación</label>
                    <input type="text" value={form.barrioOperacion} onChange={(e) => setForm({ ...form, barrioOperacion: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Centro" />
                  </div>
                  {form.operacion === 'station' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Estación (opcional)</label>
                      <input type="number" value={form.stationId} onChange={(e) => setForm({ ...form, stationId: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: 1" />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Observaciones adicionales..." />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Guardando...' : 'Crear Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
