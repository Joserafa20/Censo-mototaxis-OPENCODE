import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
export default function Verify() {
  const { folio } = useParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    axios.get(`${API.replace(/\/api\/v1.*/, '')}/verify/${folio}`).then(r => setData(r.data)).catch(() => {
      axios.get(`${API}/verify/${folio}`).then(r => setData(r.data)).catch(e => setErr(e.response?.data?.message ?? 'No encontrado'));
    });
  }, [folio]);
  if (err) return <div className="p-8 text-red-600">{err}</div>;
  if (!data) return <div className="p-8">Verificando...</div>;
  return (
    <div className="p-8 max-w-md mx-auto border rounded mt-8">
      <h1 className="text-lg font-bold">Verificación Adhesivo</h1>
      <p><b>Folio:</b> {data.folio}</p>
      <p><b>Placa:</b> {data.plate}</p>
      <p><b>Estado:</b> {data.status}</p>
      <p><b>Válido:</b> {data.isValid ? 'Sí' : 'No'}</p>
      <p className="text-xs text-gray-500 mt-4">Sin datos personales por Ley 1581</p>
    </div>
  );
}
