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

/**
 * Gradient used for the imagery fallback (007-visual-identity-system, research.md R4) — the
 * organization's initials sit on this when it has no logo/cover. Built from the sport's own
 * accent so the fallback reads as a deliberate, on-brand state rather than a missing image.
 * Blends toward the brand violet so every fallback still belongs to the same family.
 */
export function accentGradient(sport: Sport | undefined): string {
  const base = sport ? accentColor(sport) : "#6A3DE5";
  return `linear-gradient(135deg, ${base} 0%, ${base} 45%, #6A3DE5 100%)`;
}
