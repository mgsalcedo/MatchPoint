import { useNavigate } from "react-router-dom";
import { MatchGuide } from "../components/MatchGuide";
import { useMatchSession } from "../context/MatchSessionContext";

export function Welcome() {
  const navigate = useNavigate();
  const { resetMatch } = useMatchSession();

  return (
    <div className="screen">
      <div className="spacer" />
      <MatchGuide text="Match™ · tu guía deportivo" />
      <h1>Hola, soy Match™.</h1>
      <p>
        Te ayudo a encontrar una comunidad deportiva que encaje contigo. Tomará menos de un
        minuto.
      </p>
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
  );
}
