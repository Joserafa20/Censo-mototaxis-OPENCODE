import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AlcaldiaConfig() {
  const [form, setForm] = useState({ nombre: '', nit: '', direccion: '', telefono: '', email: '' });
  const [escudoPath, setEscudoPath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/alcaldia');
        if (cancelled) return;
        const d = res.data;
        setForm({
          nombre: d.nombre ?? '',
          nit: d.nit ?? '',
          direccion: d.direccion ?? '',
          telefono: d.telefono ?? '',
          email: d.email ?? '',
        });
        setEscudoPath(d.escudoPath ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || 'Error cargando configuración');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append('nombre', form.nombre);
      fd.append('nit', form.nit);
      fd.append('direccion', form.direccion);
      fd.append('telefono', form.telefono);
      fd.append('email', form.email);
      if (file) fd.append('escudo', file);
      const res = await api.patch('/alcaldia', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEscudoPath(res.data.escudoPath ?? escudoPath);
      setSuccess('Configuración guardada correctamente');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Configuración Alcaldía</h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input name="nombre" value={form.nombre} onChange={handleChange} required minLength={3} maxLength={100} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">NIT</label>
          <input name="nit" value={form.nit} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dirección</label>
          <input name="direccion" value={form.direccion} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Escudo actual</label>
          {escudoPath ? (
            <img src={escudoPath} alt="Escudo" className="h-32 object-contain border rounded bg-gray-50" />
          ) : (
            <p className="text-sm text-gray-400">Sin escudo</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nuevo escudo (png/jpeg/webp, max 2MB)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="w-full text-sm" />
          {preview && <img src={preview} alt="Preview" className="mt-2 h-32 object-contain border rounded" />}
        </div>

        <button type="submit" disabled={saving} className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
