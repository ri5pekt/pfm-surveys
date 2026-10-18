# Stats overview rebuild

Design reference: `survey-stats-screen.html` and the Overview screenshot (NeoRoot Thinning Timeline). This plan covers the **Overview** tab of the survey stats screen. Daily breakdown, individual responses, and the export dialog stay as they are in v1.5.0.

“Things to know” is on this page. It shows at most three cards, only for checks that fire, and it adds no empty cards.

## What the mock is

The HTML file is a clickable layout. Its header comment splits the numbers:

| Real, from production | Invented, to show the layout |
| --- | --- |
| 2,713 impressions, 110 responses, 296 closed, the three rates | Q2 and Q3 |
| Q1 option counts and the half-vs-half shift | Device split, page split |
| Benchmarks across launched surveys | Daily counts inside the mock’s daily tab |
| The three alert cards | The sample response rows |

Do not copy the invented numbers into the product. Device and page rates in the screenshot are not computable for NeoRoot today (see Data).

## Stay as they are

- **Daily breakdown** tab, including the chart, date range, question switcher, table, row click, and export handoff.
- **Individual responses** tab, including the day filter, paging, and delete.
- **Export** dialog (individual, daily summary, both, CSV, Excel).
- Admin shell: sidebar, login, surveys list. The mock is the content of this page, not a new app.

Overview links into those tabs. It does not rebuild them.

- “Open daily breakdown” switches to the Daily tab.
- “See all N” switches to Individual responses.
- Edit survey and Export stay, and move into the page header next to the title.

## Out of scope

- AI themes on text questions (“Common themes”, “AI summary · updated daily”). The text question card shows real latest answers only. Themes can be a later job.
- “People who answered…” cross-question filter. The mock shows it only when there is more than one question. One production survey has two questions, and both are text. Skip the control.
- Restyling Daily breakdown and Individual responses to match the mock’s simpler versions of those tabs.

## Page header

Replace the current title plus “N responses” line.

- Back to surveys.
- Survey name.
- Edit survey, Export.
- Status pill. **Live** when `surveys.active` is true. **Ended** when it is false and the survey has at least one impression or response. **Draft** when it is false and both are zero. The product does not store “ended”.
- Run line, America/New_York. **Live:** “Started Oct 4 · day 15”, from the first impression through today, both ends counted. **Ended:** “Ran Oct 4 – Oct 17, 2026 · 14 days”, first impression through the last response. **Draft**, or live with no impression yet: omit the line.
- “N questions · single choice, multiple choice, text” from the survey’s question types. Hide the type list when there are no questions.
- “Most answers from {url}”. The url is the response `page_url` with the query string removed that has the most answers. The page card below lists the rest. “Shown on” is the wrong label: it reads like the targeting setting. If there are no answers yet, omit the link. Do not fall back to a targeting rule.

## Overview sections, top to bottom

### 1. Three benchmark cards

Response rate, close rate, no action. Each card:

- Big percent, one decimal.
- Count line: “110 of 2,713”, “296 closed”, “2,307 impressions”.
- A scale. Grey track. Shaded band from P25 to P75. A tick at the median. A dot at this survey. The dot is brand purple when the value sits inside the band, including on the P25 and P75 edges. It is red only when the value is outside the band. The mock’s red dot is because NeoRoot is a bad survey, not the default.
- Caption: “Your surveys: median X%, typical A–B%”. No sentences like “Unusually low” or “triggers the ignored alert”. Those belong to the alerts work.
- Legend under the row: this survey, typical range (middle 50%), median.

Formulas, from `survey_stats` for this survey:

- Response rate = `total_responses / total_impressions`.
- Close rate = `total_closes / total_impressions`. The mock’s “closed” is closes, not closes plus minimizes. Minimize is 17 events across the whole database, so the bar will match “296 closed” on NeoRoot if that survey’s closes equal its dismissals. If `total_closes` and `total_dismissals` differ, the card uses closes and does not mention minimize.
- No action = impressions − responses − closes. Rate = that count / impressions.
- Zero impressions: show 0% and an empty scale. Do not divide by zero.

Benchmark population: surveys in the tenant with at least 200 impressions. That is the 91-survey cut in the data report. It drops “Denis Test”, “Test QA”, and “Age” (9 impressions, 44% rate) without a name filter. The survey on screen is included only when it has 200 or more impressions. A smaller survey is still plotted on this band.

Scale max:

- Response rate: 30, unless this survey or the P75 is higher, then the next multiple of 10 above that value. A 45% survey must not fall off a 30% track.
- Close rate and no action: 100.

