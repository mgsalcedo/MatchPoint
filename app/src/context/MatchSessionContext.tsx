import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { calculateMatches } from "../lib/matching";
import { getOrganizations, getOrganizationContactSnapshot } from "../lib/data/organizations";
import { createMatchSession } from "../lib/data/matchSessions";
import { createLead } from "../lib/data/leads";
import { ensureUserRow } from "../lib/data/users";
import { getSportId } from "../lib/data/sports";
import { getDistrictId } from "../lib/data/districts";
import { mapSportToSlug } from "../lib/data/mappers";
import { buildExternalUrl, resolveContactValue, type ExternalLink } from "../lib/data/leadMappers";
import { savePendingContact, readPendingContact, clearPendingContact, type PendingContact } from "../lib/pendingContact";
import { supabase } from "../lib/data/supabaseClient";
import { track } from "../lib/analytics";
import type { ContactType, Lead, LeadSource, MatchResult, Organization, SportMatchAnswers } from "../types";

export type ContactOutcome =
  | { status: "success"; leadId: string; externalUrl: ExternalLink | null; organizationName: string }
  | { status: "org_unavailable" }
  | { status: "lead_failed" }
  | { status: "no_pending" };

export type RequestContactOutcome = ContactOutcome | { status: "login_required" };

interface SessionState {
  answers: Partial<SportMatchAnswers>;
  matchSessionId: string | null;
  matchSessionPersisted: boolean;
  results: MatchResult[];
  isLoggedIn: boolean;
  userId: string | null;
  userName: string | null;
  lastLead: Lead | null;
  lastContactedOrganization: { id: string; name: string } | null;
  lastExternalLink: ExternalLink | null;
}

interface SessionApi extends SessionState {
  updateAnswers: (partial: Partial<SportMatchAnswers>) => void;
  finalizeMatch: (answers: SportMatchAnswers) => Promise<MatchResult[]>;
  resetMatch: () => void;
  login: (provider: "google" | "apple") => void;
  requestContact: (
    organization: Organization,
    contactType: ContactType,
    resultRank: number | null,
    source: LeadSource,
    matchResultId: string | null
  ) => Promise<RequestContactOutcome>;
  completePendingContact: () => Promise<RequestContactOutcome>;
  getOrganization: (id: string) => Organization | undefined;
}

const SessionContext = createContext<SessionApi | null>(null);

function deriveUserName(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Usuario"
  );
}

