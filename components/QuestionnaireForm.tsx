"use client";

import { useMemo, useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire } from "@/lib/types";

type Answers = Record<string, string>;
type Stage = "select" | "overview" | "questionnaire";

const ASSETS = [
  { id: "solar", name: "Solar", description: "Solar PV and concentrated solar power assets.", icon: "☀" },
  { id: "wind", name: "Wind", description: "Onshore and offshore wind generation assets.", icon: "◒" },
  { id: "thermal", name: "Thermal", description: "Coal, gas and other thermal generation assets.", icon: "♨" },
  { id: "transmission", name: "Transmission", description: "High-voltage lines, towers and substations.", icon: "⌁" },
  { id: "distribution", name: "Distribution", description: "Distribution lines, transformers and substations.", icon: "⑂" },
  { id: "all", name: "All assets", description: "Complete a consolidated power-sector assessment.", icon: "⊞" },
] as const;

const key = (...parts: string[]) => parts.join("__");
type FieldProps = { question: Question; answers: Answers; setAnswer: (name: string, value: string) => void };

function ChoiceField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "choice") return null;
  const name = key(question.number, question.text);
  return <div className="choice-grid">{question.options.map((option) => {
    const id = key(name, option);
    return <div className={`choice ${answers[name] === option ? "selected" : ""}`} key={option}>
      <label htmlFor={id}><input id={id} type="radio" name={name} value={option} checked={answers[name] === option} onChange={(e) => setAnswer(name, e.target.value)} /><span>{option}</span></label>
      {option.startsWith("Other") && answers[name] === option && <input className="other-input" aria-label={`${question.number} other response`} placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(e) => setAnswer(key(name, "other"), e.target.value)} />}
    </div>;
  })}</div>;
}

function MatrixField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "matrix") return null;
  const q = question as MatrixQuestion;
  return <div className="table-wrap"><table><thead><tr><th>{q.firstColumn}</th><th>Unit</th><th>Response (select one)</th></tr></thead><tbody>{q.rows.map((row) => {
    const name = key(q.number, row.id);
    return <tr key={row.id}><th scope="row">{row.label}</th><td>{row.unit}</td><td><select aria-label={`${q.number} ${row.label}`} value={answers[name] ?? ""} onChange={(e) => setAnswer(name, e.target.value)}><option value="">Select a response</option>{q.options.map((option) => <option key={option}>{option}</option>)}</select>{answers[name]?.startsWith("Other") && <input className="other-input" placeholder="Please specify" value={answers[key(name, "other")] ?? ""} onChange={(e) => setAnswer(key(name, "other"), e.target.value)} />}</td></tr>;
  })}</tbody></table></div>;
}

function MeasuresField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "measures") return null;
  const q = question as MeasuresQuestion;
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead><tbody>{q.rows.map((row) => {
    const base = key(q.number, row.id);
    return <tr key={row.id}><td>{row.serial}</td><th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(e) => setAnswer(key(base, "measure"), e.target.value)} /> : row.measure}</th><td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(e) => setAnswer(key(base, "minimum"), e.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(e) => setAnswer(key(base, "maximum"), e.target.value)} /></div></td><td className="unit">{q.unit}</td><td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(e) => setAnswer(key(base, "outcome"), e.target.value)} /><span>%</span></div></td></tr>;
  })}</tbody></table></div>;
}

export default function QuestionnaireForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const [stage, setStage] = useState<Stage>("select");
  const [assetId, setAssetId] = useState<string>();
  const [activeSection, setActiveSection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const asset = ASSETS.find((item) => item.id === assetId);
  const answered = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const chooseAsset = (id: string) => { setAssetId(id); setStage("overview"); setActiveSection(0); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <main className="app-shell">
    <div className="status-strip"><div><span className="status-dot" />STEP {stage === "select" ? "01 · SELECT ASSET" : stage === "overview" ? "02 · REVIEW QUESTIONNAIRE" : "03 · ASSESSMENT"}</div><span>{asset ? asset.name : "Power sector"}</span></div>

    {stage === "select" && <section className="stage front-stage">
      <header className="landing-hero"><p className="eyebrow">Climate resilience programme · India</p><h1>Climate Risk and Resilience Assessment of Power Sector Assets</h1><p>Select an asset class to begin. Your responses will help identify climate vulnerabilities, operating thresholds and suitable resilience measures across the power sector.</p></header>
      <p className="section-label">Choose an asset to assess</p>
      <div className="asset-grid">{ASSETS.map((item) => <button className="asset-card" key={item.id} onClick={() => chooseAsset(item.id)}><span className="asset-icon" aria-hidden="true">{item.icon}</span><strong>{item.name}</strong><small>{item.description}</small><span className="card-arrow">↗</span></button>)}</div>
    </section>}

    {stage === "overview" && asset && <section className="stage overview-stage">
      <button className="back-link" onClick={() => setStage("select")}>← Change asset</button>
      <div className="overview-hero"><span className="large-icon">{asset.icon}</span><div><p className="eyebrow">{asset.name} asset questionnaire</p><h1>{asset.name} climate risk assessment</h1><p>{questionnaire.introduction}</p></div></div>
      <div className="overview-card"><div><p className="section-label">Questionnaire sections</p><h2>What you’ll be asked</h2><p>Work through each climate stressor. Questions retain their original numbering, units, response choices and assessment tables.</p></div><ol>{questionnaire.sections.map((section) => <li key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</li>)}</ol></div>
      <div className="continue-row"><span>7 sections · responses stay in this session</span><button className="primary" onClick={() => setStage("questionnaire")}>Start questionnaire →</button></div>
    </section>}

    {stage === "questionnaire" && asset && <section className="stage questionnaire-stage">
      <button className="back-link" onClick={() => setStage("overview")}>← Questionnaire overview</button>
      <header className="questionnaire-header"><div><p className="eyebrow">{asset.name} assessment</p><h1>{questionnaire.title}</h1></div><div className="response-count"><strong>{answered}</strong><span>responses entered</span></div></header>
      <nav className="tab-strip" aria-label="Questionnaire sections">{questionnaire.sections.map((section, index) => <button key={section.number} className={activeSection === index ? "active" : ""} onClick={() => setActiveSection(index)}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}</nav>
      {questionnaire.sections[activeSection] && <section className="question-section" key={questionnaire.sections[activeSection].number}><div className="section-heading"><span>{questionnaire.sections[activeSection].number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{questionnaire.sections[activeSection].number}. {questionnaire.sections[activeSection].title}</h2></div></div>
        {questionnaire.sections[activeSection].questions.map((question, index) => <article className="question" key={`${question.number}-${index}`}><div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div><ChoiceField question={question} answers={answers} setAnswer={setAnswer} /><MatrixField question={question} answers={answers} setAnswer={setAnswer} /><MeasuresField question={question} answers={answers} setAnswer={setAnswer} /></article>)}
        <div className="section-actions"><button className="ghost" disabled={activeSection === 0} onClick={() => setActiveSection((i) => i - 1)}>← Previous</button><span>Section {activeSection + 1} of {questionnaire.sections.length}</span><button className="primary" disabled={activeSection === questionnaire.sections.length - 1} onClick={() => { setActiveSection((i) => i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Next section →</button></div>
      </section>}
    </section>}
  </main>;
}
