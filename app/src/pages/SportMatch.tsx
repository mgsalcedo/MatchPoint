import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MatchGuide } from "../components/MatchGuide";
import { ProgressBar } from "../components/ProgressBar";
import { DISTRICTS } from "../data/organizations";
import { useMatchSession } from "../context/MatchSessionContext";
import { track } from "../lib/analytics";
import { extractMatchAnswers, decideNextStep } from "../lib/data/matchExtraction";
import {
  BUDGET_LABELS,
  DAY_LABELS,
  ENVIRONMENT_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  SPORT_LABELS,
  TIME_LABELS,
} from "../lib/labels";
import type { SportMatchAnswers, Weekday } from "../types";

type SingleQuestion = {
  key: keyof SportMatchAnswers;
  type: "single";
  title: string;
  // 008-jovial-tone research.md R1: documented per-question in docs/microcopy.md since that
  // doc's creation, never rendered until now — a plain paragraph under the title, not a new
  // component.
  helper?: string;
  options: { value: string; label: string }[];
};

type MultiQuestion = {
  key: keyof SportMatchAnswers;
  type: "multi";
  title: string;
  helper?: string;
  options: { value: string; label: string }[];
};

type Question = SingleQuestion | MultiQuestion;

const QUESTIONS: Question[] = [
  {
    key: "goal",
    type: "single",
    title: "¿Qué quieres lograr?",
    helper: "Arranquemos por tu objetivo — el deporte viene después.",
    options: Object.entries(GOAL_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "sport",
    type: "single",
    title: "¿Qué deporte te interesa?",
    helper: "El que se te venga primero a la mente — confía en tu instinto.",
    options: Object.entries(SPORT_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "district",
    type: "single",
    title: "¿Dónde te gustaría entrenar?",
    helper: "Cerca de casa, del trabajo, o donde se te haga más fácil llegar.",
    options: DISTRICTS.map((d) => ({ value: d, label: d })),
  },
  {
    key: "days",
    type: "multi",
    title: "¿Qué días puedes entrenar?",
    helper: "Puedes marcar más de uno — entre más, mejor combo te armo.",
    options: Object.entries(DAY_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "time",
    type: "single",
    title: "¿En qué horario prefieres entrenar?",
    helper: "Mañana, tarde o noche — tú mandas.",
    options: Object.entries(TIME_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "level",
    type: "single",
    title: "¿Cuál es tu nivel?",
    helper: "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte.",
    options: Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "budget",
    type: "single",
    title: "¿Cuánto quieres invertir al mes?",
    helper: "Sin sorpresas después — dinos tu rango real.",
    options: Object.entries(BUDGET_LABELS)
      .filter(([value]) => value !== "no_confirmado")
      .map(([value, label]) => ({ value, label })),
  },
  {
    key: "environment",
    type: "single",
    title: "¿Qué ambiente buscas?",
    helper: "El ambiente pesa tanto como el entrenamiento mismo.",
    options: Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const GUIDE_MICROCOPY = [
  "Arranquemos por lo importante: ¿qué quieres lograr?",
  "Ahora sí, hablemos de deporte. ¿Cuál tienes en mente?",
  "Ubiquémonos. ¿Por dónde te queda bien entrenar?",
  "El horario también cuenta. ¿Qué días te sirven?",
  "Ya casi. Solo falta el horario.",
  "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte.",
  "Hablemos de presupuesto, sin sorpresas.",
  "Última pregunta, lo prometo — y es una importante.",
];

// 006-no-empty-results FR-009, generalized in 010-ai-freetext-sport-match FR-005: derived, not
// hardcoded, so a future reorder of QUESTIONS doesn't silently point at the wrong question —
// now used both by Results.tsx's "choose a different sport" action and by free-text extraction
// routing to whichever field wasn't stated.
function questionIndexFor(key: keyof SportMatchAnswers): number {
  const index = QUESTIONS.findIndex((q) => q.key === key);
  return index === -1 ? 0 : index;
}

export function SportMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { answers, updateAnswers, finalizeMatch } = useMatchSession();
  // Results.tsx's true-empty-catalog action navigates here with { startAt: "sport" }; free-text
  // extraction (010) reuses the same mechanism generalized to any question key (research.md,
  // 006-no-empty-results research.md R5's single-literal note no longer applies). answers stay
  // in MatchSessionContext (not reset), so "‹ Atrás" from a mid-flow question still shows
  // whatever was previously answered, not a blank state.
  const startAt = (location.state as { startAt?: keyof SportMatchAnswers } | null)?.startAt;
  const [step, setStep] = useState(() => (startAt ? questionIndexFor(startAt) : 0));
  const [draftDays, setDraftDays] = useState<Weekday[]>([]);
  const [matching, setMatching] = useState(false);

  // 010-ai-freetext-sport-match: the opt-in "describe it in your own words" entry point, only
  // offered at the very first question (FR-002) — never on Welcome (docs/ux-flows.md Screen 1's
  // single-CTA rule), never mid-questionnaire (the tap-through stays the default path, Principle II).
  const [freeTextMode, setFreeTextMode] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);

  // Mount, not the Welcome screen's button click — a visitor can land on /match directly
  // (browser back/forward, refresh) without going through that click handler; the mount is the
  // more reliable "started" signal (research.md R9, 005-analytics-funnel).
  useEffect(() => {
    track({ name: "match_started" });
  }, []);

  const question = QUESTIONS[step];

  const isLast = step === QUESTIONS.length - 1;

  const goToNext = useMemo(
    () => (value: unknown) => {
      const partial = { [question.key]: value } as Partial<SportMatchAnswers>;
      updateAnswers(partial);
      if (isLast) {
        setMatching(true);
        // Build the fully-merged answers directly, rather than relying on `answers` from
        // context state: React hasn't applied the updateAnswers() setState above yet at this
        // point in the same synchronous handler, so `answers` here is still one question
        // behind. Passing the merge explicitly to finalizeMatch avoids that stale read.
        const finalAnswers = { ...answers, ...partial } as SportMatchAnswers;
        // Real matching/persistence now runs async (Supabase-backed); keep the branded
        // loading screen's minimum duration so a fast response doesn't flash past it.
        const minDelay = new Promise((resolve) => window.setTimeout(resolve, 1500));
        void Promise.all([finalizeMatch(finalAnswers), minDelay]).finally(() => {
          navigate("/match/results");
        });
        return;
      }
      setExtractionFailed(false); // clears the fallback explanation once the user moves past it
      setStep((s) => s + 1);
    },
    [question.key, isLast, answers, updateAnswers, finalizeMatch, navigate]
  );

  // 010-ai-freetext-sport-match: extraction never guesses (FR-005) — decideNextStep only ever
  // finalizes on a complete extraction, routes to the first genuinely-missing question, or falls
  // back to the plain questionnaire on any failure. Same finalize-path shape as goToNext's last
  // question, since both end at the same "matching" loading screen.
  const submitFreeText = async () => {
    const trimmed = freeText.trim();
    if (!trimmed) return;

    setExtracting(true);
    setExtractionFailed(false);
    const result = await extractMatchAnswers(trimmed);
    const decision = decideNextStep(result);
    updateAnswers(result.extracted);
    setExtracting(false);

    if (decision.action === "finalize") {
      const finalAnswers = { ...answers, ...result.extracted } as SportMatchAnswers;
      setFreeTextMode(false);
      setMatching(true);
      const minDelay = new Promise((resolve) => window.setTimeout(resolve, 1500));
      void Promise.all([finalizeMatch(finalAnswers), minDelay]).finally(() => {
        navigate("/match/results");
      });
      return;
    }

    if (decision.action === "askMissing") {
      setFreeTextMode(false);
      setStep(questionIndexFor(decision.startAt));
      return;
    }

    // fallback: extraction failed entirely — brief explanation, then the plain tap-through
    // questionnaire from the first question (FR-008), never a raw error or a stuck screen.
    setExtractionFailed(true);
    setFreeTextMode(false);
    setStep(0);
  };

  if (matching) {
    return (
      <div className="screen text-center">
        <div className="aurora" aria-hidden="true" />
        <div className="spacer" />
        <div
          className="match-guide-avatar match-guide-avatar-pulse"
          style={{ margin: "0 auto 16px" }}
          aria-hidden="true"
        >
          M
        </div>
        <h2>Estoy cruzando tu objetivo, horario y ubicación para armarte un buen combo...</h2>
        <div className="spacer" />
      </div>
    );
  }

  return (
    <div className="screen">
      {step > 0 && (
        <button
          className="link-button"
          style={{ marginBottom: 12 }}
          onClick={() => {
            setExtractionFailed(false);
            setStep((s) => s - 1);
          }}
        >
          ‹ Atrás
        </button>
      )}
      {/* Progress sits outside the animated block so the bar fills smoothly across questions
          instead of restarting. `key={step}` re-runs the entrance on every question change —
          the screen itself only remounts on route change, not between steps. */}
      <ProgressBar step={step + 1} total={QUESTIONS.length} />

      <div key={step} className="question-block rise-in">
        <MatchGuide text={GUIDE_MICROCOPY[step]} />

        {extractionFailed && (
          <p>No logré entender bien tu mensaje — vamos paso a paso, como siempre.</p>
        )}

        {step === 0 && !freeTextMode && (
          <button className="link-button" style={{ marginBottom: 8 }} onClick={() => setFreeTextMode(true)}>
            Prefiero describirlo con mis palabras
          </button>
        )}

        {freeTextMode ? (
          <>
            <h2>Cuéntame qué buscas, con tus palabras</h2>
            <p>
              Menciona lo que puedas: deporte, distrito, días, horario, nivel, presupuesto,
              ambiente. Lo que falte, te lo pregunto después.
            </p>
            <textarea
              className="free-text-input"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Ej: Trabajo hasta las 7, vivo en Magdalena, quiero preparar mi primera media maratón y conocer gente."
              rows={4}
              maxLength={500}
              disabled={extracting}
            />
            <button
              className="btn btn-primary btn-block"
              disabled={!freeText.trim() || extracting}
              onClick={() => void submitFreeText()}
            >
              {extracting ? "Buscando..." : "Continuar"}
            </button>
            <button
              className="link-button"
              onClick={() => setFreeTextMode(false)}
              disabled={extracting}
            >
              Prefiero elegir de las opciones
            </button>
          </>
        ) : (
          <>
            <h2>{question.title}</h2>
            {question.helper && <p>{question.helper}</p>}

            {question.type === "single" && (
              <div className="option-list">
                {question.options.map((opt) => (
                  <button key={opt.value} className="option" onClick={() => goToNext(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {question.type === "multi" && (
              <>
                <div className="option-list">
                  {question.options.map((opt) => {
                    const selected = draftDays.includes(opt.value as Weekday);
                    return (
                      <button
                        key={opt.value}
                        className={`option${selected ? " selected" : ""}`}
                        onClick={() =>
                          setDraftDays((days) =>
                            selected ? days.filter((d) => d !== opt.value) : [...days, opt.value as Weekday]
                          )
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={draftDays.length === 0}
                  onClick={() => goToNext(draftDays)}
                >
                  Continuar
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
