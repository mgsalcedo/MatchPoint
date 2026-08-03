import { useState } from "react";
import { accentGradient } from "../lib/colors";
import type { Sport } from "../types";

interface OrgAvatarProps {
  name: string;
  logoUrl?: string;
  sport?: Sport;
  size?: "md" | "lg";
}

/** "Peru Runners" -> "PR". Two letters max, uppercase. */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * An organization's square mark: the real logo when there is one, otherwise its initials over a
 * gradient tinted by its sport (007-visual-identity-system, research.md R4).
 *
 * The fallback is a deliberate design state, not an error state — most seeded organizations have
 * no logo yet, and it must never be filled with a stock photo or another community's image
 * (BR-016). A logo that fails to load falls back to the same treatment rather than collapsing the
 * layout; the box is sized by CSS either way, so nothing reflows while an image loads (FR-003c).
 */
export function OrgAvatar({ name, logoUrl, sport, size = "md" }: OrgAvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === "lg" ? "org-avatar org-avatar-lg" : "org-avatar";

  if (logoUrl && !failed) {
    return (
      <img
        className={sizeClass}
        src={logoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} org-avatar-fallback`}
      style={{ background: accentGradient(sport) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
