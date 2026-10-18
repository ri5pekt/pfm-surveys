# Stats screen: tabs, daily breakdown, and export

Local development plan for the survey stats screen, then deploy to https://pfm-surveys.cloud/.

The sparkline cards shown behind the export mock are out of scope. This plan covers the three tabs and the export dialog only.

## What we are building

The current stats page (`SurveyResponsesView.vue`) becomes three tabs.

**Overview** keeps what is on the page today, except the responses table: metric cards, Edit Survey, Export Responses, and the per-question summary cards.

**Individual responses** is the current responses table, with the same view, copy, delete, and paging behavior. Choosing “show individual responses” on a question card switches to this tab and filters to that question.

**Daily breakdown** is the new tab:

- A date chip plus Last 7 days, Last 14 days, and All time. All time is the default. All time runs from the first activity through today. Last 7 and Last 14 include today.
- One question at a time. A question switcher appears only when the survey has more than one question. The first question is selected by default.
- One stacked bar per calendar day, oldest on the left. The number on top of each bar is that day’s response total. Legend colors follow the answer options.
- Chart switch: Responses, Answer %, Response rate.
  - **Responses:** stacked counts.
  - **Answer %:** each day is a 100% stacked bar (that day’s share of answers).
  - **Response rate:** one bar per day for responses ÷ impressions. The answer legend is hidden.
- A daily table, newest day first, including every calendar day in the range, including zeros.
- Columns: Date, Impressions, Responses, Resp. rate, Dismissals, one column per answer, and a per-row CSV download.
- A total row. Response rate is total responses ÷ total impressions, not an average of the daily rates.
- Hint text: “Click a row to open that day’s responses.”
- Clicking a row opens the Individual responses tab filtered to that day and that question.
- The row download icon downloads that one day as a daily-summary CSV, with no dialog.
- **Export daily CSV** opens the export dialog with Daily summary already selected and the tab’s date range filled in.

Question types:

- Radio: stacked bar and one column per option. The sum of the answer columns equals Responses.
- Checkbox: same layout. Option counts can add up to more than the response count. The Responses column is distinct sessions.
- Text: a single response bar and no answer columns.

Table headers are shortened option labels, with the full text on hover. CSV headers are snake_case slugs of the full label (`more_than_10y`, `5_10y`, `1_3y`).

The active tab is kept in the query string (`?tab=daily`) so a refresh stays on the same tab.

## Export dialog

Extend the existing Export Responses modal. Do not replace the current one-row-per-response CSV.

- **Date range:** Export all, Custom range, Single day. Single day shows one date field. Custom range shows From and To.
- **Layout:**
  - **Individual** — one row per response (today’s export).
  - **Daily summary** — one row per day with counts.
  - **Both** — two CSV files in a zip, or one Excel file with two sheets.
- **Preview** of the first rows and the filename, for example `neoroot-daily_2026-10-10_to_2026-10-18.csv`. The preview and the button label follow the layout and format.
- **Format:** CSV or Excel (`.xlsx`).

Daily summary columns: `date`, `impressions`, `responses`, `response_rate`, `dismissals`, then one slug column per answer.

The question checklist stays for Individual. Daily summary uses the checked choice questions. One question matches the mock. Several questions prefix each slug with `q1_`, `q2_`.

Opened from the Daily tab, the dialog starts on Daily summary, with that tab’s dates and question already set.

This needs `exceljs` and `jszip` in the admin app. Neither is installed today.

## Where the daily numbers come from

Daily impressions and dismissals were never stored as their own table. Lifetime totals live in `survey_stats`. The raw `events` table was dropped.

History is still recoverable:

- Every impression and dismissal is one row in `event_dedup` (`event_type`, `survey_id`, `processed_at`).
- Every answer is one row in `responses` (`timestamp`, `question_id`, `answer_option_id`, `session_id`).

The daily endpoint aggregates those two tables. No new counter and no worker change. Imported production data is enough to test real days.

Days are grouped in the browser’s timezone. The admin sends an IANA zone such as `Asia/Jerusalem`. Impression time is when the worker saved the event (`processed_at`), not the visitor’s clock. A response near midnight can fall one calendar day away from its impression. That is the data we have.

The existing responses date filter treats the selected day as UTC (`from_date` + `T00:00:00.000Z`). The day-click filter and the new daily endpoint use timezone bounds instead.

`event_dedup` does not store dismiss reason (close vs minimize). The daily table only needs the dismissal total. The close / minimize split stays on the Overview card, from `survey_stats`.

## 1. Copy production data onto this machine

Postgres on the VPS listens on localhost only, so the dump goes through SSH. The dump contains respondent IPs, answers, password hashes, and API key hashes. Save it outside the repo and delete it after the restore.

1. Confirm the production container name. `DEPLOY.md` mentions both `surveys-postgres` and `pfm-surveys-prod-postgres-1`.

