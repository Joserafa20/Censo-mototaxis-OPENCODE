import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface Period {
  id: string;
  name?: string;
  nombre?: string;
  title?: string;
}

interface Corregimiento {
  id: string;
  name: string;
  nombre?: string;
}

interface Summary {
  totalGlobal?: number;
  total?: number;
  count?: number;
  totalByPeriod?: { periodId: string; periodName: string; total: number }[];
  byLocationType?: { urban: number; rural: number };
  byCorregimiento?: { corregimientoId: string; name: string; locationType: string; total: number }[];
  byOperationType?: { station: number; independent: number };
  byStation?: { stationId: string; name: string; total: number }[];
  byMotoType?: { brand: string; total: number }[];
  byMotoBrand?: { brand: string; total: number }[];
  byGenero?: { genero: string; total: number }[];
  byRangoEdad?: { rango: string; total: number }[];
  evolucionPorPeriodo?: { periodId: string; periodName: string; total: number }[];
  filtersApplied?: Record<string, unknown>;
  generatedAt?: string;
  [key: string]: unknown;
}

const FALLBACK_CORREGIMIENTOS = [
  'Cascajal',
  'Colombia',
  'Isabel López',
  'Molineros',
  'Aguada de Pablo',
  'Gallego',
  'La Peña',
];

function displayValue(v: unknown): string {
  if (v === undefined || v === null || v === '') return '--';
  return String(v);
}

