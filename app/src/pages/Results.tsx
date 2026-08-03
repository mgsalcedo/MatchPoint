import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MatchGuide } from "../components/MatchGuide";
import { OrgAvatar } from "../components/OrgAvatar";
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

  // 006-no-empty-results FR-005/R2: post-fix, calculateMatches() only returns zero results when
  // zero organizations in the catalog offer the requested sport at all — never because the
  // user's other answers produced only weak fits (those are now always shown, honestly labeled).
  // Deliberately does NOT call resetMatch(): the other answers (goal, district, days, etc.) are
  // still valid and stay in context — only the sport is provably the blocker here (FR-009).
  if (results.length === 0) {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <MatchGuide text="Match™" />
        <h2>Todavía no tenemos comunidades de este deporte.</h2>
        <p>No es algo que puedas resolver cambiando tus otras respuestas — elige otro deporte y sigo buscando.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/match", { state: { startAt: "sport" } })}
        >
          Elegir otro deporte
        </button>
        <div className="spacer" />
      </div>
    );
  }

  // 007-visual-identity-system R8: presentational split only — calculateMatches() already returns
  // results sorted by score, so results[0] is already the top match. No change to ordering,
  // scoring, or the 5-result cap.
  const [topResult, ...alternatives] = results;

  function renderCard(result: (typeof results)[number], rank: number, isTop: boolean) {
    const sport = result.organization.sports[0];
    return (
      <div className={isTop ? "card card-top rise-in" : "card rise-in"} key={result.organization.id}>
        <div className="card-head">
          <OrgAvatar
            name={result.organization.name}
            logoUrl={result.organization.logoUrl}
            sport={sport}
            size={isTop ? "lg" : "md"}
          />
          <div className="card-head-body">
            <div className="card-title-row">
              <h2>{result.organization.name}</h2>
              <span className={badgeClass(result.label)}>{result.label}</span>
            </div>
            <div className="meta-row" style={{ marginBottom: 0 }}>
              {SPORT_LABELS[sport]} · {result.organization.districts[0]}
            </div>
          </div>
        </div>
        <ul className="reasons">
          {result.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <button
          className={isTop ? "btn btn-primary" : "btn"}
          onClick={() => navigate(`/organizations/${result.organization.id}`, { state: { resultRank: rank } })}
          style={isTop ? undefined : { borderColor: accentColor(sport) }}
        >
          Ver comunidad
        </button>
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

      {renderCard(topResult, 1, true)}

      {/* Heading only when alternatives exist — a single-result run must not render an empty
          section (007 R8 guard). */}
      {alternatives.length > 0 && (
        <>
          <div className="list-heading">También podrían encajar</div>
          {alternatives.map((result, index) => renderCard(result, index + 2, false))}
        </>
      )}

      {/* 006-no-empty-results FR-008: always visible, regardless of match quality — a user with
          only "Weak Match" results should be able to change any answer, not just the sport. */}
      <button
        className="link-button"
        onClick={() => {
          resetMatch();
          navigate("/match");
        }}
      >
        Cambiar mis respuestas
      </button>
    </div>
  );
}
