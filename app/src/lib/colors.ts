export const ACCENT_COLORS: Record<string, string> = {
  coral: "#D85A30",
  green: "#639922",
  teal: "#1D9E75",
  blue: "#378ADD",
  purple: "#7F77DD",
  amber: "#BA7517",
  pink: "#D4537E",
};

export function accentColor(key: string): string {
  return ACCENT_COLORS[key] ?? "#4A3FB5";
}
