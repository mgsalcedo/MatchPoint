import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { calculateMatches } from "../lib/matching";
import { getOrganizations } from "../lib/data/organizations";
import { createMatchSession } from "../lib/data/matchSessions";
import { track } from "../lib/analytics";
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
  matchSessionPersisted: boolean;
  results: MatchResult[];
  isLoggedIn: boolean;
  userName: string | null;
  leads: Lead[];
  pendingContact: PendingContact | null;
  lastLead: Lead | null;
}

interface SessionApi extends SessionState {
  updateAnswers: (partial: Partial<SportMatchAnswers>) => void;
  finalizeMatch: (answers: SportMatchAnswers) => Promise<MatchResult[]>;
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
    matchSessionPersisted: false,
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

  // Async: fetches the real catalog and persists the outcome, so this can no longer run
  // entirely inside a setState updater (updaters must be synchronous). Takes the final answers
  // as a PARAMETER rather than reading `state.answers` from closure — reading closed-over state
  // here is stale the moment this is called synchronously right after the last updateAnswers()
  // in the same click handler (React hasn't applied that setState yet). This bit us for real:
  // the questionnaire's last answer (environment) was missing, tripping the DB's NOT NULL
  // constraint and silently failing every persist. See SportMatch.tsx's goToNext for the caller
  // that builds the fully-merged answers object before calling this.
  const finalizeMatch = useCallback(async (answers: SportMatchAnswers): Promise<MatchResult[]> => {
    let computed: MatchResult[] = [];
    try {
      // No sportSlug/districtName filter — pre-filtering would silently change matching
      // behavior (adjacent-district scoring, soft sport-fit). research.md R3.
      const orgs = await getOrganizations();
      computed = calculateMatches(answers, orgs);
    } catch (err) {
      console.error("[MatchPoint] Failed to load organization catalog for matching", err);
      computed = []; // degrade to the existing no-results screen, not a crash
    }

    const { matchSessionId, persisted } = await createMatchSession(answers, computed);

    // research.md R6 (owner-confirmed): only counts as "completed" when the session was
    // actually captured — the completion-rate metric doubles as a data-quality signal.
    if (persisted) {
      track({ name: "sport_match_completed", matchSessionId, sport: answers.sport, district: answers.district });
    }

    setState((s) => ({ ...s, matchSessionId, matchSessionPersisted: persisted, results: computed }));
    return computed;
  }, [state.answers]);

  const resetMatch = useCallback(() => {
    setState((s) => ({
      ...s,
      answers: {},
      matchSessionId: null,
      matchSessionPersisted: false,
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
    const org = state.results.find((r) => r.organization.id === state.pendingContact!.organizationId)?.organization;
    if (!org) return null;
    const { contactType, resultRank, source } = state.pendingContact;
    const lead = buildLead(org, contactType, resultRank, source);
    // eslint-disable-next-line no-console
    console.log("[MatchPoint] Lead created (mock, post-login)", lead);
    setState((s) => ({ ...s, leads: [...s.leads, lead], lastLead: lead, pendingContact: null }));
    return lead;
  }, [state.pendingContact, state.results, buildLead]);

  const getOrganization = useCallback(
    (id: string) => state.results.find((r) => r.organization.id === id)?.organization,
    [state.results]
  );

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
