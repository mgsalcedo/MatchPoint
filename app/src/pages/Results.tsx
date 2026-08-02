import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MatchGuide } from "../components/MatchGuide";
import { useMatchSession } from "../context/MatchSessionContext";
import { accentColor } from "../lib/colors";
import { badgeClass, SPORT_LABELS } from "../lib/labels";
import { track } from "../lib/analytics";

export function Results() {
  const navigate = useNavigate();
  const { results, answers, resetMatch, matchSessionId } = useMatchSession();

  // FR-008 / research.md R7: matched vs. no-match are distinct events, each fired once per
  // mount (empty deps — re-renders within the same mount must not re-fire).
  useEffect(() => {
    if (!matchSessionId) return;
    if (results.length > 0) {
      track({ name: "results_viewed", matchSessionId, resultCount: results.length });
    } else {
      track({ name: "no_match_viewed", matchSessionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (results.length === 0) {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <MatchGuide text="Match™" />
        <h2>No encontré un match perfecto todavía, pero puedo intentar de otra forma.</h2>
        <p>Prueba ampliando tu distrito, cambiando de horario o explorando otro deporte.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetMatch();
            navigate("/match");
          }}
        >
          Intentar de nuevo
        </button>
        <div className="spacer" />
      </div>
    );
  }

  return (
    <div className="screen screen-tight">
      <MatchGuide text="Match™" />
      <h1>Tu Match está listo.</h1>
      <p>
        Estas son las comunidades de {answers.sport ? SPORT_LABELS[answers.sport] : "tu deporte"} que más se
        parecen a lo que buscas.
      </p>

      {results.map((result, index) => (
        <div className="card" key={result.organization.id}>
          <div className="card-title-row">
            <h2>{result.organization.name}</h2>
            <span className={badgeClass(result.label)}>{result.label}</span>
          </div>
          <div className="meta-row">
            {SPORT_LABELS[result.organization.sports[0]]} · {result.organization.districts[0]}
          </div>
          <ul className="reasons">
            {result.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <button
            className="btn"
            onClick={() => navigate(`/organizations/${result.organization.id}`, { state: { resultRank: index + 1 } })}
            style={{ borderColor: accentColor(result.organization.sports[0]) }}
          >
            Ver comunidad
          </button>
        </div>
      ))}
    </div>
  );
}
