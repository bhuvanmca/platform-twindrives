import { beforeEach } from "vitest";

// `demo.ts` and `session.ts` both guard on `typeof window === "undefined"` and
// then reach for the global `localStorage`. The default node environment has
// neither, so the guards would short-circuit and the persistence paths would
// never be exercised. This installs the smallest stand-in that satisfies both.

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

export const memoryStorage = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "window", {
  value: globalThis,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  memoryStorage.clear();
});
