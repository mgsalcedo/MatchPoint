import { useNavigate } from "react-router-dom";
import { useMatchSession } from "../context/MatchSessionContext";

function externalLink(contactType: string, organization: { whatsapp?: string; instagram?: string; bookingLink?: string }) {
  if (contactType === "whatsapp" && organization.whatsapp) {
    return { url: `https://wa.me/${organization.whatsapp}`, label: "Abrir WhatsApp" };
  }
  if (contactType === "instagram" && organization.instagram) {
    return { url: `https://instagram.com/${organization.instagram}`, label: "Abrir Instagram" };
  }
  if (organization.bookingLink) {
    return { url: organization.bookingLink, label: "Reservar clase" };
  }
  return null;
}

export function ContactSuccess() {
  const navigate = useNavigate();
  const { lastLead, getOrganization, resetMatch } = useMatchSession();

  const organization = lastLead ? getOrganization(lastLead.organizationId) : undefined;
  const link = organization && lastLead ? externalLink(lastLead.contactType, organization) : null;

  return (
    <div className="screen text-center">
      <div className="spacer" />
      <h1>Listo, tu contacto quedó guardado.</h1>
      <p>
        {organization
          ? `Guardamos tu interés en ${organization.name}. Ahora puedes escribirles directamente.`
          : "Guardamos tu interés en esta comunidad."}
      </p>
      {link && (
        <a className="btn btn-primary" href={link.url} target="_blank" rel="noreferrer">
          {link.label}
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
