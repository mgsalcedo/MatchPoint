import { useNavigate } from "react-router-dom";
import { useMatchSession } from "../context/MatchSessionContext";

export function Login() {
  const navigate = useNavigate();
  const { login, confirmPendingContact, pendingContact } = useMatchSession();

  function handleLogin(provider: "google" | "apple") {
    login(provider);
    if (pendingContact) {
      confirmPendingContact();
      navigate("/contact/success");
    } else {
      navigate("/match/results");
    }
  }

  return (
    <div className="screen text-center">
      <div className="spacer" />
      <h1>Continúa para contactar.</h1>
      <p>
        Así podremos guardar tu Match y ayudarte a medir si encontraste una comunidad para
        entrenar.
      </p>
      <div className="option-list">
        <button className="btn" onClick={() => handleLogin("google")}>
          Continuar con Google
        </button>
        <button className="btn" onClick={() => handleLogin("apple")}>
          Continuar con Apple
        </button>
      </div>
      <div className="spacer" />
    </div>
  );
}