export function MatchSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    answers: {},
    matchSessionId: null,
    matchSessionPersisted: false,
    results: [],
    isLoggedIn: false,
    userId: null,
    userName: null,
    lastLead: null,
    lastContactedOrganization: null,
    lastExternalLink: null,
  });

  // Restores a real Supabase Auth session on boot (User Story 3), and fires again right after
  // the OAuth redirect lands (User Story 2) and on token refresh — one listener, three moments
  // (research.md R5, §8). Supabase's default client config (persistSession: true,
  // detectSessionInUrl: true — see supabaseClient.ts) does the heavy lifting; this just mirrors
  // that state into the app.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void ensureUserRow(session.user).catch((err) =>
          console.error("[MatchPoint] Failed to provision user row", err instanceof Error ? err.message : err)
        );
        setState((s) => ({ ...s, isLoggedIn: true, userId: session.user.id, userName: deriveUserName(session.user) }));
      } else {
        setState((s) => ({ ...s, isLoggedIn: false, userId: null, userName: null }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const updateAnswers = useCallback((partial: Partial<SportMatchAnswers>) => {
    setState((s) => ({ ...s, answers: { ...s.answers, ...partial } }));
  }, []);

  // Async: fetches the real catalog and persists the outcome, so this can no longer run
  // entirely inside a setState updater (updaters must be synchronous). Takes the final answers
  // as a PARAMETER rather than reading `state.answers` from closure — reading closed-over state
  // here is stale the moment this is called synchronously right after the last updateAnswers()
  // in the same click handler (React hasn't applied that setState yet). See SportMatch.tsx's
  // goToNext for the caller that builds the fully-merged answers object before calling this.
  const finalizeMatch = useCallback(
    async (answers: SportMatchAnswers): Promise<MatchResult[]> => {
      let computed: MatchResult[] = [];
      try {
        // No sportSlug/districtName filter — pre-filtering would silently change matching
        // behavior (adjacent-district scoring, soft sport-fit). research.md R3 (002).
        const orgs = await getOrganizations();
        computed = calculateMatches(answers, orgs);
      } catch (err) {
        console.error("[MatchPoint] Failed to load organization catalog for matching", err);
        computed = []; // degrade to the existing no-results screen, not a crash
      }

      // Attribute the session to the current user if already logged in when it's created
      // (migration 0011). This does NOT retroactively link a session created while anonymous —
      // that stays out of scope (research.md R4, 004-auth-lead-creation).
      const { matchSessionId, matchResultIds, persisted } = await createMatchSession(answers, computed, state.userId);

      if (persisted) {
        computed = computed.map((r) => ({ ...r, id: matchResultIds[r.organization.id] }));
        track({ name: "sport_match_completed", matchSessionId, sport: answers.sport, district: answers.district });
      }

      setState((s) => ({ ...s, matchSessionId, matchSessionPersisted: persisted, results: computed }));
      return computed;
    },
    [state.userId]
  );

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
    track({ name: "login_started", provider });
    // Full-page navigation away from the SPA — nothing after this call runs. On return,
    // detectSessionInUrl (supabaseClient.ts default) + the onAuthStateChange listener above
    // pick up the new session automatically (research.md R10).
    void supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  // Centralized re-verify → create-Lead → resolve-external-URL sequence, shared by the
  // already-logged-in path (requestContact) and the post-OAuth-redirect path
  // (completePendingContact) — one function, two callers (contracts/lead-creation.md).
  const performContact = useCallback(
    async (pending: PendingContact, currentUserId: string): Promise<ContactOutcome> => {
      const org = await getOrganizationContactSnapshot(pending.organizationId);
      if (!org) return { status: "org_unavailable" };

      const resolution = resolveContactValue(org, pending.contactType);
      if (!resolution.available) return { status: "org_unavailable" }; // BR-009: channel disappeared

      const [sportId, districtId] = await Promise.all([
        pending.sport ? getSportId(mapSportToSlug(pending.sport) ?? "").catch(() => null) : Promise.resolve(null),
        pending.district ? getDistrictId(pending.district).catch(() => null) : Promise.resolve(null),
      ]);

      try {
        const leadId = await createLead({
          id: crypto.randomUUID(),
          userId: currentUserId,
          organizationId: pending.organizationId,
          matchSessionId: pending.matchSessionPersisted ? pending.matchSessionId : null,
          matchResultId: pending.matchResultId,
          contactType: pending.contactType,
          source: pending.source,
          sportId,
          districtId,
          goal: pending.goal,
          resultRank: pending.resultRank,
        });
        const externalUrl = buildExternalUrl(pending.contactType, org);
        track({ name: "lead_created", leadId, organizationId: pending.organizationId, contactType: pending.contactType });
        return { status: "success", leadId, externalUrl, organizationName: org.name };
      } catch (err) {
        console.error("[MatchPoint] Failed to create lead", err instanceof Error ? err.message : err);
        return { status: "lead_failed" };
      }
    },
    []
  );

  const applyContactOutcome = useCallback((pending: PendingContact, outcome: ContactOutcome) => {
    if (outcome.status === "success" || outcome.status === "org_unavailable") clearPendingContact();
    if (outcome.status === "success") {
      setState((s) => ({
        ...s,
        lastLead: {
          id: outcome.leadId,
          organizationId: pending.organizationId,
          contactType: pending.contactType,
          createdAt: new Date().toISOString(),
        },
        lastContactedOrganization: {
          id: pending.organizationId,
          name: outcome.organizationName,
        },
        lastExternalLink: outcome.externalUrl,
      }));
    }
  }, []);

  const requestContact = useCallback(
    async (
      organization: Organization,
      contactType: ContactType,
      resultRank: number | null,
      source: LeadSource,
      matchResultId: string | null
    ): Promise<RequestContactOutcome> => {
      const pending: PendingContact = {
        organizationId: organization.id,
        contactType,
        resultRank,
        source,
        matchSessionId: state.matchSessionId,
        matchSessionPersisted: state.matchSessionPersisted,
        matchResultId,
        sport: state.answers.sport ?? null,
        goal: state.answers.goal ?? null,
        district: state.answers.district ?? null,
      };

      if (!state.isLoggedIn || !state.userId) {
        savePendingContact(pending);
        return { status: "login_required" };
      }

      const outcome = await performContact(pending, state.userId);
      applyContactOutcome(pending, outcome);
      return outcome;
    },
    [state.isLoggedIn, state.userId, state.matchSessionId, state.matchSessionPersisted, state.answers, performContact, applyContactOutcome]
  );

  // Called from /auth/callback after a real OAuth redirect lands (research.md R10).
  const completePendingContact = useCallback(async (): Promise<RequestContactOutcome> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { status: "no_pending" }; // shouldn't normally happen on this route

    await ensureUserRow(session.user).catch((err) =>
      console.error("[MatchPoint] Failed to provision user row", err instanceof Error ? err.message : err)
    );
    track({ name: "login_completed", provider: "google" });
    setState((s) => ({ ...s, isLoggedIn: true, userId: session.user.id, userName: deriveUserName(session.user) }));

    const pending = readPendingContact();
    if (!pending) return { status: "no_pending" }; // e.g. landed here directly, or intent expired

    const outcome = await performContact(pending, session.user.id);
    applyContactOutcome(pending, outcome);
    return outcome;
  }, [performContact, applyContactOutcome]);

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
      completePendingContact,
      getOrganization,
    }),
    [state, updateAnswers, finalizeMatch, resetMatch, login, requestContact, completePendingContact, getOrganization]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useMatchSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useMatchSession must be used within MatchSessionProvider");
  return ctx;
}
