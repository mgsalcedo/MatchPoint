import { useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { MatchGuide } from "../components/MatchGuide";
import { useMatchSession } from "../context/MatchSessionContext";

export function Welcome() {
  const navigate = useNavigate();
  const { resetMatch } = useMatchSession();

  return (
    <>
      {/* Decorative only — the aurora wash sits behind the hero content (FR-002). */}
      <div className="aurora" aria-hidden="true" />
      <div className="screen text-center">
        <div className="spacer" />
        <div className="rise-in">
          <BrandMark layout="stack" size="lg" />
        </div>
        <div className="spacer" />
        <div className="rise-in">
          <MatchGuide text="Match™ · tu guía deportivo" />
          <h1>Hola, soy Match™, tu cómplice deportivo.</h1>
          <p>Te ayudo a encontrar una comunidad que encaje contigo. Toma menos de un minuto, lo prometo.</p>
        </div>
        <div className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => {
            resetMatch();
            navigate("/match");
          }}
        >
          Comenzar Sport Match™
        </button>
      </div>
    </>
  );
}
