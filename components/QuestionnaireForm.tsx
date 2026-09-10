"use client";

import { useEffect, useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire, QuestionnaireCollection } from "@/lib/types";
import type { QuestionnaireScope, StructuredResponse, SubmissionResponse } from "@/lib/submissions";

type Answers = Record<string, string>;
type View = "home" | "generation" | "transmission" | "distribution" | "final" | "submitted";
type GenerationAsset = "solar" | "wind" | "thermal";
type Phase = "questions" | "complete" | "move";

const STORAGE_KEY = "climate-questionnaire-progress-v4";
const GENERAL_INTRODUCTION = "Please answer the following questions based on your observations and experience in the power sector. Your responses will help assess how climate-related stresses affect the power sector and identify appropriate measures to strengthen its resilience.";
const key = (...parts: string[]) => parts.join("__");

const generationAssets: Array<{ id: GenerationAsset; title: string; description: string }> = [
  { id: "solar", title: "Solar Power Plant", description: "Solar photovoltaic generation assets" },
  { id: "wind", title: "Wind Power Plant", description: "Onshore and offshore wind generation assets" },
  { id: "thermal", title: "Thermal Power Plant", description: "Conventional thermal generation assets" },
];

type IllustrationKind = "generation" | "transmission" | "distribution" | GenerationAsset;

function AssetIllustration({ kind }: { kind: IllustrationKind }) {
  if (kind === "generation") return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <circle className="sun" cx="45" cy="32" r="17" /><g className="sun-rays"><path d="M45 5v10M45 49v10M18 32h10M62 32h10M26 13l7 7M57 44l7 7M26 51l7-7M57 20l7-7" /></g>
    <path className="ground" d="M15 108h270" /><path className="panel" d="m20 64 63-7 9 38-74 4Z" /><path className="detail" d="m37 62-5 35M57 60l-5 35M77 58l-5 35M22 77l65-6M19 89l71-7M54 98l-4 10M74 96l5 12" />
    <path className="tower-fill" d="M218 101c13-20 14-36 6-59h27c-8 23-7 39 6 59Z" /><path className="smoke" d="M229 38c-2-13 9-17 18-13 4-13 22-15 27-3 18-3 20 18 4 22h-48" />
    <path className="turbine" d="M142 107V50M142 50l-4-33M142 50l31 12M142 50l-24 21" /><circle className="hub" cx="142" cy="50" r="5" />
  </svg>;
  if (kind === "transmission") return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <path className="hills" d="M7 108c28-29 54-22 77-4 30-32 62-34 92 0 30-25 66-20 116 4Z" /><g className="grid-lines"><path d="M20 35c44 26 85 27 127 5 43-22 84-19 134 11M18 50c46 25 88 25 129 4 43-22 85-17 136 11" /></g>
    <g className="pylon"><path d="M90 108 117 16l27 92M102 69h30M96 87h42M109 43h17M107 43l-18 12M128 43l18 12M113 28h9M117 16v92M103 108h39" /></g>
    <g className="pylon small"><path d="M205 108 220 54l16 54M212 81h17M208 95h24M215 68h10M214 68l-11 8M226 68l11 8M220 54v54M211 108h27" /></g>
  </svg>;
  if (kind === "distribution") return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <path className="city" d="M125 106V82h19V66h22v40m8 0V76h24v30m9 0V87h17v19" /><path className="ground" d="M12 108h276" />
    <g className="distribution-lines"><path d="M42 36v72M27 47h30M39 47c36 28 72 27 110 1M147 40v68M132 51h30M149 51c35 25 67 23 103 2M251 58v50M237 68h28" /></g>
    <path className="house" d="m76 82 20-15 21 15v26H76Z" /><path className="roof" d="m71 84 25-20 26 20M87 108V91h18v17" />
    <circle className="tree" cx="264" cy="88" r="16" /><path className="tree-trunk" d="M264 95v13" />
  </svg>;
  if (kind === "solar") return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <circle className="sun" cx="245" cy="27" r="18" /><g className="sun-rays"><path d="M245 2v10M245 42v10M220 27h10M260 27h10M227 9l7 7M256 38l7 7M227 45l7-7M256 16l7-7" /></g><path className="ground" d="M12 108h276" />
    <path className="panel" d="m29 47 80-8 12 47-95 7ZM143 55l80-8 12 43-94 7Z" /><path className="detail" d="M49 45 43 91M72 43l-6 46M95 41l-6 46M31 62l84-8M28 78l91-9M162 53l-6 42M185 51l-6 42M208 49l-6 42M146 69l83-8M143 84l89-8M70 91l-5 17M174 94l-5 14" />
  </svg>;
  if (kind === "wind") return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <path className="hills" d="M8 108c42-34 82-30 116-2 43-39 92-37 168 2Z" /><g className="turbine"><path d="M91 108V47M91 47l-5-38M91 47l36 14M91 47 62 84M201 108V58M201 58l-4-30M201 58l29 11M201 58l-22 20" /></g><circle className="hub" cx="91" cy="47" r="6" /><circle className="hub" cx="201" cy="58" r="5" />
  </svg>;
  return <svg className="asset-illustration" viewBox="0 0 300 128" aria-hidden="true">
    <path className="ground" d="M12 108h276" /><path className="factory" d="M25 108V71l48-21v58m0 0V78l45-18v48M44 108V88h13v20M91 108V89h13v19" /><path className="tower-fill" d="M150 105c15-22 17-45 7-78h34c-10 33-8 56 7 78ZM211 105c12-18 13-37 6-64h29c-8 27-6 46 6 64Z" /><path className="smoke" d="M165 21c-4-15 8-22 20-17 6-12 24-10 25 5 19-2 22 19 5 24h-47M224 36c1-12 12-16 21-10 7-9 22-4 21 9" />
  </svg>;
}

