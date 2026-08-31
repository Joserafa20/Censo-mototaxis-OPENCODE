import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export default function Stickers() {
  const [records, setRecords] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const token = localStorage.getItem('accessToken');
    const res = await axios.get(`${API}/census-records`, { params: { status: 'APROBADO', pageSize: 100 }, headers: { Authorization: `Bearer ${token}` } });
    const data = res.data.records ?? res.data.data ?? res.data ?? [];
    setRecords(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  async function printOne(id: string) {
    const token = localStorage.getItem('accessToken');
    const res = await axios.get(`${API}/census-records/${id}/sticker`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank');
  }
  async function printBatch() {
    if (!selected.length) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.post(`${API}/stickers/batch`, { ids: selected }, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } finally { setLoading(false); }
  }
  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Adhesivos - Registros APROBADOS</h1>
      <div className="mb-4 flex gap-2">
        <button onClick={printBatch} disabled={!selected.length || loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Imprimir lote ({selected.length}) 6-up A4</button>
        <button onClick={() => setSelected(records.map((r: any) => r.id).slice(0, 100))} className="px-3 py-2 border rounded">Seleccionar 100</button>
      </div>
      <table className="w-full text-sm border">
        <thead><tr className="bg-gray-100"><th></th><th>Placa</th><th>Nombre</th><th>Folio</th><th>Acción</th></tr></thead>
        <tbody>
          {records.map((r: any) => (
            <tr key={r.id} className="border-t">
              <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>
              <td>{r.motorcyclePlate}</td>
              <td>{r.mototaxiFirstName} {r.mototaxiLastName}</td>
              <td className="font-mono text-xs">{r.stickerFolio ?? '-'}</td>
              <td><button onClick={() => printOne(r.id)} className="text-blue-600 underline">Preview / Imprimir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
