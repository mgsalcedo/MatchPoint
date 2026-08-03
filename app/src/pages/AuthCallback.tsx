import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchSession } from "../context/MatchSessionContext";
import type { RequestContactOutcome } from "../context/MatchSessionContext";

/**
 * Lands here after a real Google OAuth redirect (Login.tsx's signInWithOAuth redirectTo,
 * research.md R10). Completes whatever contact the user was trying to make before they were
 * asked to log in.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { completePendingContact } = useMatchSession();
  const [outcome, setOutcome] = useState<RequestContactOutcome | "pending">("pending");

  useEffect(() => {
    let cancelled = false;
    void run();
    return () => {
      cancelled = true;
    };

    async function run() {
      const result = await completePendingContact();
      if (cancelled) return;
      if (result.status === "success") {
        navigate("/contact/success");
        return;
      }
      setOutcome(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function retry() {
    setOutcome("pending");
    void completePendingContact().then((result) => {
      if (result.status === "success") navigate("/contact/success");
      else setOutcome(result);
    });
  }

  if (outcome === "pending") {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <div className="match-guide-avatar" style={{ margin: "0 auto 16px" }} aria-hidden="true">
          M
        </div>
        <h2>Confirmando tu ingreso...</h2>
        <div className="spacer" />
      </div>
    );
  }

  if (outcome.status === "org_unavailable") {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <h2>Uy, esta comunidad ya no está disponible.</h2>
        <p>Ya iniciaste sesión — volvamos a tus resultados y elegimos otra.</p>
        <button className="btn btn-primary" onClick={() => navigate("/match/results")}>
          Volver a resultados
        </button>
        <div className="spacer" />
      </div>
    );
  }

  if (outcome.status === "lead_failed") {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <h2>No se guardó tu contacto.</h2>
        <p>Ya iniciaste sesión bien — solo falló el último paso. Dale, otra vez.</p>
        <button className="btn btn-primary" onClick={retry}>
          Reintentar
        </button>
        <div className="spacer" />
      </div>
    );
  }

  // login_required shouldn't occur here (session already established), and no_pending (no
  // stored contact intent — e.g. landed on this route directly) both land on the same fallback:
  // don't leave the user on a blank screen, and don't show the "org unavailable" message for an
  // unrelated case (spec Edge Cases; trust-safety-review 004 finding).
  return (
    <div className="screen text-center">
      <div className="spacer" />
      <h2>Ya estás dentro.</h2>
      <button className="btn btn-primary" onClick={() => navigate("/")}>
        Ir al inicio
      </button>
      <div className="spacer" />
    </div>
  );
}
