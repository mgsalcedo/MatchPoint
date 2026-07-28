import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMatchSession } from "../context/MatchSessionContext";
import { accentColor } from "../lib/colors";
import {
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

  const organization = id ? getOrganization(id) : undefined;
  const resultRank = (location.state as { resultRank?: number } | null)?.resultRank ?? 0;
  const matchResult = results.find((r) => r.organization.id === id);

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
    ? { type: "booking_link", label: "Reservar clase" }
    : null;

  function handleContact() {
    if (!primaryContact) return;
    const proceeded = requestContact(organization!, primaryContact.type, resultRank, "organization_profile");
    if (proceeded) {
      navigate("/contact/success");
    } else {
      navigate("/login");
    }
  }

  return (
    <div className="screen screen-tight" style={{ paddingBottom: 0 }}>
      <button className="link-button" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
        ‹ Volver
      </button>

      <div className="hero-block" style={{ background: accentColor(organization.sports[0]) }}>
        {organization.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>

      <div className="card-title-row">
        <h1>{organization.name}</h1>
        {matchResult && <span className={badgeClass(matchResult.label)}>{matchResult.label}</span>}
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
        {primaryContact ? (
          <button className="btn btn-primary" onClick={handleContact}>
            {primaryContact.label}
          </button>
        ) : (
          <button className="btn" disabled>
            Esta comunidad todavía no tiene un canal de contacto confirmado.
          </button>
        )}
      </div>
    </div>
  );
}
