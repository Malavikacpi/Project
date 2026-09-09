# Climate Risk & Resilience Questionnaire

This Next.js application renders the attached Solar, Wind, Thermal, Transmission, and Distribution questionnaires from `data/questionnaires.json`. Respondent progress is kept in browser-session storage, while completed submissions are stored in Neon Postgres through a server-only API.

## Vercel configuration

1. Create or connect a Neon Postgres database in the Vercel project.
2. Add `DATABASE_URL` in Vercel Project Settings → Environment Variables.
3. Add a long random `ADMIN_EXPORT_TOKEN` in the same settings.
4. Redeploy after adding the environment variables.

The schema is created idempotently when the submission/export API first runs. The equivalent SQL is available in `db/schema.sql` for controlled migrations.

## Private Excel export

The respondent interface has no export control. An authorized administrator can download the workbook from:

```text
GET /api/admin/responses.xlsx
Authorization: Bearer <ADMIN_EXPORT_TOKEN>
```

The workbook contains one row per question response, including submission ID, timestamp, system, asset, section metadata, climate stress, original question number and wording, unit, and the selected response.
