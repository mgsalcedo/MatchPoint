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
  organization: Organization;
  score: number;
  label: MatchLabel;
  reasons: string[];
}

export type ContactType =
  | "whatsapp"
  | "instagram"
  | "booking_link"
  | "call"
  | "contact_form"
  | "trial_class_request";

export interface Lead {
  id: string;
  userId: string;
  organizationId: string;
  matchSessionId: string;
  contactType: ContactType;
  source: string;
  timestamp: string;
  sport: Sport;
  goal: Goal;
  district: string;
  resultRank: number;
}
