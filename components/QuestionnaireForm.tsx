"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire, QuestionnaireCollection } from "@/lib/types";
import type { QuestionnaireScope, StructuredResponse, SubmissionResponse } from "@/lib/submissions";

type Answers = Record<string, string>;
type View = "home" | "generation" | "transmission" | "distribution" | "final" | "submitted";
type GenerationAsset = "solar" | "wind" | "thermal";
type Phase = "questions" | "complete" | "move";
type FlatStep = { question: Question; stressor: string; sectionNumber: string; sectionIndex: number };

const STORAGE_KEY = "climate-questionnaire-progress-v3";
const key = (...parts: string[]) => parts.join("__");
const generationAssets: Array<{ id: GenerationAsset; icon: string; title: string }> = [
  { id: "solar", icon: "☀", title: "Solar Power Plant" },
  { id: "wind", icon: "⚡", title: "Wind Power Plant" },
  { id: "thermal", icon: "◆", title: "Thermal Power Plant" },
];

type FieldProps = { question: Question; answers: Answers; setAnswer: (name: string, value: string) => void; scope: string };

function ChoiceField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "choice") return null;
  const name = key(scope, question.number, question.text);
  return <div className="choice-grid">{question.options.map((option) => {
    const id = key(name, option);
    return <div className={answers[name] === option ? "choice selected" : "choice"} key={option}>
      <label htmlFor={id}><input id={id} type="radio" name={name} value={option} checked={answers[name] === option} onChange={(event) => setAnswer(name, event.target.value)} /><span>{option}</span></label>
      {option.startsWith("Other") && answers[name] === option && <input className="other-input" aria-label={`${question.number} other response`} placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(event) => setAnswer(key(name, "other"), event.target.value)} />}
    </div>;
  })}</div>;
}

function MatrixField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "matrix") return null;
  const q = question as MatrixQuestion;
  return <div className="table-wrap"><table><thead><tr><th>{q.firstColumn}</th><th>Unit</th><th>Response (select one)</th></tr></thead><tbody>{q.rows.map((row) => {
    const name = key(scope, q.number, row.id);
    return <tr key={row.id}><th scope="row">{row.label}</th><td>{row.unit}</td><td><select aria-label={`${q.number} ${row.label}`} value={answers[name] ?? ""} onChange={(event) => setAnswer(name, event.target.value)}><option value="">Select a response</option>{q.options.map((option) => <option key={option}>{option}</option>)}</select>{answers[name]?.startsWith("Other") && <input className="other-input" placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(event) => setAnswer(key(name, "other"), event.target.value)} />}</td></tr>;
  })}</tbody></table></div>;
}

function MeasuresField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "measures") return null;
  const q = question as MeasuresQuestion;
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead><tbody>{q.rows.map((row) => {
    const base = key(scope, q.number, row.id);
    return <tr key={row.id}><td>{row.serial}</td><th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(event) => setAnswer(key(base, "measure"), event.target.value)} /> : row.measure}</th><td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(event) => setAnswer(key(base, "minimum"), event.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(event) => setAnswer(key(base, "maximum"), event.target.value)} /></div></td><td className="unit">{q.unit}</td><td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(event) => setAnswer(key(base, "outcome"), event.target.value)} /><span>%</span></div></td></tr>;
  })}</tbody></table></div>;
}

function buildResponse(question: Question, answers: Answers, scope: QuestionnaireScope): StructuredResponse | null {
  if (question.type === "choice") {
    const name = key(scope, question.number, question.text);
    const selection = answers[name];
    if (!selection) return null;
    const other = selection.startsWith("Other") ? answers[key(name, "other")]?.trim() : undefined;
    return selection.startsWith("Other") && !other ? null : { kind: "choice", selection, other };
  }
  if (question.type === "matrix") {
    const rows = question.rows.map((row) => { const name = key(scope, question.number, row.id); return { id: row.id, selection: answers[name] ?? "", other: answers[key(name, "other")]?.trim() }; });
    return rows.some((row) => !row.selection || (row.selection.startsWith("Other") && !row.other)) ? null : { kind: "matrix", rows };
  }
  const rows = question.rows.map((row) => { const base = key(scope, question.number, row.id); return { id: row.id, measure: answers[key(base, "measure")]?.trim(), minimum: answers[key(base, "minimum")]?.trim(), maximum: answers[key(base, "maximum")]?.trim(), outcome: answers[key(base, "outcome")]?.trim() }; });
  const complete = rows.every((answer, index) => {
    const definition = question.rows[index];
    const any = [answer.measure, answer.minimum, answer.maximum, answer.outcome].some(Boolean);
    if (definition.custom && !any) return true;
    return (!definition.custom || Boolean(answer.measure)) && answer.minimum !== undefined && answer.minimum !== "" && answer.maximum !== undefined && answer.maximum !== "" && Number(answer.minimum) <= Number(answer.maximum) && answer.outcome !== undefined && answer.outcome !== "" && Number(answer.outcome) <= 100;
  });
  return complete ? { kind: "measures", rows: rows.filter((answer, index) => !question.rows[index].custom || [answer.measure, answer.minimum, answer.maximum, answer.outcome].some(Boolean)) } : null;
}

