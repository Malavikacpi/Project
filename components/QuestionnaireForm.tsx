"use client";

import { useMemo, useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire } from "@/lib/types";

type Answers = Record<string, string>;

const key = (...parts: string[]) => parts.join("__");

function ChoiceField({ question, answers, setAnswer }: FieldProps) {
  const name = key(question.number, question.text);
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

type FieldProps = { question: Question; answers: Answers; setAnswer: (name: string, value: string) => void };

function MatrixField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "matrix") return null;
  const q = question as MatrixQuestion;
  return (
    <div className="table-wrap"><table><thead><tr><th>{q.firstColumn}</th><th>Unit</th><th>Response (select one)</th></tr></thead>
      <tbody>{q.rows.map((row) => {
        const name = key(q.number, row.id);
        return <tr key={row.id}><th scope="row">{row.label}</th><td>{row.unit}</td><td>
          <select aria-label={`${q.number} ${row.label}`} value={answers[name] ?? ""} onChange={(e) => setAnswer(name, e.target.value)}>
            <option value="">Select a response</option>{q.options.map((option) => <option key={option}>{option}</option>)}
          </select>
          {answers[name]?.startsWith("Other") && <input className="other-input" placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(e) => setAnswer(key(name, "other"), e.target.value)} />}
        </td></tr>;
      })}</tbody></table></div>
  );
}

function MeasuresField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "measures") return null;
  const q = question as MeasuresQuestion;
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead>
    <tbody>{q.rows.map((row) => { const base = key(q.number, row.id); return <tr key={row.id}>
      <td>{row.serial}</td><th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(e) => setAnswer(key(base, "measure"), e.target.value)} /> : row.measure}</th>
      <td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(e) => setAnswer(key(base, "minimum"), e.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(e) => setAnswer(key(base, "maximum"), e.target.value)} /></div></td>
      <td className="unit">{q.unit}</td><td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(e) => setAnswer(key(base, "outcome"), e.target.value)} /><span>%</span></div></td>
    </tr>})}</tbody></table></div>;
}

type View = "home" | "generation" | "transmission" | "distribution";
type GenerationAsset = "solar" | "wind" | "thermal";

const generationAssets: Array<{ id: GenerationAsset; icon: string; title: string }> = [
  { id: "solar", icon: "☀", title: "Solar Power Plant" },
  { id: "wind", icon: "⚡", title: "Wind Power Plant" },
  { id: "thermal", icon: "🔥", title: "Thermal Power Plant" },
];