type FieldProps = {
  question: Question;
  answers: Answers;
  setAnswer: (name: string, value: string) => void;
  scope: string;
};

function ChoiceField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "choice") return null;
  const name = key(scope, question.number, question.text);
  return <div className="choice-grid">{question.options.map((option) => {
    const id = key(name, option);
    return <div className={answers[name] === option ? "choice selected" : "choice"} key={option}>
      <label htmlFor={id}>
        <input id={id} type="radio" name={name} value={option} checked={answers[name] === option} onChange={(event) => setAnswer(name, event.target.value)} />
        <span>{option}</span>
      </label>
      {option.startsWith("Other") && answers[name] === option && <input className="other-input" aria-label={`${question.number} other response`} placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(event) => setAnswer(key(name, "other"), event.target.value)} />}
    </div>;
  })}</div>;
}

function MatrixField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "matrix") return null;
  const q = question as MatrixQuestion;
  return <div className="table-wrap"><table><thead><tr><th>{q.firstColumn}</th><th>Unit</th><th>Response (select one)</th></tr></thead><tbody>{q.rows.map((row) => {
    const name = key(scope, q.number, row.id);
    return <tr key={row.id}><th scope="row">{row.label}</th><td>{row.unit}</td><td>
      <select aria-label={`${q.number} ${row.label}`} value={answers[name] ?? ""} onChange={(event) => setAnswer(name, event.target.value)}>
        <option value="">Select a response</option>{q.options.map((option) => <option key={option}>{option}</option>)}
      </select>
      {answers[name]?.startsWith("Other") && <input className="other-input" placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(event) => setAnswer(key(name, "other"), event.target.value)} />}
    </td></tr>;
  })}</tbody></table></div>;
}

function MeasuresField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "measures") return null;
  const q = question as MeasuresQuestion;
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead><tbody>{q.rows.map((row) => {
    const base = key(scope, q.number, row.id);
    return <tr key={row.id}>
      <td>{row.serial}</td>
      <th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(event) => setAnswer(key(base, "measure"), event.target.value)} /> : row.measure}</th>
      <td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(event) => setAnswer(key(base, "minimum"), event.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(event) => setAnswer(key(base, "maximum"), event.target.value)} /></div></td>
      <td className="unit">{q.unit}</td>
      <td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(event) => setAnswer(key(base, "outcome"), event.target.value)} /><span>%</span></div></td>
    </tr>;
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
    const rows = question.rows.map((row) => {
      const name = key(scope, question.number, row.id);
      return { id: row.id, selection: answers[name] ?? "", other: answers[key(name, "other")]?.trim() };
    });
    return rows.some((row) => !row.selection || (row.selection.startsWith("Other") && !row.other)) ? null : { kind: "matrix", rows };
  }

  const rows = question.rows.map((row) => {
    const base = key(scope, question.number, row.id);
    return { id: row.id, measure: answers[key(base, "measure")]?.trim(), minimum: answers[key(base, "minimum")]?.trim(), maximum: answers[key(base, "maximum")]?.trim(), outcome: answers[key(base, "outcome")]?.trim() };
  });
  const providedRows = rows.filter((answer) => [answer.measure, answer.minimum, answer.maximum, answer.outcome].some(Boolean));
  return providedRows.length ? { kind: "measures", rows: providedRows } : null;
}

