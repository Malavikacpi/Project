"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatrixQuestion, MeasuresQuestion, Question, Questionnaire } from "@/lib/types";

type Answers = Record<string, string>;
type Stage = "asset" | "stressors" | "questionnaire" | "details" | "complete";
type AssetGroup = "Generation" | "Transmission" | "Distribution";
type GenerationAsset = "Solar" | "Wind" | "Thermal";
type SavedState = { assetGroup?: AssetGroup; generationAsset?: GenerationAsset; stressors: string[]; answers: Answers };

const STORAGE_KEY = "climate-resilience-response";
const key = (...parts: string[]) => parts.join("__");

type FieldProps = { question: Question; answers: Answers; setAnswer: (name: string, value: string) => void };

function ChoiceField({ question, answers, setAnswer }: FieldProps) {
  if (question.type !== "choice") return null;
  const name = key(question.number, question.text);
  return <div className="choice-grid">{question.options.map((option) => {
    const id = key(name, option);
    return <div className={answers[name] === option ? "choice selected" : "choice"} key={option}>
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
  return <div className="table-wrap"><table className="measures"><thead><tr><th>S.No.</th><th>Measure</th><th>Cost Range</th><th>Unit</th><th>{q.outcomeLabel}</th></tr></thead><tbody>{q.rows.map((row) => { const base = key(q.number, row.id); return <tr key={row.id}>
    <td>{row.serial}</td><th scope="row">{row.custom ? <input aria-label={`${q.number} ${row.measure}`} placeholder={row.measure} value={answers[key(base, "measure")] ?? ""} onChange={(e) => setAnswer(key(base, "measure"), e.target.value)} /> : row.measure}</th>
    <td><div className="cost"><input type="number" min="0" aria-label={`${row.measure} minimum cost`} placeholder="Minimum" value={answers[key(base, "minimum")] ?? ""} onChange={(e) => setAnswer(key(base, "minimum"), e.target.value)} /><input type="number" min="0" aria-label={`${row.measure} maximum cost`} placeholder="Maximum" value={answers[key(base, "maximum")] ?? ""} onChange={(e) => setAnswer(key(base, "maximum"), e.target.value)} /></div></td>
    <td className="unit">{q.unit}</td><td><div className="percent"><input type="number" min="0" max="100" aria-label={`${row.measure} ${q.outcomeLabel}`} placeholder="0" value={answers[key(base, "outcome")] ?? ""} onChange={(e) => setAnswer(key(base, "outcome"), e.target.value)} /><span>%</span></div></td>
  </tr>;})}</tbody></table></div>;
}

function BackButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return <button className="back-button" onClick={onClick} disabled={disabled} aria-label="Go back">← <span>Back</span></button>;
}

export default function QuestionnaireForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const [stage, setStage] = useState<Stage>("asset");
  const [assetGroup, setAssetGroup] = useState<AssetGroup>();
  const [generationAsset, setGenerationAsset] = useState<GenerationAsset>();
  const [stressors, setStressors] = useState<string[]>([]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);

  const selectedSections = useMemo(() => questionnaire.sections.filter((section) => stressors.includes(section.title)), [questionnaire.sections, stressors]);
  const selectedAsset = assetGroup === "Generation" ? generationAsset : assetGroup;
  const setAnswer = (name: string, value: string) => setAnswers((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved) as SavedState;
        setAssetGroup(state.assetGroup); setGenerationAsset(state.generationAsset); setStressors(state.stressors ?? []); setAnswers(state.answers ?? {});
      } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ assetGroup, generationAsset, stressors, answers } satisfies SavedState));
  }, [ready, assetGroup, generationAsset, stressors, answers]);

  const goBack = () => {
    if (stage === "complete") setStage("details");
    else if (stage === "details") { setStage("questionnaire"); setSectionIndex(Math.max(0, selectedSections.length - 1)); }
    else if (stage === "questionnaire" && sectionIndex > 0) setSectionIndex((index) => index - 1);
    else if (stage === "questionnaire") setStage("stressors");
    else if (stage === "stressors") setStage("asset");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const chooseGroup = (group: AssetGroup) => {
    setAssetGroup(group);
    if (group !== "Generation") { setGenerationAsset(undefined); setStage("stressors"); window.scrollTo({ top: 0 }); }
  };
  const chooseGeneration = (asset: GenerationAsset) => { setGenerationAsset(asset); setStage("stressors"); window.scrollTo({ top: 0 }); };
  const toggleStressor = (title: string) => setStressors((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  const startQuestionnaire = () => { setSectionIndex(0); setStage("questionnaire"); window.scrollTo({ top: 0 }); };
  const nextSection = () => { if (sectionIndex < selectedSections.length - 1) setSectionIndex((index) => index + 1); else setStage("details"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = () => {
    const response = { submittedAt: new Date().toISOString(), assetGroup, asset: selectedAsset, stressors, answers };
    window.localStorage.setItem(`${STORAGE_KEY}-submitted`, JSON.stringify(response));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ assetGroup, generationAsset, stressors, answers } satisfies SavedState));
    setStage("complete"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = stage === "asset" ? "Asset selection" : stage === "stressors" ? "Climate stressors" : stage === "questionnaire" ? `Section ${sectionIndex + 1} of ${selectedSections.length}` : stage === "details" ? "Final details" : "Complete";
  return <main>
    <header className="topbar"><BackButton onClick={goBack} disabled={stage === "asset"} /><span>{progress}</span><span className="save-state"><i />Saved in this browser</span></header>
    <header className="hero"><div className="hero-inner"><div><p className="eyebrow">Government &amp; infrastructure research</p><h1>{questionnaire.title}</h1><p>{questionnaire.introduction}</p></div><div className="hero-mark" aria-hidden="true"><span>CR</span><small>India power sector</small></div></div></header>

    {stage === "asset" && <div className="flow-shell"><div className="step-heading"><span>01</span><p>Start your assessment</p><h2>Select an asset group</h2><small>Choose the part of the power system you are assessing.</small></div><div className="asset-grid">{(["Generation", "Transmission", "Distribution"] as AssetGroup[]).map((group) => <button key={group} className={assetGroup === group ? "asset-card selected" : "asset-card"} onClick={() => chooseGroup(group)}><span>{group === "Generation" ? "◉" : group === "Transmission" ? "⌁" : "⌂"}</span><strong>{group}</strong><small>{group === "Generation" ? "Power-producing assets" : group === "Transmission" ? "Bulk power networks" : "Local distribution systems"}</small><b>→</b></button>)}</div>
      {assetGroup === "Generation" && <div className="drilldown"><div className="step-heading compact"><p>Generation asset</p><h2>What type of generation asset?</h2></div><div className="asset-grid subgrid">{(["Solar", "Wind", "Thermal"] as GenerationAsset[]).map((asset) => <button key={asset} className={generationAsset === asset ? "asset-card selected" : "asset-card"} onClick={() => chooseGeneration(asset)}><strong>{asset}</strong><b>→</b></button>)}</div></div>}
    </div>}

    {stage === "stressors" && <div className="flow-shell"><div className="context-pill">{assetGroup}{generationAsset ? ` / ${generationAsset}` : ""}</div><div className="step-heading"><span>02</span><p>Climate exposure</p><h2>Do you think this asset is affected by the following climate stressors?</h2><small>Select all that apply. Your selection determines which questionnaire sections you will see.</small></div><div className="stressor-grid">{questionnaire.sections.map((section) => <label className={stressors.includes(section.title) ? "stressor selected" : "stressor"} key={section.number}><input type="checkbox" checked={stressors.includes(section.title)} onChange={() => toggleStressor(section.title)} /><span><b>{section.number.padStart(2, "0")}</b><strong>{section.title === "Daily Wind Stress" ? "High Wind" : section.title}</strong></span><i>✓</i></label>)}</div><div className="flow-actions"><span>{stressors.length} stressor{stressors.length === 1 ? "" : "s"} selected</span><button className="primary" disabled={!stressors.length} onClick={startQuestionnaire}>Continue to questionnaire →</button></div></div>}

    {stage === "questionnaire" && selectedSections[sectionIndex] && (() => { const section = selectedSections[sectionIndex]; return <div className="questionnaire-shell"><aside><div className="side-heading"><p>{selectedAsset}</p><strong>Selected stressors</strong></div><nav>{selectedSections.map((item, index) => <button key={item.number} className={index === sectionIndex ? "active" : ""} onClick={() => { setSectionIndex(index); window.scrollTo({ top: 0 }); }}><span>{item.number.padStart(2, "0")}</span>{item.title}</button>)}</nav></aside><section className="content"><div className="section-title"><span>{section.number.padStart(2, "0")}</span><div><p>Climate stressor</p><h2>{section.number}. {section.title}</h2></div></div>{section.questions.map((question, qIndex) => <article className="question" key={`${question.number}-${qIndex}`}><div className="question-head"><span>{question.number}</span><div><h3>{question.text}</h3>{question.type === "choice" && <p className="unit-label">Unit <strong>{question.unit}</strong></p>}</div></div><ChoiceField question={question} answers={answers} setAnswer={setAnswer} /><MatrixField question={question} answers={answers} setAnswer={setAnswer} /><MeasuresField question={question} answers={answers} setAnswer={setAnswer} /></article>)}<div className="flow-actions"><button className="secondary" onClick={goBack}>← Back</button><button className="primary" onClick={nextSection}>{sectionIndex < selectedSections.length - 1 ? "Next section" : "Continue to final details"} →</button></div></section></div>; })()}

    {stage === "details" && <div className="flow-shell narrow"><div className="step-heading"><span>✓</span><p>Final step</p><h2>Comments &amp; respondent details</h2><small>These details are optional. Review or update earlier responses at any time using Back.</small></div><article className="question"><label className="block-label" htmlFor="comments">Any other comments (Optional)</label><textarea id="comments" rows={6} value={answers.comments ?? ""} onChange={(e) => setAnswer("comments", e.target.value)} placeholder="Share any additional context or observations…" /></article><article className="question"><h3>Respondent details (Optional)</h3><div className="details-grid">{["Name", "Organization", "Designation", "Contact", "Date"].map((label) => <label key={label}>{label}<input type={label === "Date" ? "date" : "text"} value={answers[`respondent_${label.toLowerCase()}`] ?? ""} onChange={(e) => setAnswer(`respondent_${label.toLowerCase()}`, e.target.value)} /></label>)}</div></article><div className="flow-actions"><button className="secondary" onClick={goBack}>← Back</button><button className="submit" onClick={submit}>Submit assessment</button></div></div>}
    {stage === "complete" && <div className="flow-shell narrow"><div className="confirmation"><span>✓</span><p>Assessment submitted</p><h2>Thank you for your response.</h2><small>Your selections and questionnaire answers have been saved in this browser. You can go back to review or update them.</small><button className="secondary" onClick={goBack}>← Review responses</button></div></div>}
  </main>;
}
