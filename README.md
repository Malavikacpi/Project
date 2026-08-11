# Climate Risk & Resilience Questionnaire

A production-ready Next.js questionnaire transcribed from `CR-DistributionSystem_Questionnaire.docx`. The form is rendered dynamically from structured JSON, supports responsive table inputs, optional respondent details, and local CSV export.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data and architecture

- `data/questionnaire.json` is the source of truth for all seven climate-stressor sections, original question numbering, response options, units, and resilience-measure table rows.
- `components/QuestionnaireForm.tsx` dynamically renders choice, matrix, and measures question types.
- `lib/csv.ts` converts all entered responses into a UTF-8 CSV file entirely in the browser; responses are never sent to a server.

## Deploy to Vercel

Import this repository in Vercel and accept the detected **Next.js** framework settings, or run `npx vercel`. No environment variables or external services are required. The production build command is `npm run build`.
