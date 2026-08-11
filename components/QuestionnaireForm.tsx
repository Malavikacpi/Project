"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/lib/csv";
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

export default function QuestionnaireForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [activeSection, setActiveSection] = useState(0);
  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));
  const answered = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const exportAnswers = () => downloadCsv(Object.entries(answers).map(([field, value]) => [field.replaceAll("__", " — "), value]));

  return <main>
    <header className="hero"><div className="hero-inner"><div><p className="eyebrow">Government &amp; infrastructure research</p><h1>{questionnaire.title}</h1><p>{questionnaire.introduction}</p></div><div className="hero-mark" aria-hidden="true"><span>CR</span><small>India power sector</small></div></div></header>
    <div className="shell">
      <aside><div className="side-heading"><p>Questionnaire</p><strong>{questionnaire.sectionLabel}</strong></div><nav aria-label="Questionnaire sections">{questionnaire.sections.map((section, index) => <button className={index === activeSection ? "active" : ""} onClick={() => { setActiveSection(index); document.getElementById(`section-${section.number}`)?.scrollIntoView({ behavior: "smooth" }); }} key={section.number}><span>{section.number.padStart(2, "0")}</span>{section.title}</button>)}</nav></aside>
      <section className="content"><div className="toolbar"><div><span className="status-dot" /> Responses are saved in this browser session</div><button className="export" onClick={exportAnswers}>Export CSV <span>↗</span></button></div>
        {questionnaire.sections.map((section, index) => <section className="section" id={`section-${section.number}`} key={section.number} onMouseEnter={() => setActiveSection(index)}><div className="section-title"><span>{section.number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{section.number}. {section.title}</h2></div></div>
          {section.questions.map((question, qIndex) => <article className="question" key={`${question.number}-${qIndex}`}><div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div>
            {question.type === "choice" && <ChoiceField question={question} answers={answers} setAnswer={setAnswer} />}{question.type === "matrix" && <MatrixField question={question} answers={answers} setAnswer={setAnswer} />}{question.type === "measures" && <MeasuresField question={question} answers={answers} setAnswer={setAnswer} />}
          </article>)}</section>)}
        <section className="section final"><div className="section-title"><span>08</span><div><p>Final details</p><h2>Comments &amp; respondent details</h2></div></div><article className="question"><label className="block-label" htmlFor="comments">Any other comments (Optional):</label><textarea id="comments" rows={6} value={answers.comments ?? ""} onChange={(e) => setAnswer("comments", e.target.value)} placeholder="Share any additional context or observations…" /></article><article className="question"><h3>Respondent Details (Optional)</h3><p className="hint">Please provide your name, organization, designation, and contact information before answering the questionnaire.</p><div className="details-grid">{["Name","Organization","Contact","Date"].map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[`respondent_${label.toLowerCase()}`] ?? ""} onChange={(e) => setAnswer(`respondent_${label.toLowerCase()}`, e.target.value)} /></label>)}</div></article>
        <div className="finish"><div><strong>{answered}</strong><span> responses entered</span></div><button className="export large" onClick={exportAnswers}>Download responses as CSV ↗</button></div></section>
      </section>
    </div>
  </main>;
}
