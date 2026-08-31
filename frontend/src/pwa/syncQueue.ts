import { getDb } from './db';

export interface QueuedRequest {
  clientId: string;
  url: string;
  method: string;
  body: unknown;
  headers?: Record<string,string>;
}

export async function enqueue(req: QueuedRequest) {
  const db = await getDb();
  await db.put('census_queue', { clientId: req.clientId, payload: req, createdAt: new Date().toISOString(), attempts: 0 });
}

export async function drainQueue(token: string | null) {
  const db = await getDb();
  const all = await db.getAll('census_queue');
  for (const item of all) {
    const payload = item.payload as QueuedRequest;
    try {
      const res = await fetch(payload.url, {
        method: payload.method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Client-Id': payload.clientId, ...(payload.headers||{}) },
        body: JSON.stringify(payload.body),
      });
      if (res.status === 409) {
        // conflict -> last-write-wins: fetch latest and update local timestamp
        await res.json().catch(()=>null);
        // if server returns updatedAt, we keep that as winner; just dequeue
      }
      if (res.ok || res.status === 409 || res.status === 201) {
        await db.delete('census_queue', item.clientId);
      } else {
        // exponential backoff
        const attempts = (item.attempts ?? 0) + 1;
        if (attempts > 5) { await db.delete('census_queue', item.clientId); continue; }
        await db.put('census_queue', { ...item, attempts });
        await new Promise(r=>setTimeout(r, Math.pow(2, attempts)*1000));
      }
    } catch {
      // network error -> keep queued
    }
  }
}

export function setupSyncListener(getToken: ()=>string|null) {
  window.addEventListener('online', () => drainQueue(getToken()));
  // also try periodic
  setInterval(()=> { if (navigator.onLine) drainQueue(getToken()); }, 30000);
}
