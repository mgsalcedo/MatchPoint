import { BrandMark } from "../components/BrandMark";
import { useMatchSession } from "../context/MatchSessionContext";

export function Login() {
  const { login } = useMatchSession();

  // Real OAuth is a full-page navigation away from the SPA (research.md R10, 004-auth-lead-
  // creation) — nothing runs after login() is called; the pending contact (already saved to
  // sessionStorage by requestContact) completes on /auth/callback when the user returns.
  function handleLogin(provider: "google" | "apple") {
    login(provider);
  }

  return (
    <div className="screen text-center">
      <div className="aurora" aria-hidden="true" />
      <div className="spacer" />
      <div className="rise-in" style={{ marginBottom: 24 }}>
        <BrandMark layout="stack" />
      </div>
      <h1>Continúa para contactar.</h1>
      <p>Así guardamos tu Match y no perdemos el hilo de lo que encontraste.</p>
      <div className="option-list">
        <button className="btn" onClick={() => handleLogin("google")}>
          Continuar con Google
        </button>
        {/* Apple Sign In deferred this milestone — research.md R1. Structurally ready
            (login() already takes provider: "google" | "apple"); re-enable once the owner
            completes Apple Developer setup. */}
      </div>
      <div className="spacer" />
    </div>
  );
}
