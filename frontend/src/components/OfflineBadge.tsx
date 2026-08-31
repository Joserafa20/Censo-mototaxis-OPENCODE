import { useEffect, useState } from 'react';

export default function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const checkQueue = async () => {
      try {
        const { getDb } = await import('../pwa/db');
        const db = await getDb();
        const all = await db.getAll('census_queue');
        setQueueSize(all.length);
      } catch { /* ignore */ }
    };
    const id = setInterval(checkQueue, 2000);
    checkQueue();
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); clearInterval(id); };
  }, []);

  if (online && queueSize===0) return null;
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${online ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
      {online ? `Sincronizando... (${queueSize} pendientes)` : 'Sin conexión — modo offline'}
    </div>
  );
}