function questionError(question: Question) {
  if (question.type === "choice") return "Select an answer before continuing. If you select Other, please specify your answer.";
  if (question.type === "matrix") return "Select one response for every row before continuing.";
  return "Complete the cost and outcome fields for each listed measure. Optional ‘Other’ rows may be left blank.";
}

function QuestionCard({ question, answers, setAnswer, scope, stressor }: FieldProps & { stressor: string }) {
  return <article className="question progressive-card"><div className="question-kicker">Climate stressor · {stressor}</div><div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && question.unit && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div>{question.type === "choice" && <ChoiceField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}{question.type === "matrix" && <MatrixField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}{question.type === "measures" && <MeasuresField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}</article>;
}

function FlowCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="flow-card"><p className="eyebrow-light">Questionnaire progress</p><h2>{title}</h2><p>{description}</p><div className="flow-actions">{children}</div></section>;
}

type QuestionnaireBodyProps = { questionnaire: Questionnaire; sectionCode: string; displayTitle: string; scope: QuestionnaireScope; answers: Answers; setAnswer: (name: string, value: string) => void; currentIndex: number; setCurrentIndex: (index: number) => void; phase: Phase; setPhase: (phase: Phase) => void; onMoveSections: () => void; onFinish: () => void };

function QuestionnaireBody({ questionnaire, sectionCode, displayTitle, scope, answers, setAnswer, currentIndex, setCurrentIndex, phase, setPhase, onMoveSections, onFinish }: QuestionnaireBodyProps) {
  const steps = useMemo<FlatStep[]>(() => questionnaire.sections.flatMap((section, sectionIndex) => section.questions.map((question) => ({ question, stressor: section.title, sectionNumber: section.number, sectionIndex }))), [questionnaire]);
  const safeIndex = Math.min(currentIndex, steps.length - 1);
  const current = steps[safeIndex];
  const [validationError, setValidationError] = useState("");
  const firstIncomplete = () => steps.findIndex(({ question }) => !buildResponse(question, answers, scope));
  const goNext = () => {
    if (!buildResponse(current.question, answers, scope)) { setValidationError(questionError(current.question)); return; }
    setValidationError("");
    if (safeIndex === steps.length - 1) setPhase("complete"); else setCurrentIndex(safeIndex + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const completeSection = () => {
    const incomplete = firstIncomplete();
    if (incomplete >= 0) { setCurrentIndex(incomplete); setValidationError("Please complete this unanswered question before marking the section complete."); setPhase("questions"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setPhase("move");
  };
  if (phase === "complete") return <FlowCard title="Have you completed this section?" description={`Confirm that your ${displayTitle} responses are complete.`}><button className="primary-action" onClick={completeSection}>Yes, complete this section</button><button onClick={() => { const incomplete = firstIncomplete(); setCurrentIndex(incomplete >= 0 ? incomplete : safeIndex); setPhase("questions"); }}>No, continue answering</button></FlowCard>;
  if (phase === "move") return <FlowCard title="Would you like to move to another section?" description="Your completed responses will remain saved in this browser session."><button className="primary-action" onClick={onMoveSections}>Yes, move to another section</button><button onClick={onFinish}>No, finish questionnaire</button></FlowCard>;
  const section = questionnaire.sections[current.sectionIndex];
  const sectionStart = steps.findIndex((step) => step.sectionNumber === current.sectionNumber);
  return <><section className="questionnaire-intro compact-intro"><div className="page-heading"><p>Section {sectionCode}</p><h2>{displayTitle}</h2><span>{questionnaire.introduction}</span></div><div className="instruction-box"><strong>Assessment scope</strong><p>{questionnaire.note}</p></div></section><div className="toolbar"><div><span className="status-dot" /> Responses are saved in this browser session</div><strong>Question {safeIndex + 1} of {steps.length}</strong></div><section className="section progressive-section"><div className="section-title"><span>{section.number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{section.number}. {section.title}</h2></div></div><QuestionCard question={current.question} answers={answers} setAnswer={setAnswer} scope={scope} stressor={current.stressor} />{validationError && <p className="validation-error" role="alert">{validationError}</p>}<div className="question-navigation"><button disabled={safeIndex === 0} onClick={() => { setValidationError(""); if (safeIndex > 0) setCurrentIndex(safeIndex - 1); }}>← Previous</button><span>{safeIndex - sectionStart + 1} of {section.questions.length} in this stressor</span><button className="primary-action" onClick={goNext}>{safeIndex === steps.length - 1 ? "Complete section →" : "Next →"}</button></div></section></>;
}

export default function QuestionnaireForm({ questionnaires }: { questionnaires: QuestionnaireCollection }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [view, setView] = useState<View>("home");
  const [selectedAsset, setSelectedAsset] = useState<GenerationAsset | null>(null);
  const [questionIndexes, setQuestionIndexes] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>("questions");
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [titleLead, titleTail = ""] = questionnaires.title.split("Power Sector");

  useEffect(() => { try { const stored = sessionStorage.getItem(STORAGE_KEY); if (stored) { const state = JSON.parse(stored); if (state.answers && typeof state.answers === "object") setAnswers(state.answers); if (state.questionIndexes && typeof state.questionIndexes === "object") setQuestionIndexes(state.questionIndexes); if (["home", "generation", "transmission", "distribution", "final"].includes(state.view)) setView(state.view); if (["solar", "wind", "thermal"].includes(state.selectedAsset)) setSelectedAsset(state.selectedAsset); } } catch { /* Ignore unavailable or malformed storage. */ } setHydrated(true); }, []);
  useEffect(() => { if (!hydrated || view === "submitted") return; sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, questionIndexes, view, selectedAsset })); }, [answers, hydrated, questionIndexes, selectedAsset, view]);

  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const activeQuestionnaire = view === "generation" && selectedAsset ? questionnaires.generation[selectedAsset] : view === "transmission" ? questionnaires.transmission : view === "distribution" ? questionnaires.distribution : null;
  const activeScope: QuestionnaireScope | null = view === "generation" && selectedAsset ? selectedAsset : view === "transmission" ? "transmission" : view === "distribution" ? "distribution" : null;
  const activeSteps = activeQuestionnaire?.sections.flatMap((section, sectionIndex) => section.questions.map((question) => ({ question, section, sectionIndex }))) ?? [];
  const currentIndex = activeScope ? questionIndexes[activeScope] ?? 0 : 0;
  const activeSectionIndex = activeSteps[Math.min(currentIndex, Math.max(activeSteps.length - 1, 0))]?.sectionIndex ?? 0;
  const openView = (nextView: View) => { setView(nextView); setPhase("questions"); setSubmitError(""); if (nextView === "generation") setSelectedAsset(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectAsset = (asset: GenerationAsset) => { setSelectedAsset(asset); setView("generation"); setPhase("questions"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectStressor = (sectionIndex: number) => { if (!activeScope || !activeQuestionnaire) return; const index = activeQuestionnaire.sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.questions.length, 0); setQuestionIndexes((current) => ({ ...current, [activeScope]: index })); setPhase("questions"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const allQuestionnaires: Array<[QuestionnaireScope, Questionnaire]> = [["solar", questionnaires.generation.solar], ["wind", questionnaires.generation.wind], ["thermal", questionnaires.generation.thermal], ["transmission", questionnaires.transmission], ["distribution", questionnaires.distribution]];
  const responses: SubmissionResponse[] = allQuestionnaires.flatMap(([scope, questionnaire]) => questionnaire.sections.flatMap((section) => section.questions.flatMap((question) => { const response = buildResponse(question, answers, scope); return response ? [{ scope, questionNumber: question.number, response }] : []; })));

  const submit = async () => {
    if (!responses.length) { setSubmitError("Complete at least one questionnaire section before submitting."); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const respondent = Object.fromEntries(questionnaires.distribution.respondentFields.map((label) => [label, answers[key("global", "respondent", label.toLowerCase())] ?? ""]));
      const response = await fetch("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses, comments: answers[key("global", "comments")] ?? "", respondent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The response could not be stored.");
      setSubmissionId(result.submissionId); setView("submitted"); sessionStorage.removeItem(STORAGE_KEY); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "The response could not be stored. Please try again."); } finally { setSubmitting(false); }
  };

  const renderNavigation = () => <aside className="app-sidebar"><div className="side-heading"><p>Questionnaire</p><strong>Power Sector Assets</strong></div><nav className="major-nav" aria-label="Questionnaire sections"><button className={view === "generation" ? "active" : ""} onClick={() => openView("generation")}><span>A</span>Generation Assets</button><div className="asset-subnav">{generationAssets.map((asset) => <button className={selectedAsset === asset.id && view === "generation" ? "selected" : ""} onClick={() => selectAsset(asset.id)} key={asset.id}><span aria-hidden="true">{asset.icon}</span>{asset.title}</button>)}</div><button className={view === "transmission" ? "active" : ""} onClick={() => openView("transmission")}><span>B</span>Transmission System</button><button className={view === "distribution" ? "active" : ""} onClick={() => openView("distribution")}><span>C</span>Distribution System</button></nav>{activeQuestionnaire && <nav className="stressor-nav" aria-label="Climate stressor sections"><p>Climate stressors</p>{activeQuestionnaire.sections.map((section, index) => <button className={index === activeSectionIndex ? "active" : ""} onClick={() => selectStressor(index)} key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}</nav>}</aside>;

  const finalContent = view === "submitted" ? <section className="completion-page"><div className="completion-mark">✓</div><p className="eyebrow-light">Submission received</p><h2>Thank you for completing the questionnaire.</h2><p>Your response has been stored securely.</p><small>Submission ID: {submissionId}</small><p className="confidentiality">Responses are recorded confidentially and used only for aggregate risk-profile analysis.</p></section> : <section className="completion-page"><p className="eyebrow-light">Final step</p><h2>You have completed the questionnaire.</h2><p>Review or add the optional final details below, then submit your response.</p><div className="final-details"><label>{questionnaires.distribution.commentsLabel}<textarea rows={4} value={answers[key("global", "comments")] ?? ""} onChange={(event) => setAnswer(key("global", "comments"), event.target.value)} /></label><div className="details-grid">{questionnaires.distribution.respondentFields.map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[key("global", "respondent", label.toLowerCase())] ?? ""} onChange={(event) => setAnswer(key("global", "respondent", label.toLowerCase()), event.target.value)} /></label>)}</div></div>{submitError && <p className="validation-error" role="alert">{submitError}</p>}<div className="final-actions"><button onClick={() => openView("home")}>← Back to sections</button><button className="primary-action submit-response" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit Response"}</button></div><p className="confidentiality">Responses are recorded confidentially and used only for aggregate risk-profile analysis.</p></section>;

  return <main className="page-shell"><div className="app-frame"><header className="hero"><div className="hero-inner"><div><p className="eyebrow">Climate resilience</p><h1>{titleLead}<span className="title-accent">Power Sector</span>{titleTail}</h1><p>{questionnaires.distribution.introduction}</p></div><div className="hero-mark" aria-hidden="true"><small>Resilient power systems for a stronger tomorrow</small></div></div></header>{view === "final" || view === "submitted" ? finalContent : view === "home" ? <section className="front-page"><div className="front-heading"><p>Questionnaire</p><h2>Select an assessment section</h2><span>Choose the power-sector asset group you would like to assess.</span></div><div className="section-card-grid"><button className="section-card" onClick={() => openView("generation")}><span className="section-letter">A</span><div><small>Section A</small><strong>Generation Assets</strong></div><span className="card-arrow">→</span></button><button className="section-card" onClick={() => openView("transmission")}><span className="section-letter">B</span><div><small>Section B</small><strong>Transmission System</strong></div><span className="card-arrow">→</span></button><button className="section-card" onClick={() => openView("distribution")}><span className="section-letter">C</span><div><small>Section C</small><strong>Distribution System</strong></div><span className="card-arrow">→</span></button></div></section> : <div className="workspace">{renderNavigation()}<section className="content"><button className="back-link" onClick={() => openView("home")}><span>←</span> Back to sections</button>{view === "generation" && !selectedAsset && <section className="asset-page"><div className="page-heading"><p>Section A</p><h2>Generation Assets</h2><span>Select one generation asset to begin its questionnaire.</span></div><div className="asset-card-grid">{generationAssets.map((asset) => <button className="asset-card" onClick={() => selectAsset(asset.id)} key={asset.id}><span className="asset-icon">{asset.icon}</span><div><strong>{asset.title}</strong><small>Generation asset</small></div><span className="selection-mark">→</span></button>)}</div></section>}{activeQuestionnaire && activeScope && <QuestionnaireBody questionnaire={activeQuestionnaire} sectionCode={activeScope === "transmission" ? "B" : activeScope === "distribution" ? "C" : "A"} displayTitle={activeScope === "transmission" ? "Transmission System" : activeScope === "distribution" ? "Distribution System" : generationAssets.find((asset) => asset.id === activeScope)?.title ?? "Generation Assets"} scope={activeScope} answers={answers} setAnswer={setAnswer} currentIndex={currentIndex} setCurrentIndex={(index) => setQuestionIndexes((current) => ({ ...current, [activeScope]: index }))} phase={phase} setPhase={setPhase} onMoveSections={() => openView("home")} onFinish={() => { setView("final"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}</section></div>}</div></main>;
}