All three cards use the same scale: P25–P75 band, median tick, and the dot rule above. The data report only published the no-action median (33.2%). Compute P25 and P75 in this build. The mock left that band off because those two numbers were not in the report.

The current four metric cards (response rate, impressions, responses, dismissals) are removed from Overview. Impressions and responses remain visible in the count lines and in the outcome bar.

### 2. Outcome bar

“What happened after the survey was shown”, with the impression total on the right.

One stacked bar, three segments, in this order:

| Segment | Color | Count |
| --- | --- | --- |
| Answered | brand purple | `total_responses` |
| Closed | orange | `total_closes` |
| No action | grey | impressions − responses − closes |

Legend under the bar: count and percent for each. Percents are one decimal and use impressions as the denominator.

If closes + responses is greater than impressions, clamp no-action at 0 and do not draw a negative segment. That has not happened in production.

### 3. Question card

One question at a time. This replaces the stack of pie-chart cards.

- Question tabs when there are two or more questions. Each tab: `Q1` chip, a short label, type, answer count. Hidden when there is one question. The short label is the question text trimmed to about 32 characters. The card title is the full question text, prefixed with `Q1` only when tabs are showing. A single-question survey still shows `Q1` in front of the title, matching the mock.
- Device switch: All, Mobile, Desktop, Tablet. Filters **answer rows** by `responses.device`. It does not scale the all-device counts by a share. “All” is the default.
- Reliability pill, from the filtered answer count:
  - 100 or more: “Reliable · 100+ answers”.
  - 30–99: “Early results · N more to be reliable”, where N is `100 − count`.
  - Under 30: “Too few answers to compare (under 30)”, and the bars are grey.
- The pill uses the count currently on screen, so Desktop with 19 answers is “too few” even when All has 110.

**Radio.** One row per option, in option order (not sorted by count). Columns: answer, bar, share, count, and “1st half → 2nd half” when any option qualifies.

- Share = option count / people who answered this question, rounded to a whole percent. The denominator is distinct submits for this question, which for a required radio question is the row count.
- Bar width is relative to the largest option, not to 100%.
- Half shift, All devices only. Order this question’s answers by `responses.timestamp`. Split into two halves of equal size (the extra row, if the count is odd, goes to the first half). Each half must have at least 50 answers, so the question needs at least 100 answers. An option is shown when its share moves by 10 points or more. Format: `31% → 53%  ▲ 22 pt` or `▼`. Other options show an em dash. The column header is hidden when no option qualifies. Device filters hide the column, because a device slice will usually be too small for the 50-answer rule.
- Footer: “Results become reliable at 100 answers; below 30 they’re greyed out. Shift is shown when an option moved 10+ points between halves.”

**Checkbox.** Same layout. Share is percent of people who answered, using distinct sessions (`session_id`, or the row id when session is missing). Shares may add past 100%. Count line: “N answered · X.X options picked on average” (sum of option counts / people). No half-shift column. Footer explains that shares can exceed 100%.

**Text.** No option bars.

- Count line: “N written answers · P% of people answered”, where P is this question’s answers / survey `total_responses`.
- Latest answers, newest first, up to 8. Each row is the text plus “date · device · browser · country, state”. A search box filters the loaded page of answers by substring. “Read all N answers” opens Individual responses with this question selected.
- No theme list.

Empty question: “No answers yet”, no bars, reliability pill shows the under-30 state.

### 4. Response rate by device and by page

Two cards side by side. Each row: label, bar, rate, “responses of impressions · share of answers”.

- Rate = responses / impressions for that device or page.
- Bar width is relative to the highest rate in that card.
- The trailing percent is that segment’s responses divided by responses in the same window, not lifetime responses.
- Device order: Mobile, Desktop, Tablet. Omit a device with zero impressions and zero responses.
- Page: `page_url` with query string and trailing slash removed, host kept if present. Top 8 by impressions. A row is omitted when impressions are 0.

**Coverage.** `event_dedup.device` and `event_dedup.page_url` started being saved on 18 Oct 2026. Older impressions are null. Answers from before that date still have a device and a page, so they must not be used here. Pairing new impressions with all-time answers inflates the rate on any survey that crosses the coverage threshold.

Both sides of the rate use the same window: `event_dedup.processed_at` and `responses.timestamp` on or after 18 Oct 2026, 00:00 America/New_York. Impressions are impression rows in that window whose device or page is not null. Responses are submits in that window whose device or page matches. The “share of answers” percent uses that same response window as its denominator.

