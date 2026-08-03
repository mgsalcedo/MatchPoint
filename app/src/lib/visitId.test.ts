import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateVisitId } from "./visitId";

// vite.config.ts's test environment is 'node' (no DOM/sessionStorage global) — install a
// minimal in-memory Storage polyfill rather than pulling in jsdom for one small file (same
// approach as pendingContact.test.ts).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = new MemoryStorage();

describe("visitId — sessionStorage-backed per-visit identifier", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates a new id when nothing is stored yet", () => {
    const id = getOrCreateVisitId();
    expect(id).toBeTruthy();
    expect(sessionStorage.getItem("matchpoint:visitId")).toBe(id);
  });

  it("returns the same id on repeat calls within the same visit", () => {
    const first = getOrCreateVisitId();
    const second = getOrCreateVisitId();
    expect(second).toBe(first);
  });

  it("returns a different id for a fresh visit (sessionStorage cleared)", () => {
    const first = getOrCreateVisitId();
    sessionStorage.clear();
    const second = getOrCreateVisitId();
    expect(second).not.toBe(first);
  });
});
