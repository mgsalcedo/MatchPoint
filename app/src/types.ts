export type OrgType =
  | "team"
  | "club"
  | "gym"
  | "training_center"
  | "coach"
  | "federation"
  | "event_organizer"
  | "academy"
  | "community"
  | "other";

export type Sport =
  | "running"
  | "trail"
  | "ciclismo"
  | "natacion"
  | "triatlon"
  | "centro_entrenamiento";

export type Level = "nunca_practique" | "principiante" | "intermedio" | "avanzado";

export type Environment =
  | "competitivo"
  | "social"
  | "recreativo"
  | "familiar"
  | "alto_rendimiento"
  | "inclusivo";

export type Budget = "gratis" | "hasta_100" | "100_200" | "200_300" | "mas_300" | "no_seguro";

export type TimeOfDay = "manana" | "tarde" | "noche";

export type Goal =
  | "empezar"
  | "preparar_carrera"
  | "mejorar_rendimiento"
  | "mantenerme_activo"
  | "bajar_peso"
  | "conocer_gente"
  | "otro";

export type Weekday = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export interface Schedule {
  day: Weekday;
  startTime: string;
  endTime?: string;
  sessionType: string;
  level?: Level;
}

export interface AdnDeportivo {
  beginnerFriendliness: number;
  competitiveness: number;
  socialAtmosphere: number;
  trainingIntensity: number;
  performanceFocus: number;
  inclusiveness: number;
  environments: Environment[];
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  sports: Sport[];
  description: string;
  districts: string[];
  schedules: Schedule[];
  priceRange: Budget | "no_confirmado";
  trialClassAvailable: boolean;
  whatsapp?: string;
  instagram?: string;
  bookingLink?: string;
  website?: string;
  adnDeportivo: AdnDeportivo;
  services: string[];
  coach?: string;
  profileStatus: "preloaded" | "claimed" | "verified" | "incomplete" | "suspended";
  // Optional by design, not omission: most seeded organizations have no imagery yet, and the
  // initials-over-sport-gradient fallback is a first-class rendering path, not an error state
  // (007-visual-identity-system, data-model.md).
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface SportMatchAnswers {
  goal: Goal;
  sport: Sport;
  district: string;
  days: Weekday[];
  time: TimeOfDay;
  level: Level;
  budget: Budget;
  environment: Environment;
}

export type MatchLabel =
  | "Excellent Match"
  | "Very Good Match"
  | "Good Match"
  | "Possible Match"
  | "Weak Match";

export interface MatchResult {
  id?: string; // set only once the underlying match_results row is actually persisted
  organization: Organization;
  score: number;
  label: MatchLabel;
  reasons: string[];
}

// Matches the DB's contact_type enum exactly (docs/database-schema.md) — no translation
// table needed (research.md R6, 004-auth-lead-creation). "call"/"form" are real BR-003
// contact actions with DB backing, kept even though no UI wires them up yet.
export type ContactType = "whatsapp" | "instagram" | "booking" | "call" | "form";

// Matches the DB's lead_source enum exactly (research.md R7).
export type LeadSource = "result_card" | "organization_profile" | "event_profile" | "direct_search" | "admin_test";

// UI-facing shape — only what ContactSuccess.tsx actually displays. The DB-shaped insert row
// (LeadInsertRow, app/src/lib/data/leadMappers.ts) is a separate type, mirroring the existing
// MatchSession/MatchSessionInsertRow split (research.md, backend.md §7.4).
export interface Lead {
  id: string;
  organizationId: string;
  contactType: ContactType;
  createdAt: string;
}