export default function QuestionnaireForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [activeSection, setActiveSection] = useState(0);
  const [view, setView] = useState<View>("home");
  const [selectedAsset, setSelectedAsset] = useState<GenerationAsset | null>(null);
  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const answered = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const [titleLead, titleTail = ""] = questionnaire.title.split("Power Sector");

  const openView = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDistributionSection = (index: number) => {
    setActiveSection(index);
    document.getElementById(`section-${questionnaire.sections[index].number}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMajorNavigation = () => (
    <aside className="app-sidebar">
      <div className="side-heading"><p>Questionnaire</p><strong>Power Sector Assets</strong></div>
      <nav className="major-nav" aria-label="Questionnaire sections">
        <button className={view === "generation" ? "active" : ""} onClick={() => openView("generation")}><span>A</span>Generation Assets</button>
        <div className="asset-subnav">
          {generationAssets.map((asset) => <button className={selectedAsset === asset.id && view === "generation" ? "selected" : ""} onClick={() => { setSelectedAsset(asset.id); openView("generation"); }} key={asset.id}><span aria-hidden="true">{asset.icon}</span>{asset.title}</button>)}
        </div>
        <button className={view === "transmission" ? "active" : ""} onClick={() => openView("transmission")}><span>B</span>Transmission System</button>
        <button className={view === "distribution" ? "active" : ""} onClick={() => openView("distribution")}><span>C</span>Distribution System</button>
      </nav>
      {view === "distribution" && <nav className="stressor-nav" aria-label="Distribution questionnaire sections">
        <p>Climate stressors</p>
        {questionnaire.sections.map((section, index) => <button className={index === activeSection ? "active" : ""} onClick={() => openDistributionSection(index)} key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}
      </nav>}
    </aside>
  );

  return <main>
    <header className="hero"><div className="hero-inner"><div><p className="eyebrow">Climate resilience</p><h1>{titleLead}<span className="title-accent">Power Sector</span>{titleTail}</h1><p>{questionnaire.introduction}</p></div><div className="hero-mark" aria-hidden="true"><small>Resilient power systems for a stronger tomorrow</small></div></div></header>

    {view === "home" ? <section className="front-page">
      <div className="front-heading"><p>Questionnaire</p><h2>Select an assessment section</h2><span>Choose the power-sector asset group you would like to assess.</span></div>
      <div className="section-card-grid">
        <button className="section-card" onClick={() => openView("generation")}><span className="section-letter">A</span><div><small>Section A</small><strong>Generation Assets</strong><p>Select Solar, Wind, or Thermal generation.</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card" onClick={() => openView("transmission")}><span className="section-letter">B</span><div><small>Section B</small><strong>Transmission System</strong><p>Transmission questionnaire structure.</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
        <button className="section-card" onClick={() => openView("distribution")}><span className="section-letter">C</span><div><small>Section C</small><strong>Distribution System</strong><p>Continue to the detailed climate resilience questionnaire.</p></div><span className="card-arrow" aria-hidden="true">→</span></button>
      </div>
    </section> : <div className="workspace">
      {renderMajorNavigation()}
      <section className="content">
        <button className="back-link" onClick={() => openView("home")}><span aria-hidden="true">←</span> Back to sections</button>

        {view === "generation" && <section className="asset-page">
          <div className="page-heading"><p>Section A</p><h2>Generation Assets</h2><span>Select the relevant generation asset to continue.</span></div>
          <div className="asset-card-grid">
            {generationAssets.map((asset) => <button className={selectedAsset === asset.id ? "asset-card selected" : "asset-card"} aria-pressed={selectedAsset === asset.id} onClick={() => setSelectedAsset(asset.id)} key={asset.id}><span className="asset-icon" aria-hidden="true">{asset.icon}</span><div><strong>{asset.title}</strong><small>Generation asset</small></div><span className="selection-mark" aria-hidden="true">{selectedAsset === asset.id ? "✓" : "→"}</span></button>)}
          </div>
          {selectedAsset && <div className="placeholder-panel"><span className="placeholder-label">Selected asset</span><h3>{generationAssets.find((asset) => asset.id === selectedAsset)?.title}</h3><p>This section is ready for the questions you will provide next.</p></div>}
        </section>}

        {view === "transmission" && <section className="placeholder-page">
          <div className="page-heading"><p>Section B</p><h2>Transmission System</h2><span>The section structure is ready for the questions you will provide next.</span></div>
          <div className="placeholder-panel"><span className="placeholder-label">Questions pending</span><h3>Transmission System</h3><p>No questions or answer choices have been added.</p></div>
        </section>}

        {view === "distribution" && <>
          <section className="distribution-intro">
            <div className="page-heading"><p>Section C</p><h2>Distribution System</h2><span>{questionnaire.introduction}</span></div>
            <div className="instruction-box"><strong>Questionnaire instructions</strong><p>Complete the applicable climate-stressor questions below. Your selections remain available while you move between sections.</p></div>
          </section>
          <div className="toolbar"><div><span className="status-dot" /> Responses are saved in this browser session</div></div>
          {questionnaire.sections.map((section, index) => <section className="section" id={`section-${section.number}`} key={section.number} onMouseEnter={() => setActiveSection(index)}><div className="section-title"><span>{section.number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{section.number}. {section.title}</h2></div></div>
            {section.questions.map((question, qIndex) => <article className="question" key={`${question.number}-${qIndex}`}><div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div>
              {question.type === "choice" && <ChoiceField question={question} answers={answers} setAnswer={setAnswer} />}{question.type === "matrix" && <MatrixField question={question} answers={answers} setAnswer={setAnswer} />}{question.type === "measures" && <MeasuresField question={question} answers={answers} setAnswer={setAnswer} />}
            </article>)}
            <div className="question-navigation"><button disabled={index === 0} onClick={() => openDistributionSection(index - 1)}>← Previous</button><button className="primary-action" onClick={() => index === questionnaire.sections.length - 1 ? document.getElementById("final-details")?.scrollIntoView({ behavior: "smooth" }) : openDistributionSection(index + 1)}>Next →</button></div>
          </section>)}
          <section className="section final" id="final-details"><div className="section-title"><span>08</span><div><p>Final details</p><h2>Comments &amp; respondent details</h2></div></div><article className="question"><label className="block-label" htmlFor="comments">Any other comments (Optional):</label><textarea id="comments" rows={6} value={answers.comments ?? ""} onChange={(e) => setAnswer("comments", e.target.value)} placeholder="Share any additional context or observations…" /></article><article className="question"><h3>Respondent Details (Optional)</h3><p className="hint">Please provide your name, organization, designation, and contact information before answering the questionnaire.</p><div className="details-grid">{["Name","Organization","Contact","Date"].map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[`respondent_${label.toLowerCase()}`] ?? ""} onChange={(e) => setAnswer(`respondent_${label.toLowerCase()}`, e.target.value)} /></label>)}</div></article>
            <div className="finish"><div><strong>{answered}</strong><span> responses entered</span></div><button onClick={() => openDistributionSection(questionnaire.sections.length - 1)}>← Previous</button></div>
          </section>
        </>}
      </section>
    </div>}
  </main>;
}