function BarChart({ data, colorClass = 'bg-gray-900' }: { data: { label: string; value: number }[]; colorClass?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <p className="text-sm text-gray-400">Sin datos</p>;
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-36 truncate text-right shrink-0" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass} transition-all`}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 w-10 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [corregimientos, setCorregimientos] = useState<Corregimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [periodId, setPeriodId] = useState('');
  const [locationType, setLocationType] = useState('');
  const [corregimientoId, setCorregimientoId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    if (locationType) params.locationType = locationType;
    if (corregimientoId && locationType === 'rural') params.corregimientoId = corregimientoId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [periodId, locationType, corregimientoId, dateFrom, dateTo]);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const params = buildParams();
      const res = await api.get('/reports/summary', { params });
      setSummary(res.data as Summary);
      const cacheHeader = res.headers['x-cache'] as string | undefined;
      if (cacheHeader) setCacheStatus(cacheHeader);
      else setCacheStatus(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al cargar resumen';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [buildParams]);

  const fetchPeriods = async () => {
    try {
      const res = await api.get('/census-periods');
      const data = res.data.periods || res.data.data || res.data || [];
      setPeriods(Array.isArray(data) ? data : []);
    } catch {
      // silent - period filter optional
    }
  };

  const fetchCorregimientos = async () => {
    try {
      const res = await api.get('/geography/corregimientos');
      const data = res.data.corregimientos || res.data.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) setCorregimientos(data);
    } catch {
      // fallback to /corregimientos
      try {
        const res2 = await api.get('/corregimientos');
        const data2 = res2.data.corregimientos || res2.data.data || res2.data || [];
        if (Array.isArray(data2) && data2.length > 0) setCorregimientos(data2);
      } catch {
        // keep empty, fallback names used
      }
    }
  };

  useEffect(() => {
    fetchPeriods();
    fetchCorregimientos();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      const params = { ...buildParams(), format: 'csv' };
      const res = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] as string | undefined;
      let filename = 'reporte-censo.csv';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // blob error may contain JSON
      let msg = err.response?.data?.message || err.message || 'Error al exportar';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await (err.response.data as Blob).text();
          const parsed = JSON.parse(text);
          msg = parsed.message || parsed.error || msg;
          // límite 10k
          if (parsed.error === 'ExportLimitExceeded' || msg.toLowerCase().includes('limit')) {
            msg = 'No se puede exportar: el resultado excede el límite de 10.000 registros. Aplique filtros más específicos.';
          }
        } catch {
          // keep msg
        }
      } else if (err.response?.data?.error === 'ExportLimitExceeded') {
        msg = 'No se puede exportar: el resultado excede el límite de 10.000 registros. Aplique filtros más específicos.';
      }
      setError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setPeriodId('');
    setLocationType('');
    setCorregimientoId('');
    setDateFrom('');
    setDateTo('');
  };

  // Helpers to extract values with fallback to --
  const totalGlobal = summary?.totalGlobal ?? summary?.total ?? summary?.count;
  const byLocationType = summary?.byLocationType as { urban: number; rural: number } | undefined;
  const byOperationType = summary?.byOperationType as { station: number; independent: number } | undefined;
  const byCorregimiento = (summary?.byCorregimiento as Summary['byCorregimiento']) || [];
  const byStation = (summary?.byStation as Summary['byStation']) || [];
  const byMotoType = (summary?.byMotoType || summary?.byMotoBrand || []) as { brand: string; total: number }[];
  const byGenero = (summary?.byGenero as Summary['byGenero']) || [];
  const byRangoEdad = (summary?.byRangoEdad as Summary['byRangoEdad']) || [];

  // Build corregimiento counts with fallback: show 7 corregimientos even if summary empty
  const corregimientoChartData: { label: string; value: number }[] = (() => {
    if (byCorregimiento.length > 0) {
      return byCorregimiento.map((c) => ({ label: c.name, value: c.total }));
    }
    // fallback: show 7 with 0
    const names = corregimientos.length > 0 ? corregimientos.map((c) => c.name) : FALLBACK_CORREGIMIENTOS;
    return names.slice(0, 7).map((name) => ({ label: name, value: 0 }));
  })();

  const stationChartData: { label: string; value: number }[] = byStation.map((s) => ({
    label: s.name,
    value: s.total,
  }));

  const periodoLabel = (p: Period) => p.name || p.nombre || p.title || p.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 mt-1">Resumen estadístico del censo de mototaxis</p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2M7 11l5-5 5 5" />
          </svg>
          {isExporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Periodo</label>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
            >
              <option value="">Todos</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {periodoLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo ubicación</label>
            <select
              value={locationType}
              onChange={(e) => {
                setLocationType(e.target.value);
                if (e.target.value !== 'rural') setCorregimientoId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
            >
              <option value="">Todos</option>
              <option value="urban">Urbano</option>
              <option value="rural">Rural</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Corregimiento</label>
            <select
              value={corregimientoId}
              onChange={(e) => setCorregimientoId(e.target.value)}
              disabled={locationType !== 'rural'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Todos</option>
              {(corregimientos.length > 0
                ? corregimientos
                : FALLBACK_CORREGIMIENTOS.map((name, idx) => ({ id: String(idx), name }))
              ).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={fetchSummary}
              className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Aplicar
            </button>
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
        {cacheStatus && (
          <p className="text-xs text-gray-400 mt-2">
            X-Cache: <span className="font-medium">{cacheStatus}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold ml-4">
            &times;
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <p>Cargando reportes...</p>
        </div>
      ) : (
        <>
          {/* Cards principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Total censados</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{displayValue(totalGlobal)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Urbanos vs Rurales</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">Urbano: </span>
                  {displayValue(byLocationType?.urban)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">Rural: </span>
                  {displayValue(byLocationType?.rural)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Por estación vs independientes</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">Estación: </span>
                  {displayValue(byOperationType?.station)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-gray-900">Independientes: </span>
                  {displayValue(byOperationType?.independent)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Generado</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {summary?.generatedAt ? new Date(summary.generatedAt as string).toLocaleString('es-CO') : '--'}
              </p>
              {summary?.filtersApplied && (
                <p className="text-xs text-gray-400 mt-1 truncate" title={JSON.stringify(summary.filtersApplied)}>
                  Filtros: {JSON.stringify(summary.filtersApplied)}
                </p>
              )}
            </div>
          </div>

          {/* Por corregimiento lista */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Por corregimiento</h3>
            {byCorregimiento.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {byCorregimiento.map((c) => (
                  <div key={c.corregimientoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    <span className="text-sm font-bold text-gray-900">{c.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(corregimientos.length > 0
                  ? corregimientos.slice(0, 7).map((c) => ({ name: c.name, total: '--' }))
                  : FALLBACK_CORREGIMIENTOS.map((name) => ({ name, total: '--' }))
                ).map((c: any) => (
                  <div key={c.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    <span className="text-sm font-bold text-gray-400">{c.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráficas barras CSS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por corregimiento</h3>
              <BarChart data={corregimientoChartData} colorClass="bg-gray-900" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por estación</h3>
              {stationChartData.length > 0 ? (
                <BarChart data={stationChartData} colorClass="bg-gray-700" />
              ) : (
                <p className="text-sm text-gray-400">Sin datos</p>
              )}
            </div>
          </div>

          {/* Por tipo moto, género, edad */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por tipo de moto</h3>
              {byMotoType.length > 0 ? (
                <div className="space-y-2">
                  {byMotoType.map((m) => (
                    <div key={m.brand} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{m.brand || '--'}</span>
                      <span className="font-medium text-gray-900">{m.total}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por género</h3>
              {byGenero.length > 0 ? (
                <div className="space-y-2">
                  {byGenero.map((g) => (
                    <div key={g.genero} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{g.genero || '--'}</span>
                      <span className="font-medium text-gray-900">{g.total}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por rango de edad</h3>
              {byRangoEdad.length > 0 ? (
                <div className="space-y-2">
                  {byRangoEdad.map((r) => (
                    <div key={r.rango} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{r.rango || '--'}</span>
                      <span className="font-medium text-gray-900">{r.total}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">--</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