function questionError(question: Question) {
  if (question.type === "choice") return `Question ${question.number}: select an answer and specify it when Other is selected.`;
  if (question.type === "matrix") return `Question ${question.number}: select one response for every row.`;
  return `Question ${question.number}: complete the cost and outcome fields for each listed measure. Optional Other rows may remain blank.`;
}

function QuestionCard({ question, answers, setAnswer, scope, stressor }: FieldProps & { stressor: string }) {
  return <article className="question stress-question-card">
    <div className="question-kicker">Climate stress · {stressor}{question.type === "measures" && <span className="optional-badge">Optional</span>}</div>
    <div className="question-head"><span>{question.number}</span><div>
      <h3>{question.text}</h3>
      {question.type === "choice" && question.unit && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}
    </div></div>
    {question.type === "choice" && <ChoiceField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
    {question.type === "matrix" && <MatrixField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
    {question.type === "measures" && <MeasuresField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
  </article>;
}

function FlowCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="flow-card"><p className="eyebrow-light">Questionnaire progress</p><h2>{title}</h2><p>{description}</p><div className="flow-actions">{children}</div></section>;
}

type QuestionnaireBodyProps = {
  questionnaire: Questionnaire;
  sectionCode: string;
  displayTitle: string;
  scope: QuestionnaireScope;
  answers: Answers;
  setAnswer: (name: string, value: string) => void;
  stressIndex: number;
  setStressIndex: (index: number) => void;
  phase: Phase;
  setPhase: (phase: Phase) => void;
  onMoveSections: () => void;
  onFinish: () => void;
};

function QuestionnaireBody({ questionnaire, sectionCode, displayTitle, scope, answers, setAnswer, stressIndex, setStressIndex, phase, setPhase, onMoveSections, onFinish }: QuestionnaireBodyProps) {
  const safeIndex = Math.min(stressIndex, questionnaire.sections.length - 1);
  const currentSection = questionnaire.sections[safeIndex];
  const [validationError, setValidationError] = useState("");

  const validateStress = () => {
    for (const question of currentSection.questions) {
      if (question.type !== "measures" && !buildResponse(question, answers, scope)) return questionError(question);
    }
    return "";
  };

  const nextStress = () => {
    const error = validateStress();
    if (error) { setValidationError(error); return; }
    setValidationError("");
    if (safeIndex === questionnaire.sections.length - 1) setPhase("complete");
    else setStressIndex(safeIndex + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (phase === "complete") return <FlowCard title="Have you completed this section?" description={`Confirm that your ${displayTitle} responses are complete.`}>
    <button className="primary-action" onClick={() => setPhase("move")}>Yes, complete this section</button>
    <button onClick={() => { setStressIndex(safeIndex); setPhase("questions"); }}>No, continue answering</button>
  </FlowCard>;

  if (phase === "move") return <FlowCard title="Would you like to move to another section?" description="All responses entered so far will remain saved in this browser session.">
    <button className="primary-action" onClick={onMoveSections}>Yes, move to another section</button>
    <button onClick={onFinish}>No, finish questionnaire</button>
  </FlowCard>;

  return <>
    <section className="questionnaire-intro compact-intro">
      <div className="page-heading"><p>Section {sectionCode}</p><h2>{displayTitle}</h2></div>
      <div className="instruction-box"><strong>Assessment scope</strong><p>{questionnaire.note}</p></div>
    </section>
    <div className="toolbar"><div><span className="status-dot" /> Responses are saved in this browser session</div><strong>Climate stress {safeIndex + 1} of {questionnaire.sections.length}</strong></div>
    <section className="section stress-section">
      <div className="section-title"><span>{currentSection.number.padStart(2, "0")}</span><div><p>Climate stress</p><h2>{currentSection.number}. {currentSection.title}</h2></div></div>
      <div className="question-list">{currentSection.questions.map((question, index) => <QuestionCard question={question} answers={answers} setAnswer={setAnswer} scope={scope} stressor={currentSection.title} key={`${question.number}-${question.text}-${index}`} />)}</div>
      {validationError && <p className="validation-error" role="alert">{validationError}</p>}
      <div className="question-navigation stress-navigation">
        <button disabled={safeIndex === 0} onClick={() => { setValidationError(""); if (safeIndex > 0) setStressIndex(safeIndex - 1); }}>← Previous Stress</button>
        <span>{currentSection.questions.length} questions in this climate stress</span>
        <button className="primary-action" onClick={nextStress}>{safeIndex === questionnaire.sections.length - 1 ? "Complete section →" : "Next Stress →"}</button>
      </div>
    </section>
  </>;
}

export default function QuestionnaireForm({ questionnaires }: { questionnaires: QuestionnaireCollection }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [view, setView] = useState<View>("home");
  const [selectedAsset, setSelectedAsset] = useState<GenerationAsset | null>(null);
  const [stressIndexes, setStressIndexes] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>("questions");
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [titleLead, titleTail = ""] = questionnaires.title.split("Power Sector");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        if (state.answers && typeof state.answers === "object") setAnswers(state.answers);
        if (state.stressIndexes && typeof state.stressIndexes === "object") setStressIndexes(state.stressIndexes);
        if (["home", "generation", "transmission", "distribution", "final"].includes(state.view)) setView(state.view);
        if (["solar", "wind", "thermal"].includes(state.selectedAsset)) setSelectedAsset(state.selectedAsset);
      }
    } catch { /* Ignore malformed or unavailable browser-session storage. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || view === "submitted") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stressIndexes, view, selectedAsset }));
  }, [answers, hydrated, selectedAsset, stressIndexes, view]);

  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const activeQuestionnaire = view === "generation" && selectedAsset ? questionnaires.generation[selectedAsset] : view === "transmission" ? questionnaires.transmission : view === "distribution" ? questionnaires.distribution : null;
  const activeScope: QuestionnaireScope | null = view === "generation" && selectedAsset ? selectedAsset : view === "transmission" ? "transmission" : view === "distribution" ? "distribution" : null;
  const activeTitle = activeScope === "transmission" ? "Transmission System" : activeScope === "distribution" ? "Distribution System" : generationAssets.find((asset) => asset.id === activeScope)?.title ?? "Generation Assets";
  const activeSectionCode = activeScope === "transmission" ? "B" : activeScope === "distribution" ? "C" : "A";
  const currentStressIndex = activeScope ? stressIndexes[activeScope] ?? 0 : 0;

  const openView = (nextView: View) => {
    setView(nextView);
    setPhase("questions");
    setSubmitError("");
    if (nextView === "generation") setSelectedAsset(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectAsset = (asset: GenerationAsset) => {
    setSelectedAsset(asset);
    setView("generation");
    setPhase("questions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allQuestionnaires: Array<[QuestionnaireScope, Questionnaire]> = [
    ["solar", questionnaires.generation.solar], ["wind", questionnaires.generation.wind], ["thermal", questionnaires.generation.thermal],
    ["transmission", questionnaires.transmission], ["distribution", questionnaires.distribution],
  ];
  const responses: SubmissionResponse[] = allQuestionnaires.flatMap(([scope, questionnaire]) => questionnaire.sections.flatMap((section) => section.questions.flatMap((question) => {
    const response = buildResponse(question, answers, scope);
    return response ? [{ scope, questionNumber: question.number, questionText: question.text, response }] : [];
  })));

  const submit = async () => {
    if (!responses.length) { setSubmitError("Complete at least one questionnaire section before submitting."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const respondent = Object.fromEntries(questionnaires.distribution.respondentFields.map((label) => [label, answers[key("global", "respondent", label.toLowerCase())] ?? ""]));
      const response = await fetch("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses, comments: answers[key("global", "comments")] ?? "", respondent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The response could not be stored.");
      setSubmissionId(result.submissionId);
      setView("submitted");
      sessionStorage.removeItem(STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The response could not be stored. Please try again.");
    } finally { setSubmitting(false); }
  };

  const renderActiveSidebar = () => activeQuestionnaire && activeScope ? <aside className="app-sidebar focused-sidebar">
    <button className="sidebar-back" onClick={() => openView("home")}>← Select Power System</button>
    <div className="side-heading"><p>Selected assessment</p><strong>{activeTitle}</strong></div>
    <nav className="stressor-nav focused-stressors" aria-label={`${activeTitle} climate stresses`}>
      <p>Climate stresses</p>
      {activeQuestionnaire.sections.map((section, index) => <button className={index === currentStressIndex ? "active" : ""} onClick={() => { setStressIndexes((current) => ({ ...current, [activeScope]: index })); setPhase("questions"); window.scrollTo({ top: 0, behavior: "smooth" }); }} key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}
    </nav>
  </aside> : null;

  const finalContent = view === "submitted" ? <section className="completion-page"><div className="completion-mark">✓</div><p className="eyebrow-light">Submission received</p><h2>Thank you for completing the questionnaire.</h2><p>Your response has been stored securely.</p><small>Submission ID: {submissionId}</small><p className="confidentiality">Responses are recorded confidentially and used only for aggregate risk-profile analysis.</p></section> : <section className="completion-page"><p className="eyebrow-light">Final step</p><h2>You have completed the questionnaire.</h2><p>Review or add the optional final details below, then submit your response.</p><div className="final-details"><label>{questionnaires.distribution.commentsLabel}<textarea rows={4} value={answers[key("global", "comments")] ?? ""} onChange={(event) => setAnswer(key("global", "comments"), event.target.value)} /></label><div className="details-grid">{questionnaires.distribution.respondentFields.map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[key("global", "respondent", label.toLowerCase())] ?? ""} onChange={(event) => setAnswer(key("global", "respondent", label.toLowerCase()), event.target.value)} /></label>)}</div></div>{submitError && <p className="validation-error" role="alert">{submitError}</p>}<div className="final-actions"><button onClick={() => openView("home")}>← Back to Power System selection</button><button className="primary-action submit-response" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit Response"}</button></div><p className="confidentiality">Responses are recorded confidentially and used only for aggregate risk-profile analysis.</p></section>;

  return <main className="page-shell"><div className="app-frame">
    <header className="hero"><div className="hero-inner header-only"><div><h1>{titleLead}<span className="title-accent">Power Sector</span>{titleTail}</h1><p>{GENERAL_INTRODUCTION}</p></div></div></header>
    {view === "final" || view === "submitted" ? finalContent : view === "home" ? <section className="front-page">
      <div className="front-heading"><p>Questionnaire</p><h2>Select Power System Asset</h2><span>Please select the relevant power system asset to continue with the questionnaire.</span></div>
      <div className="section-card-grid">
        <button className="section-card generation-card" onClick={() => openView("generation")}><AssetIllustration kind="generation" /><div className="card-copy"><strong>Generation</strong><p>Solar, Wind and Thermal power generation assets</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card transmission-card" onClick={() => openView("transmission")}><AssetIllustration kind="transmission" /><div className="card-copy"><strong>Transmission</strong><p>High-voltage transmission system assets</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card distribution-card" onClick={() => openView("distribution")}><AssetIllustration kind="distribution" /><div className="card-copy"><strong>Distribution</strong><p>Distribution system assets and networks</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
      </div>
    </section> : view === "generation" && !selectedAsset ? <section className="front-page asset-selection-page">
      <button className="back-link" onClick={() => openView("home")}><span>←</span> Back to Power System selection</button>
      <div className="front-heading"><p>Generation</p><h2>Select Generation Asset</h2><span>Select one generation asset to open its climate-risk questionnaire.</span></div>
      <div className="asset-card-grid">{generationAssets.map((asset) => <button className={`asset-card ${asset.id}-card`} onClick={() => selectAsset(asset.id)} key={asset.id}><AssetIllustration kind={asset.id} /><div className="card-copy"><strong>{asset.title}</strong><small>{asset.description}</small></div><span className="selection-mark" aria-hidden="true">→</span></button>)}</div>
    </section> : <div className="workspace">{renderActiveSidebar()}<section className="content"><button className="back-link mobile-system-back" onClick={() => openView("home")}><span>←</span> Back to Power System selection</button>{activeQuestionnaire && activeScope && <QuestionnaireBody questionnaire={activeQuestionnaire} sectionCode={activeSectionCode} displayTitle={activeTitle} scope={activeScope} answers={answers} setAnswer={setAnswer} stressIndex={currentStressIndex} setStressIndex={(index) => setStressIndexes((current) => ({ ...current, [activeScope]: index }))} phase={phase} setPhase={setPhase} onMoveSections={() => openView("home")} onFinish={() => { setView("final"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}</section></div>}
  </div></main>;
}
