# Spec: Custom event trigger

Add a timing mode so a survey shows when the host page fires a named event — not on page load / scroll / exit intent.

Who fires the event, and why, is out of scope. Any host can call the public API.

---

## Public API

```javascript
window.PFMSurveys.trigger(name: string, payload?: Record<string, unknown>): void
```

Example:

```javascript
window.PFMSurveys.trigger('checkout_completed');
window.PFMSurveys.trigger('plan_upgraded', { plan: 'pro' });
```

- `payload` is optional. Ignore unknown keys; do not require any field.
- No matching active survey → no-op + console log.
- Same event twice on one page → existing frequency / `shownInThisCycle` rules. Do not open a second widget for the same survey.

### Queue (host may fire before embed.js loads)

Hosts may install this stub first. Embed **must** adopt it and drain `_q`. Never drop queued events.

```javascript
window.PFMSurveys = window.PFMSurveys || {
  _q: [],
  trigger: function (name, payload) {
    this._q.push({ name: name, payload: payload || {} });
  }
};
```

On embed init, before or after fetch — but flush only once surveys are ready:

```ts
const existing = (window as any).PFMSurveys;
const queued = Array.isArray(existing?._q) ? existing._q.slice() : [];

function trigger(name: string, payload?: Record<string, unknown>) {
  // if surveys not loaded yet, queue internally; else handle
}

(window as any).PFMSurveys = { trigger, _q: [] };

// after fetchSurveys():
queued.forEach((item) => trigger(item.name, item.payload));
```

`trigger()` after init but while surveys are still loading must also queue internally, then flush. Do not drop events.

---

## Product behavior

New timing mode: `custom_event` (alongside immediate / delay / scroll / exit_intent).

- These surveys **must not** enter the page-load `showNextSurvey()` loop.
- They become eligible only when `trigger(name)` matches their configured event name.
- After the event, still apply page targeting, page exclude, geo, frequency, sample rate.
- Optional delay: if `delaySeconds` / `show_delay_ms` > 0, wait that long *after* the event, then show.
- Several surveys on the same event: existing one-at-a-time queue (`onClose` → `showNextSurvey`).

### Event name matching

- Trim whitespace.
- Exact, case-sensitive.
- Pattern: `^[a-z0-9_]{1,64}$` (validate in admin + API).
- `custom_event` with an empty name → never show (log a warning).

---

## Data model

```sql
ALTER TABLE display_settings
  ADD COLUMN IF NOT EXISTS custom_event_name VARCHAR(64) NULL;
```

- Migration: `apps/api/src/db/migrations/20260816_display_settings_custom_event.sql`
- Update Kysely types in `apps/api/src/db/types.ts` and `apps/worker/src/db/types.ts`.
- Store `"custom_event"` in existing `timing_mode` (text column).
- When `timing_mode !== 'custom_event'`, save `custom_event_name` as `NULL`.

---

## API

`apps/api/src/routes/surveys.ts` — extend `behavior`:

```ts
timing: z.enum(["immediate", "delay", "scroll", "exit_intent", "custom_event"]),
delaySeconds: z.number().default(0),
scrollPercentage: z.number().min(0).max(100).default(50),
frequency: z.enum(["until_submit", "once", "always"]),
customEventName: z.string().regex(/^[a-z0-9_]{1,64}$/).optional().or(z.literal("")),
```

If `timing === "custom_event"`, `customEventName` is required and must match the regex.

Persist on create and update:

- `timing_mode: behavior.timing`
- `custom_event_name: timing === "custom_event" ? behavior.customEventName : null`
- `show_delay_ms`: if timing is `delay`, **or** `custom_event` with `delaySeconds > 0`, store `delaySeconds * 1000`; else `0`

`GET /api/public/surveys`: include `custom_event_name` on `displaySettings` (plus existing `timing_mode`, `show_delay_ms`).

---

## Admin

### Types (`apps/admin/src/types/survey-editor.ts`)

Add `customEventName: string` to `behavior` (default `""`). Extend `timing` with `"custom_event"`.

### BehaviorSection.vue

New radio:

> **On a custom event** — when the host page calls `window.PFMSurveys.trigger('event_name')`

When selected, show:

- Event name input. Placeholder: `my_custom_event`. Hint: lowercase letters, numbers, underscores.
- Optional: reuse “Display after N seconds” as delay **after** the event.

### useSurveyEditor.ts

Load `customEventName` from `displaySettings.custom_event_name`. Save `behavior.customEventName`.

---

## Embed

### Types (`apps/embed/src/types.ts`)

```ts
timing_mode?: "immediate" | "delay" | "scroll" | "exit_intent" | "custom_event";
custom_event_name?: string | null;
```

### `index.ts`

1. Install `window.PFMSurveys.trigger` and drain the stub queue.
2. Keep `firedEvents: Set<string>` and an internal queue until surveys are fetched.
3. `findNextSurvey()`: if `timing_mode === "custom_event"`, skip unless that name is in `firedEvents`. Leave other checks unchanged.
4. On `trigger(name)`: add to `firedEvents`. If no survey is visible, call `showNextSurvey()`. If one is visible, wait for `onClose`.

```ts
function isWaitingForEvent(survey: Survey): boolean {
  return (survey.displaySettings?.timing_mode || "immediate") === "custom_event";
}

function eventMatches(survey: Survey): boolean {
  const expected = (survey.displaySettings?.custom_event_name || "").trim();
  return !!expected && firedEvents.has(expected);
}
```

Initial `showNextSurvey()` after fetch only auto-shows non-`custom_event` surveys.

Optional: extract helpers to `apps/embed/src/custom-events.ts` if `index.ts` gets noisy.

### Logs

`[PFM Surveys]` prefix:

- `trigger("…") received` (and whether surveys are loaded)
- `no survey listens for event "…"`
- `survey "…" matched custom event "…"`
- `survey "…" skipped (custom event not fired yet)`
- `adopted N queued trigger(s) from window.PFMSurveys._q`

---

## QA

1. Create a survey, timing = custom event, name = `test_event`. Activate.
2. Load a matching page, run `PFMSurveys.trigger('test_event')` in the console → survey shows.
3. Call `trigger('test_event')` **before** embed.js loads (stub + `_q`) → survey still shows after init.
4. `trigger('other_event')` → this survey does not show.
5. Frequency / page / geo rules still apply after the event.
6. Immediate / delay / scroll / exit-intent surveys unchanged.
7. No console errors when `trigger()` fires and nothing matches.

---

## Files to touch

| Area | Files |
|---|---|
| Migration | `apps/api/src/db/migrations/20260816_display_settings_custom_event.sql` |
| Types | `apps/api/src/db/types.ts`, `apps/worker/src/db/types.ts` |
| API | `apps/api/src/routes/surveys.ts`, `apps/api/src/routes/embed.ts` |
| Admin | `apps/admin/src/types/survey-editor.ts`, `BehaviorSection.vue`, `useSurveyEditor.ts` |
| Embed | `apps/embed/src/types.ts`, `apps/embed/src/index.ts` |

Rebuild embed after changes (`pnpm build:embed`). API serves `apps/embed/dist/embed.js` only.
