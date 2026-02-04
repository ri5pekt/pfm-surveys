# Embed widget

TypeScript source for the survey embed script. Built with Vite into a single `dist/embed.js` that the API serves at `/embed/script.js` **without injection** (stable, cacheable).

## Config from script tag (no global)

Config is read from the embed script tag so multiple sites and instances don’t collide:

- **Query:** `?site_id=YOUR_SITE_ID` on the script `src`
- **API URL:** derived from the script’s origin (or override with `data-api-url`)
- **Override:** `data-site-id` and `data-api-url` on the script element

**Snippet (recommended):**

```html
<script src="https://YOUR_API_ORIGIN/embed/script.js?site_id=YOUR_SITE_ID"></script>
```

**With overrides:**

```html
<script
  src="https://YOUR_API_ORIGIN/embed/script.js"
  data-site-id="YOUR_SITE_ID"
  data-api-url="https://YOUR_API_ORIGIN"
></script>
```

User/session and “shown” state are namespaced by `siteId` (e.g. `pfm_user_id:${siteId}`) so rollups and dedupe are per-site.

## Development

From repo root:

```bash
pnpm build:embed
# or
pnpm --filter embed build
```

The API serves **only** the built file. If `apps/embed/dist/embed.js` is missing, `GET /embed/script.js` returns 503 with instructions to run `pnpm build:embed`. There is no legacy fallback. For local API dev, run `pnpm build:embed` once, or use `pnpm dev:api` from the repo root to build the embed then start the API.

Watch mode (rebuild on change):

```bash
pnpm --filter embed dev
```

## Structure

- `src/config.ts` – `getConfigFromScript()` (script tag / URL / data attrs)
- `src/types.ts` – Config, Survey, Question, DisplaySettings
- `src/utils.ts` – IDs, storage (namespaced by siteId), `escapeHtml`
- `src/targeting.ts` – `shouldShowSurvey`, `matchesTargetingRules`
- `src/events.ts` – Event queue and batching
- `src/fetch.ts` – `fetchSurveys`
- `src/render.ts` – `createSurveyHTML`, `renderQuestionHTML`, get/set current answer
- `src/display.ts` – `displaySurvey` (one-question-at-a-time, close/minimize)
- `src/index.ts` – Entry: get config from script, init, run survey flow
