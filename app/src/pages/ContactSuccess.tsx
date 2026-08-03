import { useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { useMatchSession } from "../context/MatchSessionContext";
import { track } from "../lib/analytics";

export function ContactSuccess() {
  const navigate = useNavigate();
  const { lastLead, lastContactedOrganization, lastExternalLink, getOrganization, resetMatch } = useMatchSession();

  // Prefers lastContactedOrganization (set directly from the fresh contactability snapshot
  // performContact already fetched) over the in-memory getOrganization() lookup: state.results
  // is empty after a real OAuth full-page redirect, so the old lookup-only path would silently
  // show "no organization" for every first-time-login contact (research.md R11).
  const organizationName =
    lastContactedOrganization?.name ??
    (lastLead ? getOrganization(lastLead.organizationId)?.name : undefined);

  function handleOpenExternal() {
    if (lastLead) track({ name: "external_contact_opened", leadId: lastLead.id, contactType: lastLead.contactType });
  }

  return (
    <div className="screen text-center">
      <div className="aurora" aria-hidden="true" />
      <div className="spacer" />
      <div className="rise-in" style={{ marginBottom: 24 }}>
        <BrandMark layout="stack" />
      </div>
      <h1>Listo, ya quedó guardado tu contacto.</h1>
      <p>
        {organizationName
          ? `Guardamos tu interés en ${organizationName}. Ahora puedes escribirles directamente.`
          : "Guardamos tu interés en esta comunidad."}
      </p>
      {lastExternalLink && (
        <a
          className="btn btn-primary"
          href={lastExternalLink.url}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpenExternal}
        >
          {lastExternalLink.label}
        </a>
      )}
      <div className="spacer" />
      <button
        className="link-button"
        onClick={() => {
          resetMatch();
          navigate("/");
        }}
      >
        Volver al inicio
      </button>
    </div>
  );
}
