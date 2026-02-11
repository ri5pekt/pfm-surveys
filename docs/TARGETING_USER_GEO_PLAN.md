# Targeting: Specific Users + Geo Location

## Goal
Add "Specific users" in the survey builder Targeting tab (like "Specific pages"), with a first rule type **Geo location** (country, state, city — each optional = "any"). On the embed, resolve the user's location from the request IP and show the survey only if the geo rule is met. Add console and server logs for testing.

## Current State
- **Pages:** "All pages" | "Specific pages" with rules (exact URL, URL contains). Stored in `targeting_rules` as `rule_type`: "exact" | "contains", `rule_config`: `{ value }`.
- **Users:** Only "All users" in the UI; no user rules.
- **Embed:** `matchesTargetingRules(targeting)` only checks page rules. No user geo.

## Data Model
- **Existing table:** `targeting_rules` (survey_id, rule_type, rule_config JSONB).
- **Page rules (unchanged):** `rule_type` "exact" | "contains", `rule_config` `{ "value": "..." }`.
- **User geo rules (new):** `rule_type` "geo", `rule_config` `{ "country": ""|string, "state": ""|string, "city": ""|string }`. Empty string or missing = "any".

## 1. Admin (Survey Builder)

### Types (`apps/admin/src/types/survey-editor.ts`)
- Add `UserGeoRule`: `{ type: "geo"; country?: string; state?: string; city?: string }`.
- Extend `targeting`: add `userType: "all" | "specific"`, `userRules: UserGeoRule[]`. Keep `users` for backward compat or set from userType.
- Default: `userType: "all"`, `userRules: []`.

### TargetingSection.vue
- **Users:** Radio "All users" | "Specific users".
- When "Specific users": show "User Rules" block.
  - "+ Add rule" → add one rule. Rule type dropdown: **"Geo location"** (first/only type for now).
  - When rule type is Geo: show 3 inputs — Country, State, City. Placeholders "Any" (empty = any).
  - Remove rule button per row.
- Emit/handle add-user-rule, remove-user-rule (or manage locally with v-model targeting.userRules).

### useSurveyEditor
- **Load:** From `targetingRules`, split into:
  - Page rules: `rule_type` in ["exact","contains"] → `pageRules`.
  - User rules: `rule_type` === "geo" → `userRules` (from rule_config country, state, city).
  Set `targeting.userType` = "specific" if any user rule, else "all".
- **Save:** Payload include `targeting.userType`, `targeting.userRules`. API saves page rules + user geo rules.

### API survey GET (editor)
- No change: still return `targetingRules` raw. Admin splits into page/user when loading.

### API survey PUT/POST (save)
- When saving targeting: delete all `targeting_rules` for survey, then:
  - Insert page rules (exact/contains) as today.
  - Insert user geo rules: `rule_type` "geo", `rule_config` JSON `{ country, state, city }`.

## 2. API: GET /api/public/surveys

- **Resolve client IP to geo:** Use same DB table `ip_geolocation_cache`; on cache miss call ip-api.com (reuse logic or add small helper in API). Result: `userGeo: { country, state, city } | null`.
- **Build targeting per survey:** From `targeting_rules`:
  - Page: same as now (pageType, pageRules from exact/contains).
  - User: if any rule with `rule_type` "geo", set `userType: "specific"` and `userRules: [{ type: "geo", country, state, city }]` from rule_config; else `userType: "all"`, `userRules: []`.
- **Response:** `{ surveys: [...], userGeo: { country, state, city } }`. Each survey has `targeting` including `userType` and `userRules`.
- **Logging:** Server log: client IP, resolved userGeo, and for each survey with user rules whether geo matched (for testing).

## 3. Embed

### Types (`apps/embed/src/types.ts`)
- `UserGeoRule`: `{ type: "geo"; country?: string; state?: string; city?: string }`.
- `Targeting`: add `userType?: "all" | "specific"`, `userRules?: UserGeoRule[]`, `userGeo?: { country?: string; state?: string; city?: string }`.

### fetch.ts
- Response: `{ surveys, userGeo }`. Return both; caller stores `userGeo` and passes to targeting match.

### targeting.ts
- `matchesTargetingRules(targeting, userGeo)`:
  - Page rules: unchanged.
  - User rules: if `targeting.userType === "specific"` and `targeting.userRules?.length`:
    - If no `userGeo`, treat as no match (or match nothing for geo rules).
    - Otherwise require at least one user rule to match. For "geo" rule: match iff (rule.country empty or equals userGeo.country) && (rule.state empty or equals userGeo.state) && (rule.city empty or equals userGeo.city). Case-insensitive, trim.
  - Add console logs: e.g. "[PFM Surveys] userGeo: ...", "[PFM Surveys] user rule (geo): ... matched: true/false".

### index.ts
- Fetch surveys and userGeo; pass userGeo into `matchesTargetingRules(targeting, userGeo)` and log when evaluating each survey.

## 4. Logging (Testing)

- **Console (embed):** Log userGeo when received; in matchesTargetingRules log each user rule and match result.
- **Server (API):** Log on GET /api/public/surveys: clientIp, userGeo; optionally per survey with user rules: survey id/name, userRules, userGeo, geoMatch true/false.

## Files to Touch

| Area | File | Changes |
|------|------|---------|
| Admin types | `apps/admin/src/types/survey-editor.ts` | UserGeoRule, targeting.userType, userRules, default |
| Admin UI | `apps/admin/src/components/survey-editor/TargetingSection.vue` | Specific users radio, user rules list, Geo inputs |
| Admin load/save | `apps/admin/src/composables/useSurveyEditor.ts` | Load/save userType, userRules; split targetingRules |
| Admin summary | `apps/admin/src/components/survey-editor/SummarySection.vue` | Show user targeting summary if needed |
| API embed | `apps/api/src/routes/embed.ts` | Resolve IP→geo, build userRules in targeting, return userGeo, logs |
| API surveys | `apps/api/src/routes/surveys.ts` | PUT/POST: save user geo rules; GET :id can stay (returns raw rules) |
| Embed types | `apps/embed/src/types.ts` | UserGeoRule, Targeting.userType, userRules, userGeo |
| Embed fetch | `apps/embed/src/fetch.ts` | Return { surveys, userGeo } |
| Embed targeting | `apps/embed/src/targeting.ts` | matchesTargetingRules(targeting, userGeo), geo match + logs |
| Embed index | `apps/embed/src/index.ts` | Pass userGeo, log survey evaluation |

## IP → Geo in API
- Reuse `ip_geolocation_cache` and ip-api.com. Add a small helper in API (e.g. in embed route or a shared `services/geo.ts`) that: 1) check cache by IP, 2) if miss call ip-api.com, 3) upsert cache, 4) return { country, state, city }. Use existing env `IP_API_KEY`.