```powershell
ssh root@2.24.70.59 "docker ps --format '{{.Names}}' | grep -i postgres"
```

2. Start local Postgres if it is not already up, from the repo root:

```powershell
docker compose up -d postgres
```

3. Recreate the local `surveys_dev` database, then stream the production dump into it. Replace the container name if step 1 shows a different one. Run the drop before the dump so the dump is not consumed by the drop command.

```powershell
docker exec surveys-postgres psql -U surveys_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'surveys_dev' AND pid <> pg_backend_pid();"
docker exec surveys-postgres psql -U surveys_user -d postgres -c "DROP DATABASE IF EXISTS surveys_dev;"
docker exec surveys-postgres psql -U surveys_user -d postgres -c "CREATE DATABASE surveys_dev OWNER surveys_user;"
ssh root@2.24.70.59 "docker exec surveys-postgres pg_dump -U surveys_user -d surveys_prod --no-owner --no-acl" | docker exec -i surveys-postgres psql -U surveys_user -d surveys_dev
```

4. Run local migrations so this checkout matches the restored schema, then start the apps:

```powershell
pnpm --filter api migrate:latest
pnpm dev
```

5. Sign in with a production admin account. The password hash comes across with the dump. Open the NeoRoot survey and confirm the Overview totals match production: 2,713 impressions, 110 responses, 296 dismissals.

Do not commit the dump. Do not include the five unrelated API-key files that currently show as line-ending changes.

## 2. Daily stats API

Add `GET /api/surveys/:id/daily` on the admin API.

Query params: `from`, `to` (`YYYY-MM-DD`), `timezone`, and optional `question_id`.

The handler returns one object per calendar day in the range, plus the question’s options:

- `impressions` and `dismissals` from `event_dedup`, grouped by `processed_at` in the requested timezone.
- `responses` and per-option counts from `responses`, grouped by `timestamp` in that same timezone.
- For a radio question, `responses` is the number of answer rows for that question that day.
- For a checkbox question, `responses` is distinct sessions for that question that day.
- `response_rate` is computed in the API so the table, the chart, and the export share one formula.

Add indexes:

- `event_dedup (survey_id, event_type, processed_at)`
- `responses (survey_id, question_id, timestamp)`

Check the endpoint against the restored NeoRoot survey before any UI work. The sum of daily responses equals 110, and the sum of daily impressions equals `survey_stats.total_impressions`.

## 3. Split the stats page into tabs

In `apps/admin/src/views/SurveyResponsesView.vue`, add Overview, Daily breakdown, and Individual responses.

Overview keeps the metric cards, the action buttons, and the question cards. Individual responses keeps `ResponsesTable` and the view, copy, delete, and paging behavior. The question-card action switches tabs and sets the question filter.

## 4. Build the Daily breakdown tab

New components under `apps/admin/src/components/`:

- Date bar: a From–To calendar chip, Last 7 days, Last 14 days, and All time.
- Question switcher, shown only when there is more than one question.
- Stacked bar chart with Chart.js, which is already in the admin app. Register the bar chart pieces the same way `PieChart.vue` registers the pie chart. The number above each bar is that day’s response total.
- Mode switch: Responses, Answer %, Response rate.
- Daily table with the total row, per-row download, and the row-click hint.

A row click sets the Individual responses tab, the question, and that day’s date range.

## 5. Extend the export dialog

Files involved:

- `apps/admin/src/components/ExportResponsesModal.vue`
- `apps/admin/src/utils/exportSurveyResponsesCsv.ts`
- A new daily-summary builder next to the existing CSV helper.

Keep the current Individual CSV path. Add Single day, the three layouts, the preview, and CSV vs Excel.

The row icon on the daily table calls the daily-summary CSV directly for that date. It does not open the dialog.

**Export daily CSV** on the tab opens the dialog with Daily summary selected and the tab’s range and question filled in.

## 6. Test locally

Use the restored NeoRoot survey, then one multi-question survey if the dump has one.

- Overview totals still match production, and the responses table is gone from that tab.
- Last 7 days, Last 14 days, All time, and a custom range each change the chart, the table, and the total row together.
- A day with no activity still appears, with zeros.
- Answer % bars sum to 100%. Response rate hides the answer legend.
- The sum of answer columns equals Responses for the radio question.
- A row click opens that day’s responses. The row download is a one-day CSV.
- Export all three layouts in CSV and Excel. The preview matches the file. Both-as-CSV is a zip with two files. Both-as-Excel is one workbook with two sheets.
- Empty range, a text question, and a checkbox question do not break the chart or the CSV.

## 7. Deploy

After the local checks pass, commit only the stats and export files. Leave the five unrelated API-key line-ending changes unstaged.

Push `main`, then on the VPS:

```bash
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api admin
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api pnpm migrate:latest
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api admin
```

The worker does not change. The migration only adds the two indexes.

Repeat the NeoRoot checks on https://pfm-surveys.cloud/.
