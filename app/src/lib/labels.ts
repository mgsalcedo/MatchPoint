import type { MatchLabel } from "../types";

export function badgeClass(label: MatchLabel): string {
  switch (label) {
    case "Excellent Match":
      return "badge badge-excellent";
    case "Very Good Match":
      return "badge badge-very-good";
    case "Good Match":
      return "badge badge-good";
    case "Possible Match":
      return "badge badge-possible";
    default:
      return "badge badge-weak";
  }
}

export const SPORT_LABELS: Record<string, string> = {
  running: "Running",
  trail: "Trail",
  ciclismo: "Ciclismo",
  natacion: "Natación",
  triatlon: "Triatlón",
  centro_entrenamiento: "Centro de entrenamiento",
};

export const GOAL_LABELS: Record<string, string> = {
  empezar: "Empezar un deporte",
  preparar_carrera: "Preparar una carrera",
  mejorar_rendimiento: "Mejorar rendimiento",
  mantenerme_activo: "Mantenerme activo",
  bajar_peso: "Bajar de peso",
  conocer_gente: "Conocer gente",
  otro: "Otro",
};

export const LEVEL_LABELS: Record<string, string> = {
  nunca_practique: "Nunca practiqué",
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const BUDGET_LABELS: Record<string, string> = {
  gratis: "Gratis",
  hasta_100: "Hasta S/100",
  "100_200": "S/100 - S/200",
  "200_300": "S/200 - S/300",
  mas_300: "Más de S/300",
  no_seguro: "No estoy seguro",
  no_confirmado: "Precio no confirmado",
};

// docs/component-library.md's CommunityADN spec: readable labels, in this display order.
export const ADN_LABELS: { key: keyof import("../types").AdnDeportivo; label: string }[] = [
  { key: "beginnerFriendliness", label: "Ideal para principiantes" },
  { key: "socialAtmosphere", label: "Ambiente social" },
  { key: "competitiveness", label: "Competitividad" },
  { key: "trainingIntensity", label: "Intensidad" },
  { key: "performanceFocus", label: "Alto rendimiento" },
  { key: "inclusiveness", label: "Inclusividad" },
];

export const ENVIRONMENT_LABELS: Record<string, string> = {
  competitivo: "Competitivo",
  social: "Social",
  recreativo: "Recreativo",
  familiar: "Familiar",
  alto_rendimiento: "Alto rendimiento",
  inclusivo: "Inclusivo",
};

export const TIME_LABELS: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};

export const DAY_LABELS: Record<string, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};
