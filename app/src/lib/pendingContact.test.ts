import { describe, it, expect, beforeEach } from "vitest";
import type { PendingContact } from "./pendingContact";
import { savePendingContact, readPendingContact, clearPendingContact } from "./pendingContact";

// vite.config.ts's test environment is 'node' (no DOM/sessionStorage global) — install a
// minimal in-memory Storage polyfill rather than pulling in jsdom for one small file.
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

function fixture(overrides: Partial<PendingContact> = {}): PendingContact {
  return {
    organizationId: "org-1",
    contactType: "whatsapp",
    resultRank: 1,
    source: "organization_profile",
    matchSessionId: "session-1",
    matchSessionPersisted: true,
    matchResultId: "result-1",
    sport: "running",
    goal: "conocer_gente",
    district: "San Isidro",
    ...overrides,
  };
}

describe("pendingContact — sessionStorage round-trip", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null when nothing has been saved", () => {
    expect(readPendingContact()).toBeNull();
  });

  it("saves and reads back an identical object", () => {
    const pc = fixture();
    savePendingContact(pc);
    expect(readPendingContact()).toEqual(pc);
  });

  it("clears the stored value", () => {
    savePendingContact(fixture());
    clearPendingContact();
    expect(readPendingContact()).toBeNull();
  });

  it("recovers gracefully from a corrupted stored value instead of looping forever", () => {
    sessionStorage.setItem("matchpoint:pendingContact", "{not valid json");
    expect(readPendingContact()).toBeNull();
    // the corrupt value should have been cleared, not left to keep failing on every read
    expect(sessionStorage.getItem("matchpoint:pendingContact")).toBeNull();
  });

  it("preserves null fields (e.g. an unpersisted match session/result) exactly", () => {
    const pc = fixture({ matchSessionId: null, matchSessionPersisted: false, matchResultId: null });
    savePendingContact(pc);
    expect(readPendingContact()).toEqual(pc);
  });
});
