// Tiny typed localStorage wrapper. Namespaced so the prototype never collides
// with anything else on the origin. All persistence in the app goes through here.

const NS = 'iica_admin';

export const storageKey = (key: string) => `${NS}:${key}`;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore in prototype */
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    /* ignore */
  }
}
