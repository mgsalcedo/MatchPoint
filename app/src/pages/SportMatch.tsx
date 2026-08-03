import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MatchGuide } from "../components/MatchGuide";
import { ProgressBar } from "../components/ProgressBar";
import { DISTRICTS } from "../data/organizations";
import { useMatchSession } from "../context/MatchSessionContext";
import { track } from "../lib/analytics";
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
  options: { value: string; label: string }[];
};

type MultiQuestion = {
  key: keyof SportMatchAnswers;
  type: "multi";
  title: string;
  options: { value: string; label: string }[];
};

type Question = SingleQuestion | MultiQuestion;

const QUESTIONS: Question[] = [
  {
    key: "goal",
    type: "single",
    title: "¿Qué quieres lograr?",
    options: Object.entries(GOAL_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "sport",
    type: "single",
    title: "¿Qué deporte te interesa?",
    options: Object.entries(SPORT_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "district",
    type: "single",
    title: "¿Dónde te gustaría entrenar?",
    options: DISTRICTS.map((d) => ({ value: d, label: d })),
  },
  {
    key: "days",
    type: "multi",
    title: "¿Qué días puedes entrenar?",
    options: Object.entries(DAY_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "time",
    type: "single",
    title: "¿En qué horario prefieres entrenar?",
    options: Object.entries(TIME_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "level",
    type: "single",
    title: "¿Cuál es tu nivel?",
    options: Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "budget",
    type: "single",
    title: "¿Cuánto quieres invertir al mes?",
    options: Object.entries(BUDGET_LABELS)
      .filter(([value]) => value !== "no_confirmado")
      .map(([value, label]) => ({ value, label })),
  },
  {
    key: "environment",
    type: "single",
    title: "¿Qué ambiente buscas?",
    options: Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const GUIDE_MICROCOPY = [
  "Empecemos por lo más importante: tu meta.",
  "Ahora cuéntame qué deporte tienes en mente.",
  "Vamos a ubicarte.",
  "Cuadremos esto con tu semana.",
  "Casi listos.",
  "Quiero recomendarte algo a tu nivel.",
  "Sin sorpresas de presupuesto.",
  "Última pregunta, lo prometo.",
];

// 006-no-empty-results FR-009: derived, not hardcoded, so a future reorder of QUESTIONS doesn't
// silently point "choose a different sport" at the wrong question.
const SPORT_QUESTION_INDEX = QUESTIONS.findIndex((q) => q.key === "sport");

export function SportMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { answers, updateAnswers, finalizeMatch } = useMatchSession();
  // Results.tsx's true-empty-catalog action navigates here with { startAt: "sport" } — a single
  // literal, not a general "jump to any question" feature (research.md R5). answers stay in
  // MatchSessionContext (not reset), so "‹ Atrás" from the sport question still shows whatever
  // was previously answered for goal, not a blank state.
  const startAt = (location.state as { startAt?: "sport" } | null)?.startAt;
  const [step, setStep] = useState(() => (startAt === "sport" ? SPORT_QUESTION_INDEX : 0));
  const [draftDays, setDraftDays] = useState<Weekday[]>([]);
  const [matching, setMatching] = useState(false);

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
      setStep((s) => s + 1);
    },
    [question.key, isLast, answers, updateAnswers, finalizeMatch, navigate]
  );

  if (matching) {
    return (
      <div className="screen text-center">
        <div className="spacer" />
        <div className="match-guide-avatar" style={{ margin: "0 auto 16px" }} aria-hidden="true">
          M
        </div>
        <h2>Estoy buscando comunidades que realmente encajen contigo...</h2>
        <div className="spacer" />
      </div>
    );
  }

  return (
    <div className="screen">
      {step > 0 && (
        <button className="link-button" style={{ marginBottom: 12 }} onClick={() => setStep((s) => s - 1)}>
          ‹ Atrás
        </button>
      )}
      <ProgressBar step={step + 1} total={QUESTIONS.length} />
      <MatchGuide text={GUIDE_MICROCOPY[step]} />
      <h2>{question.title}</h2>

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
    </div>
  );
}
