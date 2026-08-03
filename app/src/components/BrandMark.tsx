interface BrandMarkProps {
  /** "stack" centers mark above wordmark (hero); "inline" sits them side by side. */
  layout?: "inline" | "stack";
  size?: "md" | "lg";
}

/**
 * MatchPoint's mark and wordmark (007-visual-identity-system, research.md R5).
 *
 * The mark is a raster derived from logo.png; the wordmark is deliberately NOT — the logo renders
 * "MatchPoint" as gradient text, and DM Sans is already the brand typeface, so reproducing it with
 * `background-clip: text` is faithful, weightless, infinitely scalable, and stays real selectable
 * text for screen readers and search engines.
 */
export function BrandMark({ layout = "inline", size = "md" }: BrandMarkProps) {
  const markClass = size === "lg" ? "brand-mark brand-mark-lg" : "brand-mark";

  // The mark carries the accessible name, and the wordmark is hidden from assistive tech to avoid
  // announcing "MatchPoint" twice. This ordering matters: the wordmark is hidden by CSS on narrow
  // viewports, so if it held the accessible name the brand would become unnamed on small phones.
  return (
    <div className={layout === "stack" ? "brand-stack" : "brand"}>
      <img className={markClass} src="/matchpoint-mark.png" alt="MatchPoint" />
      <span className="brand-wordmark" aria-hidden="true">
        MatchPoint
      </span>
    </div>
  );
}
