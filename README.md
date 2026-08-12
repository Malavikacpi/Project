# Climate Risk & Resilience Questionnaire

A production-ready Next.js questionnaire transcribed from `CR-DistributionSystem_Questionnaire.docx`. The guided assessment supports asset and multi-stressor selection, dynamically rendered sections, responsive table inputs, and persistent browser state.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data and architecture

- `data/questionnaire.json` is the source of truth for all seven climate-stressor sections, original question numbering, response options, units, and resilience-measure table rows.
- `components/QuestionnaireForm.tsx` provides the guided flow and dynamically renders choice, matrix, and measures question types.
- In-progress and submitted responses are stored locally in the respondent's browser; no public CSV download is shown.

## Deploy to Vercel

Import this repository in Vercel and accept the detected **Next.js** framework settings, or run `npx vercel`. No environment variables or external services are required. The production build command is `npm run build`.
