import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { organizations } from "../data/organizations";
import { calculateMatches } from "../lib/matching";
import type { ContactType, Lead, MatchResult, Organization, SportMatchAnswers } from "../types";

interface PendingContact {
  organizationId: string;
  contactType: ContactType;
  resultRank: number;
  source: string;
}

interface SessionState {
  answers: Partial<SportMatchAnswers>;
  matchSessionId: string | null;
  results: MatchResult[];
  isLoggedIn: boolean;
  userName: string | null;
  leads: Lead[];
  pendingContact: PendingContact | null;
  lastLead: Lead | null;
}

interface SessionApi extends SessionState {
  updateAnswers: (partial: Partial<SportMatchAnswers>) => void;
  finalizeMatch: () => MatchResult[];
  resetMatch: () => void;
  login: (provider: "google" | "apple") => void;
  requestContact: (
    organization: Organization,
    contactType: ContactType,
    resultRank: number,
    source: string
  ) => boolean;
  confirmPendingContact: () => Lead | null;
  getOrganization: (id: string) => Organization | undefined;
}

const SessionContext = createContext<SessionApi | null>(null);

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function MatchSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    answers: {},
    matchSessionId: null,
    results: [],
    isLoggedIn: false,
    userName: null,
    leads: [],
    pendingContact: null,
    lastLead: null,
  });

  const updateAnswers = useCallback((partial: Partial<SportMatchAnswers>) => {
    setState((s) => ({ ...s, answers: { ...s.answers, ...partial } }));
  }, []);

  const finalizeMatch = useCallback((): MatchResult[] => {
    let computed: MatchResult[] = [];
    setState((s) => {
      computed = calculateMatches(s.answers as SportMatchAnswers, organizations);
      return { ...s, matchSessionId: makeId("session"), results: computed };
    });
    return computed;
  }, []);

  const resetMatch = useCallback(() => {
    setState((s) => ({
      ...s,
      answers: {},
      matchSessionId: null,
      results: [],
    }));
  }, []);

  const login = useCallback((provider: "google" | "apple") => {
    setState((s) => ({
      ...s,
      isLoggedIn: true,
      userName: provider === "google" ? "Usuaria de Google" : "Usuaria de Apple",
    }));
  }, []);

  const buildLead = useCallback(
    (organization: Organization, contactType: ContactType, resultRank: number, source: string): Lead => ({
      id: makeId("lead"),
      userId: "local_user",
      organizationId: organization.id,
      matchSessionId: state.matchSessionId ?? "no_session",
      contactType,
      source,
      timestamp: new Date().toISOString(),
      sport: (state.answers.sport ?? organization.sports[0])!,
      goal: state.answers.goal ?? "otro",
      district: state.answers.district ?? organization.districts[0],
      resultRank,
    }),
    [state.matchSessionId, state.answers]
  );

  const requestContact = useCallback(
    (organization: Organization, contactType: ContactType, resultRank: number, source: string): boolean => {
      if (!state.isLoggedIn) {
        setState((s) => ({
          ...s,
          pendingContact: { organizationId: organization.id, contactType, resultRank, source },
        }));
        return false;
      }
      const lead = buildLead(organization, contactType, resultRank, source);
      // eslint-disable-next-line no-console
      console.log("[MatchPoint] Lead created (mock)", lead);
      setState((s) => ({ ...s, leads: [...s.leads, lead], lastLead: lead }));
      return true;
    },
    [state.isLoggedIn, buildLead]
  );

  const confirmPendingContact = useCallback((): Lead | null => {
    if (!state.pendingContact) return null;
    const org = organizations.find((o) => o.id === state.pendingContact!.organizationId);
    if (!org) return null;
    const { contactType, resultRank, source } = state.pendingContact;
    const lead = buildLead(org, contactType, resultRank, source);
    // eslint-disable-next-line no-console
    console.log("[MatchPoint] Lead created (mock, post-login)", lead);
    setState((s) => ({ ...s, leads: [...s.leads, lead], lastLead: lead, pendingContact: null }));
    return lead;
  }, [state.pendingContact, buildLead]);

  const getOrganization = useCallback((id: string) => organizations.find((o) => o.id === id), []);

  const value = useMemo<SessionApi>(
    () => ({
      ...state,
      updateAnswers,
      finalizeMatch,
      resetMatch,
      login,
      requestContact,
      confirmPendingContact,
      getOrganization,
    }),
    [state, updateAnswers, finalizeMatch, resetMatch, login, requestContact, confirmPendingContact, getOrganization]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useMatchSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useMatchSession must be used within MatchSessionProvider");
  return ctx;
}
