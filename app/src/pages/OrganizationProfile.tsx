import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { OrgAvatar } from "../components/OrgAvatar";
import { useMatchSession } from "../context/MatchSessionContext";
import { accentGradient } from "../lib/colors";
import { track } from "../lib/analytics";
import {
  ADN_LABELS,
  badgeClass,
  BUDGET_LABELS,
  DAY_LABELS,
  ENVIRONMENT_LABELS,
  LEVEL_LABELS,
  SPORT_LABELS,
  TIME_LABELS,
} from "../lib/labels";
import type { ContactType } from "../types";

function timeOfDay(startTime: string): string {
  const hour = Number(startTime.split(":")[0]);
  if (hour < 12) return TIME_LABELS.manana;
  if (hour < 18) return TIME_LABELS.tarde;
  return TIME_LABELS.noche;
}

export function OrganizationProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getOrganization, results, requestContact } = useMatchSession();
  const [contactState, setContactState] = useState<"idle" | "sending" | "org_unavailable" | "lead_failed">("idle");

  const organization = id ? getOrganization(id) : undefined;
  const resultRank = (location.state as { resultRank?: number } | null)?.resultRank ?? null;
  const matchResult = results.find((r) => r.organization.id === id);

  // Guarded on organization actually resolving — the "no longer available" branch below is a
  // failed lookup, not a successful profile open (research.md R9, 005-analytics-funnel).
  useEffect(() => {
    if (organization) track({ name: "profile_opened", organizationId: organization.id, resultRank });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  if (!organization) {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <h2>Esta comunidad ya no está disponible o está pendiente de verificación.</h2>
        <button className="btn" onClick={() => navigate("/match/results")}>
          Volver a resultados
        </button>
        <div className="spacer" />
      </div>
    );
  }

  const primaryContact: { type: ContactType; label: string } | null = organization.whatsapp
    ? { type: "whatsapp", label: "Contactar por WhatsApp" }
    : organization.instagram
    ? { type: "instagram", label: "Contactar por Instagram" }
    : organization.bookingLink
    ? { type: "booking", label: "Reservar clase" }
    : null;

  // Website is deliberately NOT a Lead-generating contact action (BR-003 lists only WhatsApp,
  // Instagram, booking, call, form) — it's a plain external link, no login/Lead gate. Only shown
  // as a fallback when nothing else is available, so a website-only org (e.g. Club Regatas
  // Unión) isn't left with a dead-end CTA.
  const websiteOnly = !primaryContact && organization.website;

  async function handleContact() {
    if (!primaryContact) return;
    // Recorded independent of and prior to knowing the outcome (login redirect, immediate
    // success, org-unavailable, or lead-save failure all follow this line) — FR-002,
    // research.md R9, 005-analytics-funnel.
    // `organization!` matches the assertion on the requestContact call below: the early return
    // above guarantees it's defined, but TS drops that narrowing inside a hoisted function
    // declaration.
    track({ name: "contact_clicked", organizationId: organization!.id, contactType: primaryContact.type, resultRank });
    setContactState("sending");
    const outcome = await requestContact(
      organization!,
      primaryContact.type,
      resultRank,
      "organization_profile",
      matchResult?.id ?? null
    );
    switch (outcome.status) {
      case "login_required":
        navigate("/login");
        return;
      case "success":
        navigate("/contact/success");
        return;
      case "org_unavailable":
        setContactState("org_unavailable");
        return;
      case "lead_failed":
        setContactState("lead_failed");
        return;
    }
  }

  return (
    <div className="screen screen-tight" style={{ paddingBottom: 0 }}>
      <button className="link-button" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
        ‹ Volver
      </button>

      {/* Real cover photo when the community has one; otherwise the same deliberate
          initials-over-sport-gradient fallback used on result cards (007 R4, BR-016). */}
      {organization.coverImageUrl ? (
        <img className="hero-block" src={organization.coverImageUrl} alt="" aria-hidden="true" />
      ) : (
        <div className="hero-block" style={{ background: accentGradient(organization.sports[0]) }}>
          {organization.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </div>
      )}

      <div className="card-head">
        <OrgAvatar
          name={organization.name}
          logoUrl={organization.logoUrl}
          sport={organization.sports[0]}
          size="lg"
        />
        <div className="card-head-body">
          <div className="card-title-row">
            <h1>{organization.name}</h1>
            {matchResult && <span className={badgeClass(matchResult.label)}>{matchResult.label}</span>}
          </div>
        </div>
      </div>
      <div className="meta-row">
        {organization.sports.map((s) => SPORT_LABELS[s]).join(", ")} · {organization.districts.join(", ")}
      </div>

      {matchResult && matchResult.reasons.length > 0 && (
        <div className="callout">
          <strong>{matchResult.label}</strong> porque:
          <ul className="reasons" style={{ marginTop: 8 }}>
            {matchResult.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="section">
        <div className="section-label">Sobre la comunidad</div>
        <p>{organization.description}</p>
      </div>

      <div className="section">
        <div className="section-label">Horario</div>
        {organization.schedules.length > 0 ? (
          organization.schedules.map((s, i) => (
            <div key={i} className="meta-row">
              {DAY_LABELS[s.day]} · {s.startTime}
              {s.endTime ? `–${s.endTime}` : ""} ({timeOfDay(s.startTime)}) ·{" "}
              {s.level ? LEVEL_LABELS[s.level] : "Nivel por confirmar"}
            </div>
          ))
        ) : (
          <p>Horario por confirmar.</p>
        )}
      </div>

      <div className="section">
        <div className="section-label">Nivel y ambiente</div>
        <div className="chip-row">
          {organization.adnDeportivo.environments.map((env) => (
            <span className="chip" key={env}>
              {ENVIRONMENT_LABELS[env]}
            </span>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-label">ADN Deportivo™</div>
        {/* docs/component-library.md's CommunityADN: "do not show missing values; present as
            personality, not ranking." A score of exactly 0 means the source had no signal for
            that dimension (research.md R5's null→0 default) — not a real "1 of 5" — so it's
            hidden rather than shown as an empty bar. */}
        {ADN_LABELS.filter(({ key }) => organization.adnDeportivo[key] > 0).map(({ key, label }) => (
          <div key={key} className="adn-row">
            <span className="adn-label">{label}</span>
            <div className="progress-track adn-bar-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.round(organization.adnDeportivo[key] * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {organization.coach && (
        <div className="section">
          <div className="section-label">Coach</div>
          <p>{organization.coach}</p>
        </div>
      )}

      <div className="section">
        <div className="section-label">Precio</div>
        <p>
          {BUDGET_LABELS[organization.priceRange] ?? "Precio no confirmado"}
          {organization.trialClassAvailable ? " · Clase de prueba disponible" : ""}
        </p>
      </div>

      {organization.services.length > 0 && (
        <div className="section">
          <div className="section-label">Servicios</div>
          <div className="chip-row">
            {organization.services.map((service) => (
              <span className="chip" key={service}>
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sticky-footer">
        {contactState === "org_unavailable" && (
          <p className="text-center" style={{ marginBottom: 8 }}>
            Esta comunidad ya no está disponible para contactar.
          </p>
        )}
        {contactState === "lead_failed" && (
          <p className="text-center" style={{ marginBottom: 8 }}>
            No pudimos guardar tu contacto. Intenta de nuevo.
          </p>
        )}
        {primaryContact ? (
          <button className="btn btn-primary" onClick={handleContact} disabled={contactState === "sending"}>
            {contactState === "sending" ? "Enviando..." : primaryContact.label}
          </button>
        ) : websiteOnly ? (
          <a className="btn btn-primary" href={organization.website} target="_blank" rel="noreferrer">
            Visitar sitio web
          </a>
        ) : (
          <button className="btn" disabled>
            Esta comunidad todavía no tiene un canal de contacto confirmado.
          </button>
        )}
      </div>
    </div>
  );
}