If tagged impressions in the window are under half of `survey_stats.total_impressions`, do not draw rates. Show: “Device and page rates use impressions saved from 18 Oct 2026. This survey’s earlier impressions don’t have them.” NeoRoot will hit that empty state. Do not fall back to the mock’s 84/2150 figures.

### 5. Answers per day

A single-series bar chart of response counts, one bar per calendar day from the first impression through the last response (through today, if the survey is live), including days with zero answers. Date labels are the month and day. The bar value is the response count. A caption on the card says “Days in New York time”.

Days use America/New_York. The Daily breakdown tab keeps the viewer’s timezone, so the two counts can disagree by a day near midnight. The caption is why.

“Open daily breakdown” sets the Daily tab. It does not change that tab’s own date control.

Data comes from the existing daily stats query, called with `timezone=America/New_York` and no question filter so the response count is survey-level. If that endpoint currently requires a question, add a survey-level mode rather than summing questions in the browser (a checkbox submit must count once).

### 6. Latest responses

Four newest submits. Columns: first question’s answer (option text, or the written text trimmed), device · browser, location (“US, North Carolina”), timestamp in America/New_York. The time column is labeled so it is obvious these are New York times, not the viewer’s. “See all N” opens Individual responses with no day filter.

A submit is one `session_id` + `timestamp`. Multi-question surveys show the first question’s answer in this strip only.

## API

One new authenticated endpoint keeps the page to a single round trip:

`GET /api/surveys/:id/overview`

Response shape:

```ts
{
  survey: {
    name, active, status,                 // status: live | ended | draft
    run: { kind: "live" | "ended" | "none", from, to, days } | null,
    questions: { id, order, text, short, type }[],
    primaryPage: string | null            // busiest answer URL; header says "Most answers from"
  },
  totals: {
    impressions, responses, closes,
    responseRate, closeRate, noAction, noActionRate
  },
  benchmarks: {
    surveyCount,
    responseRate: { p25, median, p75, scaleMax },
    closeRate: { p25, median, p75, scaleMax },
    noAction: { p25, median, p75, scaleMax }
  },
  questions: {
    id, type, answers,
    options?: { id, label, count, share, shift: { from, to, delta } | null }[],
    averagePicks?: number,                // checkbox
    latest?: { text, at, device, browser, location }[]  // text
  }[],
  segments: {
    ready: boolean,                       // false when tagged impressions < 50% of lifetime
    taggedImpressions, lifetimeImpressions,
    from,                                 // 2026-10-18, New York
    devices: { name, responses, impressions, rate, shareOfResponses }[],
    pages: { url, responses, impressions, rate, shareOfResponses }[]
    // responses, impressions, and shareOfResponses are all inside `from` onward
  },
  daily: { date, responses }[],           // NY, includes zero days
  latest: { answer, device, browser, location, at }[]
}
```

Device-filtered option counts are a query on that endpoint: `?device=mobile|desktop|tablet`. “All” omits it. The rest of the payload stays lifetime, so the benchmark cards do not change when the device switch moves.

Implementation notes:

- Tenant check is the same as the other survey routes.
- Benchmarks are percentile queries over `survey_stats` for surveys in the tenant with `total_impressions >= 200`. Cache them in memory for 10 minutes. They change slowly, and this page will be opened often. The expected medians are response rate 13.4%, close rate 50.4%, no action 33.2%, each within 0.1.
- Half shift is computed in SQL or in the service from ordered answer rows, not in the browser. Cap the read at the question’s answers; production questions are small enough (max responses on one survey is 1,133).
- Checkbox “people” uses the same distinct-session rule as daily stats.
- Page grouping uses the same URL cleanup as the embed (`cleanUrl`), then strips the query.
- Do not change `GET /responses/summary`. The surveys list and any leftover pie card must keep working until the pie cards are removed from this page.

## Admin UI

Inside `SurveyResponsesView.vue`, the Overview branch becomes a new set of components. Suggested files:

| Component | Section |
| --- | --- |
| `StatsOverview.vue` | Loads `/overview`, holds the device filter, lays out the sections |
| `StatsOverviewHeader.vue` | Title, status, run line, actions. Can live in the view if it is clearer next to the tabs |
| `BenchmarkCards.vue` | Three scales |
| `OutcomeBar.vue` | Stacked bar |
| `OverviewQuestionCard.vue` | Tabs, device switch, radio/checkbox/text bodies |
| `RateListCard.vue` | Device card and page card |
| `AnswersPerDayChart.vue` | CSS bars are enough. No new chart library. Chart.js stays on the Daily tab |
| `LatestResponsesStrip.vue` | Four rows |

