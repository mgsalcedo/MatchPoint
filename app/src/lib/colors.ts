import type { Sport } from "../types";

/**
 * Per-sport accent colors, per docs/design-system.md's "Per-sport tag colors" —
 * same hue family as the brand gradient extracted from logo.png.
 */
export const SPORT_ACCENT_COLORS: Record<Sport, string> = {
  running: "#D85A30",
  trail: "#639922",
  ciclismo: "#1D9E75",
  natacion: "#378ADD",
  triatlon: "#7F77DD",
  centro_entrenamiento: "#BA7517",
};

export function accentColor(sport: Sport): string {
  return SPORT_ACCENT_COLORS[sport] ?? "#6A3DE5";
}
