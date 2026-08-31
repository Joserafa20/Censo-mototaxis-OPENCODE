import { openDB, type DBSchema } from 'idb';

interface CensusDB extends DBSchema {
  catalogs: { key: string; value: { key: string; data: unknown; updatedAt: string } };
  census_queue: { key: string; value: { clientId: string; payload: unknown; createdAt: string; attempts: number } };
  audit_cache: { key: string; value: unknown };
}

const DB_NAME = 'censo-mototaxis';
const DB_VERSION = 1;

export function getDb() {
  return openDB<CensusDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('catalogs')) db.createObjectStore('catalogs', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('census_queue')) db.createObjectStore('census_queue', { keyPath: 'clientId' });
      if (!db.objectStoreNames.contains('audit_cache')) db.createObjectStore('audit_cache');
    },
  });
}

export async function putCatalog(key: string, data: unknown) {
  const db = await getDb();
  await db.put('catalogs', { key, data, updatedAt: new Date().toISOString() });
}
export async function getCatalog(key: string) {
  const db = await getDb();
  return db.get('catalogs', key);
}
