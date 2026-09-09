"use client";

import { useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire, QuestionnaireCollection } from "@/lib/types";

type Answers = Record<string, string>;

const key = (...parts: string[]) => parts.join("__");

function ChoiceField({ question, answers, setAnswer, scope }: FieldProps) {
  const name = key(scope, question.number, question.text);
  if (question.type !== "choice") return null;
  return (
    <div className="choice-grid">
      {question.options.map((option) => {
        const id = key(name, option);
        return (
          <div className={answers[name] === option ? "choice selected" : "choice"} key={option}>
            <label htmlFor={id}>
              <input id={id} type="radio" name={name} value={option} checked={answers[name] === option}
                onChange={(event) => setAnswer(name, event.target.value)} />
              <span>{option}</span>
            </label>
            {option.startsWith("Other") && answers[name] === option && (
              <input className="other-input" aria-label={`${question.number} other response`} placeholder="Please specify"
                value={answers[key(name, "other")] ?? ""} onChange={(event) => setAnswer(key(name, "other"), event.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type FieldProps = { question: Question; answers: Answers; setAnswer: (name: string, value: string) => void; scope: string };

function MatrixField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "matrix") return null;
  const q = question as MatrixQuestion;
  return (
    <div className="table-wrap"><table><thead><tr><th>{q.firstColumn}</th><th>Unit</th><th>Response (select one)</th></tr></thead>
      <tbody>{q.rows.map((row) => {
        const name = key(scope, q.number, row.id);
        return <tr key={row.id}><th scope="row">{row.label}</th><td>{row.unit}</td><td>
          <select aria-label={`${q.number} ${row.label}`} value={answers[name] ?? ""} onChange={(e) => setAnswer(name, e.target.value)}>
            <option value="">Select a response</option>{q.options.map((option) => <option key={option}>{option}</option>)}
          </select>
          {answers[name]?.startsWith("Other") && <input className="other-input" placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(e) => setAnswer(key(name, "other"), e.target.value)} />}
        </td></tr>;
      })}</tbody></table></div>
  );
}

function MeasuresField({ question, answers, setAnswer, scope }: FieldProps) {
  if (question.type !== "measures") return null;
  const q = question as MeasuresQuestion;
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead>
    <tbody>{q.rows.map((row) => { const base = key(scope, q.number, row.id); return <tr key={row.id}>
      <td>{row.serial}</td><th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(e) => setAnswer(key(base, "measure"), e.target.value)} /> : row.measure}</th>
      <td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(e) => setAnswer(key(base, "minimum"), e.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(e) => setAnswer(key(base, "maximum"), e.target.value)} /></div></td>
      <td className="unit">{q.unit}</td><td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(e) => setAnswer(key(base, "outcome"), e.target.value)} /><span>%</span></div></td>
    </tr>})}</tbody></table></div>;
}

function QuestionCard({ question, answers, setAnswer, scope }: FieldProps) {
  return <article className="question">
    <div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div>
    {question.type === "choice" && <ChoiceField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
    {question.type === "matrix" && <MatrixField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
    {question.type === "measures" && <MeasuresField question={question} answers={answers} setAnswer={setAnswer} scope={scope} />}
  </article>;
}

type View = "home" | "generation" | "transmission" | "distribution";
type GenerationAsset = "solar" | "wind" | "thermal";

const generationAssets: Array<{ id: GenerationAsset; icon: string; title: string }> = [
  { id: "solar", icon: "☀", title: "Solar Power Plant" },
  { id: "wind", icon: "⚡", title: "Wind Power Plant" },
  { id: "thermal", icon: "🔥", title: "Thermal Power Plant" },
];

type QuestionnaireBodyProps = {
  questionnaire: Questionnaire;
  sectionCode: string;
  displayTitle: string;
  scope: string;
  answers: Answers;
  setAnswer: (name: string, value: string) => void;
  activeSection: number;
  setActiveSection: (index: number) => void;
};

function QuestionnaireBody({ questionnaire, sectionCode, displayTitle, scope, answers, setAnswer, activeSection, setActiveSection }: QuestionnaireBodyProps) {
  const openSection = (index: number) => {
    setActiveSection(index);
    document.getElementById(`${scope}-section-${questionnaire.sections[index].number}`)?.scrollIntoView({ behavior: "smooth" });
  };
  const answered = Object.entries(answers).filter(([name, value]) => name.startsWith(`${scope}__`) && value).length;

  return <>
    <section className="questionnaire-intro">
      <div className="page-heading"><p>Section {sectionCode}</p><h2>{displayTitle}</h2><span>{questionnaire.introduction}</span></div>
      <div className="instruction-box"><strong>Assessment scope</strong><p>{questionnaire.note}</p></div>
    </section>
    <div className="toolbar"><div><span className="status-dot" /> Responses are saved in this browser session</div></div>
    {questionnaire.sections.map((section, index) => <section className="section" id={`${scope}-section-${section.number}`} key={section.number} onMouseEnter={() => setActiveSection(index)}>
      <div className="section-title"><span>{section.number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{section.number}. {section.title}</h2></div></div>
      <div className="question-list">{section.questions.map((question, questionIndex) => <QuestionCard question={question} answers={answers} setAnswer={setAnswer} scope={scope} key={`${question.number}-${questionIndex}`} />)}</div>
      <div className="question-navigation"><button disabled={index === 0} onClick={() => openSection(index - 1)}>← Previous</button><button className="primary-action" onClick={() => index === questionnaire.sections.length - 1 ? document.getElementById(`${scope}-final-details`)?.scrollIntoView({ behavior: "smooth" }) : openSection(index + 1)}>Next →</button></div>
    </section>)}
    <section className="section final" id={`${scope}-final-details`}>
      <div className="section-title"><span>08</span><div><p>Final details</p><h2>{questionnaire.commentsLabel.replace(" (Optional):", "")} &amp; respondent details</h2></div></div>
      <article className="question"><label className="block-label" htmlFor={`${scope}-comments`}>{questionnaire.commentsLabel}</label><textarea id={`${scope}-comments`} rows={5} value={answers[key(scope, "comments")] ?? ""} onChange={(event) => setAnswer(key(scope, "comments"), event.target.value)} /></article>
      <article className="question"><h3>{questionnaire.respondentTitle}</h3><p className="hint">{questionnaire.respondentInstruction}</p><div className="details-grid">{questionnaire.respondentFields.map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[key(scope, "respondent", label.toLowerCase())] ?? ""} onChange={(event) => setAnswer(key(scope, "respondent", label.toLowerCase()), event.target.value)} /></label>)}</div></article>
      <div className="finish"><div><strong>{answered}</strong><span> responses entered</span></div><button onClick={() => openSection(questionnaire.sections.length - 1)}>← Previous</button></div>
    </section>
  </>;
}

export default function QuestionnaireForm({ questionnaires }: { questionnaires: QuestionnaireCollection }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [activeSection, setActiveSection] = useState(0);
  const [view, setView] = useState<View>("home");
  const [selectedAsset, setSelectedAsset] = useState<GenerationAsset | null>(null);
  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const [titleLead, titleTail = ""] = questionnaires.title.split("Power Sector");

  const activeQuestionnaire =
    view === "generation" && selectedAsset ? questionnaires.generation[selectedAsset] :
    view === "transmission" ? questionnaires.transmission :
    view === "distribution" ? questionnaires.distribution :
    null;
  const activeScope =
    view === "generation" && selectedAsset ? selectedAsset :
    view === "transmission" ? "transmission" :
    view === "distribution" ? "distribution" :
    null;

  const openView = (nextView: View) => {
    setView(nextView);
    setActiveSection(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectAsset = (asset: GenerationAsset) => {
    setSelectedAsset(asset);
    setView("generation");
    setActiveSection(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openActiveSection = (index: number) => {
    if (!activeQuestionnaire || !activeScope) return;
    setActiveSection(index);
    document.getElementById(`${activeScope}-section-${activeQuestionnaire.sections[index].number}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMajorNavigation = () => (
    <aside className="app-sidebar">
      <div className="side-heading"><p>Questionnaire</p><strong>Power Sector Assets</strong></div>
      <nav className="major-nav" aria-label="Questionnaire sections">
        <button className={view === "generation" ? "active" : ""} onClick={() => openView("generation")}><span>A</span>Generation Assets</button>
        <div className="asset-subnav">
          {generationAssets.map((asset) => <button className={selectedAsset === asset.id && view === "generation" ? "selected" : ""} onClick={() => selectAsset(asset.id)} key={asset.id}><span aria-hidden="true">{asset.icon}</span>{asset.title}</button>)}
        </div>
        <button className={view === "transmission" ? "active" : ""} onClick={() => openView("transmission")}><span>B</span>Transmission System</button>
        <button className={view === "distribution" ? "active" : ""} onClick={() => openView("distribution")}><span>C</span>Distribution System</button>
      </nav>
      {activeQuestionnaire && <nav className="stressor-nav" aria-label="Climate stressor sections">
        <p>Climate stressors</p>
        {activeQuestionnaire.sections.map((section, index) => <button className={index === activeSection ? "active" : ""} onClick={() => openActiveSection(index)} key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}
      </nav>}
    </aside>
  );

  return <main className="page-shell"><div className="app-frame">
    <header className="hero"><div className="hero-inner"><div><p className="eyebrow">Climate resilience</p><h1>{titleLead}<span className="title-accent">Power Sector</span>{titleTail}</h1><p>{questionnaires.distribution.introduction}</p></div><div className="hero-mark" aria-hidden="true"><small>Resilient power systems for a stronger tomorrow</small></div></div></header>

    {view === "home" ? <section className="front-page">
      <div className="front-heading"><p>Questionnaire</p><h2>Select an assessment section</h2><span>Choose the power-sector asset group you would like to assess.</span></div>
      <div className="section-card-grid">
        <button className="section-card" onClick={() => openView("generation")}><span className="section-letter">A</span><div><small>Section A</small><strong>Generation Assets</strong></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card" onClick={() => openView("transmission")}><span className="section-letter">B</span><div><small>Section B</small><strong>Transmission System</strong></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card" onClick={() => openView("distribution")}><span className="section-letter">C</span><div><small>Section C</small><strong>Distribution System</strong></div><span className="card-arrow" aria-hidden="true">→</span></button>
      </div>
    </section> : <div className="workspace">
      {renderMajorNavigation()}
      <section className="content">
        <button className="back-link" onClick={() => openView("home")}><span aria-hidden="true">←</span> Back to sections</button>

        {view === "generation" && <>
          <section className="asset-page">
            <div className="page-heading"><p>Section A</p><h2>Generation Assets</h2><span>Select the relevant generation asset to display its questionnaire.</span></div>
            <div className="asset-card-grid">
              {generationAssets.map((asset) => <button className={selectedAsset === asset.id ? "asset-card selected" : "asset-card"} aria-pressed={selectedAsset === asset.id} onClick={() => selectAsset(asset.id)} key={asset.id}><span className="asset-icon" aria-hidden="true">{asset.icon}</span><div><strong>{asset.title}</strong><small>Generation asset</small></div><span className="selection-mark" aria-hidden="true">{selectedAsset === asset.id ? "✓" : "→"}</span></button>)}
            </div>
          </section>
          {selectedAsset && <QuestionnaireBody questionnaire={questionnaires.generation[selectedAsset]} sectionCode="A" displayTitle={generationAssets.find((asset) => asset.id === selectedAsset)?.title ?? "Generation Assets"} scope={selectedAsset} answers={answers} setAnswer={setAnswer} activeSection={activeSection} setActiveSection={setActiveSection} />}
        </>}

        {view === "transmission" && <QuestionnaireBody questionnaire={questionnaires.transmission} sectionCode="B" displayTitle="Transmission System" scope="transmission" answers={answers} setAnswer={setAnswer} activeSection={activeSection} setActiveSection={setActiveSection} />}

        {view === "distribution" && <QuestionnaireBody questionnaire={questionnaires.distribution} sectionCode="C" displayTitle="Distribution System" scope="distribution" answers={answers} setAnswer={setAnswer} activeSection={activeSection} setActiveSection={setActiveSection} />}
      </section>
    </div>}
  </div></main>;
}

