import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CensusValidation {
  id: string;
  censusRecordId?: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string;
  actorRole: string;
  reason?: string | null;
  createdAt: string;
}

interface CensusRecord {
  id: string | number;
  cedula?: string;
  documentNumber?: string;
  mototaxiCedula?: string;
  fullName?: string;
  nombreCompleto?: string;
  name?: string;
  mototaxiFirstName?: string;
  mototaxiLastName?: string;
  plate?: string;
  placa?: string;
  motoPlaca?: string;
  motorcyclePlate?: string;
  station?: { name: string } | string | null;
  stationName?: string;
  estado?: string;
  status?: string;
  periodId?: string;
  periodStatus?: string;
  validationReason?: string | null;
  inactiveReason?: string | null;
  reason?: string | null;
  validations?: CensusValidation[];
  [key: string]: unknown;
}

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-700 border border-gray-200',
  EN_PROCESO: 'bg-blue-100 text-blue-800 border border-blue-200',
  COMPLETADO: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  EN_REVISION: 'bg-orange-100 text-orange-800 border border-orange-200',
  APROBADO: 'bg-green-100 text-green-800 border border-green-200',
  RECHAZADO: 'bg-red-100 text-red-800 border border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETADO: 'Completado',
  EN_REVISION: 'En revisión',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

function normalizeStatus(s: string | undefined): string {
  if (!s) return '';
  return s.toUpperCase();
}

function getStatusBadge(statusRaw: string | undefined) {
  const n = normalizeStatus(statusRaw);
  const style = STATUS_STYLES[n] || 'bg-gray-100 text-gray-700 border border-gray-200';
  const label = STATUS_LABELS[n] || statusRaw || '—';
  return { n, style, label };
}