Styling follows the mock’s tokens (ink, line, brand `#5b67e0`, orange closed, grey no-action) and Nunito Sans on this page only. The benchmark dot uses that brand color, and red only outside the band. The rest of the admin keeps its current font.

Layout: white panel, 12px radius, 24px gap, cards with a 1px border. The benchmark row and the device/page row wrap under 640px. The answer grid hides the bar and the shift column under 640px, leaving label, share, and count.

Loading: one skeleton for the overview request. A device switch refetches question blocks only, or the whole payload if a second small endpoint is more work than it saves. Prefer `?device=` on the same endpoint and replacing the question section.

Empty survey (draft): header, and “No impressions yet” in place of the cards. No alerts block.

## Build order

1. **API totals, benchmarks, outcome.** Fixture: NeoRoot returns 4.1% response rate, close rate from `total_closes` (expected 296, 10.9%), no-action 85.0% if closes are 296. Benchmark medians within 0.1 of 13.4 / 50.4 / 33.2, on the 200-impression set. If NeoRoot closes are not 296, show the close count anyway.
2. **Question card for radio and checkbox**, including reliability, device filter, and half shift. NeoRoot “More than 10 years” should show the 22-point rise and “5–10 years” the 24-point drop when All is selected.
3. **Text question body** with latest answers and search. Use “FC PDP - Exit Intent - Objections” or the post-purchase survey.
4. **Answers per day and latest responses**, wired to the existing tabs.
5. **Device and page cards** with the coverage empty state. A survey created after 18 Oct 2026, once it has impressions, should show real rates, with responses counted only from that date. NeoRoot should show the empty state.
6. **Header and visual pass** against the screenshot, including the live run line, the “Most answers from” label, and the dot color. Remove the old metric cards and pie cards from Overview only. Things to know sits above the benchmark cards.

## Test plan

- Benchmark medians within 0.1 of 13.4% response rate, 50.4% close rate, and 33.2% no action. The set is surveys with at least 200 impressions. “Denis Test”, “Test QA”, and “Age” are not in it. All three cards show a P25–P75 band.
- NeoRoot dots are red (4.1% and 85% no action sit outside the band; confirm close rate against its own band). A survey inside the band gets a brand-colored dot.
- NeoRoot, All devices: header “Ended”, “Ran Oct 4 – Oct 17, 2026 · 14 days”, “Most answers from” the busiest URL, Q1 counts 46 / 25 / 17 / 15 / 7, shares 42 / 23 / 15 / 14 / 6, shift on the first two options only. Things to know shows low response, mostly ignored, and the Q1 shift.
- NeoRoot, Desktop: counts come from `responses.device = 'Desktop'`, bars grey if under 30, shift column gone.
- A checkbox survey: shares can sum past 100, average picks shown, no shift column.
- A text survey: latest quotes, search, no theme block.
- A live survey: run line is “Started {first impression} · day N” through today in New York, not through the last response. A live survey with no impression yet omits the line.
- Answers per day is captioned “Days in New York time”. Latest timestamps say they are New York times.
- A draft: Draft pill, empty state.
- A survey with two questions: tabs, one card, switching tabs does not reset the device switch.
- Device/page card hidden behind the coverage note when tagged impressions are under half of lifetime impressions. When the card is shown, a response from before 18 Oct 2026 is not in the numerator, the denominator, or the share-of-answers percent.
- “Open daily breakdown” and “See all” land on the existing tabs without losing export or delete.
- Mobile width: benchmark cards stack, answer rows keep share and count.

## Decisions

- Overview only. Daily, individual, and export stay.
- Things to know uses the five checks from the data report, ranked in code, at most three cards. No AI themes. No cross-question filter.
- Closed means `total_closes`. No action subtracts closes, not all dismissals. Across production, closes are 75,387 of 75,404 dismissals, and minimize was used 17 times. NeoRoot should show 296. If it does not, the card still shows closes.
- All three benchmark cards show a P25–P75 band, a median tick, and a dot. The dot is brand purple inside the band and red outside it.
- Benchmarks are surveys with at least 200 impressions (91 surveys), not every survey that was shown once.
- The header says “Most answers from {url}”, using the busiest answer URL. It does not say “Shown on”.
- A live run line ends today: “Started Oct 4 · day 15”. An ended run line is first impression through last response.
- Reliability and half-shift thresholds are the ones in the mock header (100, 30, 10 points, 50 per half).
- Overview dates use America/New_York, and the chart and latest timestamps say so. The Daily tab does not change timezone.
- Device and page rates, including share of answers, count impressions and responses only from 18 Oct 2026 onward. The cards stay hidden when tagged impressions are under half of lifetime impressions.