export default function CensusRecords() {
  const { user } = useAuth();
  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isCensista = role === 'censista';

  const [records, setRecords] = useState<CensusRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodClosed, setPeriodClosed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail / validations
  const [selected, setSelected] = useState<CensusRecord | null>(null);
  const [detail, setDetail] = useState<CensusRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ id: string | number | null; reason: string }>({ id: null, reason: '' });

  const [stations, setStations] = useState<any[]>([]);
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
    consentGiven: false,
    consentSignature: '',
    vehicleType: 'MOTOTAXI' as 'MOTO_FAMILIAR'|'MOTOTAXI'|'MOTOCARRO',
    ownershipType: '' as ''|'PROPIA'|'PAGA_TARIFA',
    operationMode: '' as ''|'ESTACION'|'CIRCULANTE',
    tarifaValor: '',
    documentosAlDia: null as boolean|null,
    horarioAmpliado: '' as ''|'DIURNO'|'NOCTURNO',
    actividadMotocarro: '',
  });
  const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get('/census-records');
      const data = res.data.records || res.data.data || res.data.censusRecords || res.data || [];
      const list: CensusRecord[] = Array.isArray(data) ? data : [];
      setRecords(list);
      // Detect if any period is closed -> check periodStatus field if present
      // Also try to infer via period closed flag from records metadata
      const hasClosed = list.some((r) => {
        const ps = String((r as any).periodStatus || (r as any).period_status || '').toUpperCase();
        return ps === 'CERRADO' || ps === 'FINALIZADO';
      });
      if (hasClosed) setPeriodClosed(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cargar registros');
    } finally {
      setIsLoading(false);
    }
  };

  // Try to fetch periods to determine if current period is closed (for disabling actions globally)
  const fetchPeriodStatus = async () => {
    try {
      const res = await api.get('/census-periods', { params: { pageSize: 1 } });
      const periods = res.data.periods || res.data.data || [];
      if (Array.isArray(periods) && periods.length > 0) {
        // Check if any active period is actually CERRADO? We'll check all
        const closedExists = periods.some((p: any) => String(p.status).toUpperCase() === 'CERRADO' || String(p.status).toUpperCase() === 'FINALIZADO');
        // Only set global closed if we can identify the period of records - skip global flag unless needed
        // Instead we track per-record; leave periodClosed as hasClosed logic
        void closedExists;
      }
    } catch {
      // censista may not have access to /census-periods (admin only) -> ignore
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
    fetchPeriodStatus();
    api.get('/stations').then(r=> setStations(r.data.stations||r.data.data||r.data||[])).catch(()=>{});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consentGiven) { setError('Debe otorgar consentimiento informado (Ley 1581)'); return; }
    if (!form.consentSignature.trim() || form.consentSignature.trim().length < 3 || form.consentSignature.trim().length > 200) { setError('Firma requerida 3-200 caracteres'); return; }
    // espejo validación por vehicleType
    if (form.vehicleType==='MOTOTAXI') {
      if (!form.ownershipType) { setError('ownershipType requerido para MOTOTAXI'); return; }
      if (!form.operationMode) { setError('operationMode requerido'); return; }
      if (form.operationMode==='ESTACION' && !form.stationId) { setError('stationId requerido cuando ESTACION'); return; }
      if (form.ownershipType==='PAGA_TARIFA' && !(Number(form.tarifaValor)>0)) { setError('tarifaValor requerido >0'); return; }
      if (form.documentosAlDia===null) { setError('documentosAlDia requerido'); return; }
      if (!form.horarioAmpliado) { setError('horario requerido'); return; }
    } else if (form.vehicleType==='MOTOCARRO') {
      if (!form.actividadMotocarro.trim() || form.actividadMotocarro.trim().length<2) { setError('actividadMotocarro requerida >=2'); return; }
      if (!form.ownershipType) { setError('ownershipType requerido'); return; }
      if (form.ownershipType==='PAGA_TARIFA' && !(Number(form.tarifaValor)>0)) { setError('tarifaValor requerido >0'); return; }
      if (form.ownershipType==='PAGA_TARIFA' && form.documentosAlDia===null) { setError('documentosAlDia requerido cuando PAGA_TARIFA'); return; }
    } else if (form.vehicleType==='MOTO_FAMILIAR') {
      if (form.documentosAlDia===null) { setError('documentosAlDia requerido'); return; }
    }
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
        consentGiven: form.consentGiven,
        consentSignature: form.consentSignature.trim(),
      };
      (payload as any).vehicleType = form.vehicleType;
      if (form.vehicleType==='MOTOTAXI') {
        (payload as any).ownershipType = form.ownershipType;
        (payload as any).operationMode = form.operationMode;
        if (form.operationMode==='ESTACION') (payload as any).stationId = form.stationId;
        if (form.ownershipType==='PAGA_TARIFA') (payload as any).tarifaValor = Number(form.tarifaValor);
        (payload as any).documentosAlDia = form.documentosAlDia;
        (payload as any).horario = form.horarioAmpliado;
      } else if (form.vehicleType==='MOTOCARRO') {
        (payload as any).actividadMotocarro = form.actividadMotocarro.trim();
        (payload as any).ownershipType = form.ownershipType;
        if (form.ownershipType==='PAGA_TARIFA') { (payload as any).tarifaValor = Number(form.tarifaValor); (payload as any).documentosAlDia = form.documentosAlDia; }
        else { (payload as any).documentosAlDia = form.documentosAlDia; }
      } else {
        (payload as any).documentosAlDia = form.documentosAlDia;
      }
      // Map to backend expected names (both forms for compatibility)
      // Backend uses mototaxiCedula / motorcyclePlate but legacy payload also accepted via cedula -> try sending canonical fields too
      (payload as any).mototaxiCedula = form.cedula;
      (payload as any).mototaxiFirstName = form.nombreCompleto.split(' ')[0] || form.nombreCompleto;
      (payload as any).mototaxiLastName = form.nombreCompleto.split(' ').slice(1).join(' ') || '—';
      (payload as any).motorcyclePlate = form.motoPlaca;
      (payload as any).motorcycleBrand = form.motoMarca || 'N/A';
      (payload as any).motorcycleModel = form.motoModelo || 'N/A';
      (payload as any).motorcycleColor = form.motoColor || 'N/A';
      // Need periodId/corregimientoId - try to use first available
      if (!(payload as any).periodId) {
        try { const pr = await api.get('/census-periods', { params: { pageSize: 1 }}); const p = (pr.data.periods || pr.data.data || [])[0]; if (p) (payload as any).periodId = p.id; } catch {}
      }
      if (!(payload as any).corregimientoId) {
        try { const gr = await api.get('/geography/tree'); const corrs = (gr.data.data || gr.data || []); const flat: any[] = Array.isArray(corrs) ? corrs : []; // attempt find first corregimiento
          let cid = flat[0]?.corregimientos?.[0]?.id || flat[0]?.id; if (cid) (payload as any).corregimientoId = cid; } catch {}
      }
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
        barrioOperacion: '', observaciones: '', stationId: '', consentGiven: false, consentSignature: '',
        vehicleType: 'MOTOTAXI', ownershipType: '', operationMode: '', tarifaValor: '', documentosAlDia: null, horarioAmpliado: '', actividadMotocarro: '',
      });
      fetchRecords();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCedula = (r: CensusRecord) => (r.cedula || r.documentNumber || r.mototaxiCedula || '—') as string;
  const getNombre = (r: CensusRecord) => {
    if (r.nombreCompleto) return r.nombreCompleto as string;
    if (r.fullName) return r.fullName as string;
    if (r.name) return r.name as string;
    if (r.mototaxiFirstName || r.mototaxiLastName) return `${r.mototaxiFirstName || ''} ${r.mototaxiLastName || ''}`.trim() || '—';
    return '—';
  };
  const getPlaca = (r: CensusRecord) => (r.motoPlaca || r.placa || r.plate || r.motorcyclePlate || '—') as string;
  const getEstacion = (r: CensusRecord) => {
    if (r.station && typeof r.station === 'object' && 'name' in r.station) return (r.station as { name: string }).name;
    if (typeof r.station === 'string') return r.station;
    if (r.stationName) return r.stationName as string;
    return '—';
  };
  const getEstado = (r: CensusRecord) => (r.estado || r.status || '—') as string;
  const getValidationReason = (r: CensusRecord) => (r.validationReason || r.inactiveReason || r.reason || '') as string;

  const isPeriodClosed = (r: CensusRecord) => {
    if (periodClosed) return true;
    const ps = String((r as any).periodStatus || (r as any).period_status || '').toUpperCase();
    return ps === 'CERRADO' || ps === 'FINALIZADO';
  };

  const handleAction = async (id: string | number, action: 'submit' | 'review' | 'approve' | 'reject', reason?: string) => {
    const key = `${id}-${action}`;
    setActionLoading(key);
    setError('');
    try {
      if (action === 'reject') {
        await api.patch(`/census-records/${id}/reject`, { reason });
      } else {
        await api.patch(`/census-records/${id}/${action}`);
      }
      await fetchRecords();
      // refresh detail if open
      if (selected && String(selected.id) === String(id)) {
        fetchDetail(String(id));
      }
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.message || data?.error || err.message || 'Error en la acción';
      const code = data?.code ? ` (${data.code})` : '';
      setError(`${msg}${code}`);
    } finally {
      setActionLoading(null);
      if (action === 'reject') setRejectModal({ id: null, reason: '' });
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/census-records/${id}`);
      const d = res.data.record || res.data.data || res.data;
      setDetail(d);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar detalle');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (r: CensusRecord) => {
    setSelected(r);
    setDetail(null);
    fetchDetail(String(r.id));
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  const handleEvidenceUpload = async () => {
    if (!selected || !evidenceFiles || evidenceFiles.length === 0) return;
    if (evidenceFiles.length > 5) { setError('Máximo 5 fotos'); return; }
    const currentCount = ((detail as any)?.evidencePhotos?.length || 0);
    if (currentCount + evidenceFiles.length > 5) { setError('Se excede límite de 5 fotos'); return; }
    setUploadingEvidence(true);
    try {
      const fd = new FormData();
      Array.from(evidenceFiles).forEach(f => fd.append('photos', f));
      await api.post(`/census-records/${String(selected.id)}/evidence`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEvidenceFiles(null);
      fetchDetail(String(selected.id));
      fetchRecords();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.code || 'Error al subir fotos');
    } finally { setUploadingEvidence(false); }
  };

  const renderActions = (r: CensusRecord) => {
    const status = normalizeStatus(getEstado(r));
    const closed = isPeriodClosed(r);
    const id = r.id;
    const reason = getValidationReason(r);

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Ver detalle */}
        <button
          onClick={() => openDetail(r)}
          className="text-gray-600 hover:text-gray-900 font-medium text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Ver
        </button>

        {/* Censista: Enviar si PENDIENTE/EN_PROCESO */}
        {(isCensista || isAdmin) && (status === 'PENDIENTE' || status === 'EN_PROCESO') && (
          <button
            disabled={closed || actionLoading === `${id}-submit`}
            onClick={() => handleAction(id, 'submit')}
            className="text-xs font-medium px-3 py-1 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title={closed ? 'Período cerrado' : 'Enviar a completado'}
          >
            {actionLoading === `${id}-submit` ? 'Enviando...' : 'Enviar'}
          </button>
        )}

        {/* Censista/Admin ve motivo rechazo si RECHAZADO */}
        {status === 'RECHAZADO' && reason && (
          <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full max-w-[180px] truncate" title={reason}>
            Rechazo: {reason}
          </span>
        )}

        {/* Admin: Revisar si COMPLETADO */}
        {isAdmin && status === 'COMPLETADO' && (
          <button
            disabled={closed || actionLoading === `${id}-review`}
            onClick={() => handleAction(id, 'review')}
            className="text-xs font-medium px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title={closed ? 'Período cerrado' : 'Pasar a revisión'}
          >
            {actionLoading === `${id}-review` ? '...' : 'Revisar'}
          </button>
        )}

        {/* Admin: Aprobar/Rechazar si EN_REVISION */}
        {isAdmin && status === 'EN_REVISION' && (
          <>
            <button
              disabled={closed || actionLoading === `${id}-approve`}
              onClick={() => handleAction(id, 'approve')}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={closed ? 'Período cerrado' : 'Aprobar registro'}
            >
              {actionLoading === `${id}-approve` ? '...' : 'Aprobar'}
            </button>
            <button
              disabled={closed || actionLoading === `${id}-reject`}
              onClick={() => setRejectModal({ id, reason: '' })}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={closed ? 'Período cerrado' : 'Rechazar registro'}
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    );
  };

  const validationsToShow: CensusValidation[] | undefined = detail?.validations || (selected as any)?.validations;

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

      {periodClosed && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          El período está cerrado — las acciones de validación están deshabilitadas.
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
                {records.map((r) => {
                  const badge = getStatusBadge(getEstado(r));
                  return (
                    <tr key={String(r.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getCedula(r)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getNombre(r)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPlaca(r)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getEstacion(r)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>{badge.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {renderActions(r)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer / modal with validations timeline */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Detalle del registro #{String(selected.id)}</h3>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {detailLoading ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                  <p className="text-sm">Cargando detalle...</p>
                </div>
              ) : (
                <>
                  {detail && (
                    <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div><span className="text-gray-500">Cédula:</span> <span className="font-medium text-gray-900">{getCedula(detail)}</span></div>
                      <div><span className="text-gray-500">Nombre:</span> <span className="font-medium text-gray-900">{getNombre(detail)}</span></div>
                      <div><span className="text-gray-500">Placa:</span> <span className="font-medium text-gray-900">{getPlaca(detail)}</span></div>
                      <div><span className="text-gray-500">Estado:</span> {(() => { const b = getStatusBadge(getEstado(detail)); return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.style}`}>{b.label}</span>; })()}</div>
                      {getValidationReason(detail) && (
                        <div className="col-span-2"><span className="text-gray-500">Motivo rechazo:</span> <span className="text-red-600">{getValidationReason(detail)}</span></div>
                      )}
                    </div>
                  )}
                  {(detail as any)?.consentGiven !== undefined && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm space-y-1">
                      <h4 className="font-semibold text-gray-900">Consentimiento</h4>
                      <p><span className="text-gray-500">Otorgado:</span> {(detail as any).consentGiven ? 'Sí' : 'No'}</p>
                      <p><span className="text-gray-500">Firma:</span> {(detail as any).consentSignature || '—'}</p>
                      <p><span className="text-gray-500">Fecha:</span> {(detail as any).consentDate ? new Date((detail as any).consentDate).toLocaleString('es-PA') : '—'}</p>
                    </div>
                  )}
                  {(detail as any)?.evidencePhotos !== undefined && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900">Fotos evidenciales ({((detail as any).evidencePhotos?.length) || 0}/5)</h4>
                      {((detail as any).evidencePhotos?.length || 0) > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {(detail as any).evidencePhotos.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`evidencia ${i+1}`} className="w-full h-20 object-cover rounded border" /></a>
                          ))}
                        </div>
                      ) : <p className="text-xs text-gray-400">Sin fotos</p>}
                      <div className="flex gap-2 items-center">
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setEvidenceFiles(e.target.files)} className="text-xs flex-1" />
                        <button disabled={uploadingEvidence || !evidenceFiles || evidenceFiles.length===0} onClick={handleEvidenceUpload} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs disabled:opacity-40">{uploadingEvidence ? 'Subiendo...' : 'Subir'}</button>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Historial de validaciones</h4>
                    {!validationsToShow || validationsToShow.length === 0 ? (
                      <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center">Sin historial disponible</p>
                    ) : (
                      <div className="space-y-0 relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200"></div>
                        {validationsToShow.map((v, idx) => {
                          const badge = getStatusBadge(v.toStatus);
                          return (
                            <div key={v.id || idx} className="relative flex gap-3 pb-4 last:pb-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 bg-white ${badge.style.includes('green') ? 'border-green-300' : badge.style.includes('red') ? 'border-red-300' : badge.style.includes('blue') ? 'border-blue-300' : badge.style.includes('orange') ? 'border-orange-300' : badge.style.includes('yellow') ? 'border-yellow-300' : 'border-gray-300'}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                              </div>
                              <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500">{v.fromStatus || '—'}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>{badge.label}</span>
                                  </div>
                                  <span className="text-xs text-gray-400">{v.createdAt ? new Date(v.createdAt).toLocaleString('es-PA') : ''}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Por <span className="font-medium text-gray-700">{v.actorRole}</span> <span className="text-gray-400">({v.actorUserId?.slice(0, 8)})</span>
                                </div>
                                {v.reason && (
                                  <div className="text-xs text-red-600 mt-1 bg-red-50 border border-red-100 rounded-lg px-2 py-1">Motivo: {v.reason}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button onClick={closeDetail} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal.id !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Rechazar registro</h3>
              <p className="text-sm text-gray-500 mt-1">Ingresa el motivo del rechazo (10-500 caracteres)</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                rows={4}
                placeholder="Motivo del rechazo..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal({ id: null, reason: '' })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  disabled={!rejectModal.reason.trim() || rejectModal.reason.trim().length < 10}
                  onClick={() => handleAction(rejectModal.id!, 'reject', rejectModal.reason.trim())}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Tipo de vehículo *</h4>
                <select value={form.vehicleType} onChange={(e)=> setForm({...form, vehicleType: e.target.value as any, ownershipType:'', operationMode:'', tarifaValor:'', documentosAlDia:null, horarioAmpliado:'', actividadMotocarro:''})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-4">
                  <option value="MOTO_FAMILIAR">MOTO FAMILIAR</option>
                  <option value="MOTOTAXI">MOTOTAXI</option>
                  <option value="MOTOCARRO">MOTOCARRO</option>
                </select>
                {form.vehicleType==='MOTOTAXI' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-sm font-medium mb-1">ownershipType *</label><select value={form.ownershipType} onChange={e=>setForm({...form, ownershipType:e.target.value as any})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="PROPIA">PROPIA</option><option value="PAGA_TARIFA">PAGA_TARIFA</option></select></div>
                    <div><label className="block text-sm font-medium mb-1">operationMode *</label><select value={form.operationMode} onChange={e=>setForm({...form, operationMode:e.target.value as any})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="ESTACION">ESTACION</option><option value="CIRCULANTE">CIRCULANTE</option></select></div>
                    {form.operationMode==='ESTACION' && (<div><label className="block text-sm font-medium mb-1">Estación *</label><select value={form.stationId} onChange={e=>setForm({...form, stationId:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione estación</option>{stations.map((s:any)=><option key={s.id} value={s.id}>{s.name||s.nombre||s.id}</option>)}</select></div>)}
                    {form.ownershipType==='PAGA_TARIFA' && (<div><label className="block text-sm font-medium mb-1">tarifaValor *</label><input type="number" step="0.01" value={form.tarifaValor} onChange={e=>setForm({...form, tarifaValor:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg" placeholder="Ej: 15000" /></div>)}
                    <div><label className="block text-sm font-medium mb-1">documentosAlDia *</label><select value={form.documentosAlDia===null?'':String(form.documentosAlDia)} onChange={e=>setForm({...form, documentosAlDia: e.target.value===''?null:e.target.value==='true'})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="true">Sí</option><option value="false">No</option></select></div>
                    <div><label className="block text-sm font-medium mb-1">horario *</label><select value={form.horarioAmpliado} onChange={e=>setForm({...form, horarioAmpliado:e.target.value as any})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="DIURNO">DIURNO</option><option value="NOCTURNO">NOCTURNO</option></select></div>
                  </div>
                )}
                {form.vehicleType==='MOTOCARRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">actividadMotocarro *</label><input type="text" value={form.actividadMotocarro} onChange={e=>setForm({...form, actividadMotocarro:e.target.value})} maxLength={150} className="w-full px-4 py-2.5 border rounded-lg" placeholder="Ej: Carga de mercancía" /></div>
                    <div><label className="block text-sm font-medium mb-1">ownershipType *</label><select value={form.ownershipType} onChange={e=>setForm({...form, ownershipType:e.target.value as any})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="PROPIA">PROPIA</option><option value="PAGA_TARIFA">PAGA_TARIFA</option></select></div>
                    {form.ownershipType==='PAGA_TARIFA' && (<><div><label className="block text-sm font-medium mb-1">tarifaValor *</label><input type="number" step="0.01" value={form.tarifaValor} onChange={e=>setForm({...form, tarifaValor:e.target.value})} className="w-full px-4 py-2.5 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">documentosAlDia *</label><select value={form.documentosAlDia===null?'':String(form.documentosAlDia)} onChange={e=>setForm({...form, documentosAlDia: e.target.value===''?null:e.target.value==='true'})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="true">Sí</option><option value="false">No</option></select></div></>)}
                    {form.ownershipType==='PROPIA' && (<div><label className="block text-sm font-medium mb-1">documentosAlDia</label><select value={form.documentosAlDia===null?'':String(form.documentosAlDia)} onChange={e=>setForm({...form, documentosAlDia: e.target.value===''?null:e.target.value==='true'})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="true">Sí</option><option value="false">No</option></select></div>)}
                  </div>
                )}
                {form.vehicleType==='MOTO_FAMILIAR' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-sm font-medium mb-1">documentosAlDia *</label><select value={form.documentosAlDia===null?'':String(form.documentosAlDia)} onChange={e=>setForm({...form, documentosAlDia: e.target.value===''?null:e.target.value==='true'})} className="w-full px-4 py-2.5 border rounded-lg"><option value="">Seleccione</option><option value="true">Sí</option><option value="false">No</option></select></div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Consentimiento informado — Ley 1581</h4>
                <label className="flex items-start gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={form.consentGiven} onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })} className="mt-1" required />
                  <span className="text-sm text-gray-700">Autorizo el tratamiento de mis datos personales para fines del censo (consentimiento obligatorio) *</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma del conductor (3–200 caracteres) *</label>
                  <input type="text" required value={form.consentSignature} onChange={(e) => setForm({ ...form, consentSignature: e.target.value })} minLength={3} maxLength={200} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none" placeholder="Ej: Juan Pérez 123" />
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
