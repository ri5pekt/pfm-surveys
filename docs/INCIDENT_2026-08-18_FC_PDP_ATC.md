# Incident report: PFM Surveys vs Particle Face Cream ATC decline

**Date of report:** 19 August 2026, ~12:30 Israel time (IDT, UTC+3)  
**Scope:** Read-only investigation of PFM Surveys (code, production VPS `2.24.70.59`, Postgres, nginx, git, live PDP HTML/CSS).  
**Production was not modified.** No surveys were disabled, no deploys, no DB writes, no service restarts.

**Affected page:** `https://www.particleformen.com/product/particle-face-cream/?v=2`

**Central question:** Did PFM Surveys begin appearing more frequently or interfere with the product-page CTA on 18 August 2026, causing visitors to attempt Add to Cart less often?

**Answer: Likely yes.**

---

## 1. Executive conclusion

PFM Surveys **likely contributed** to the 18 August Add-to-Cart decline.

Two Face Cream PDP surveys had **zero impressions on 16 and 17 August**. They started displaying about one minute after an admin save at **12:05 Israel time on 18 August**. The primary widget waits **39 seconds**, then sits `position: fixed` at the bottom of the viewport with `z-index: 999999`, covering the theme sticky ATC bar (`.add-to-cart-fixed-bar`, `z-index: 99`).

Heatmap reported that `pfm-survey` became the most-clicked element on 18 August, with at least 632 sessions interacting with close/button. That matches **677 Time-on-Page dismiss events** the same day.

The 16 August `particleformen.com` → `www.particleformen.com` redirect is **not** the switch that turned these surveys on.

This is strong correlation plus a confirmed overlay mechanism. It is **not** a joined exposed-vs-unexposed ATC experiment, because PFM Surveys does not record Add to Cart.

---

## 2. Incident context (given)

Observed on the Face Cream PDP:

- Add-to-Cart **request volume dropped**, but New Relic recorded **zero ATC errors** and **no latency regression**.
- Heatmap ATC click rate:
  - 16 August: **21.1%**
  - 17 August: **18.6%**
  - 18 August: **14.0%**
- On 18 August, `pfm-survey` became the **most-clicked element** on the page.
- At least **632 sessions** interacted with the survey close/button.
- The survey was **not** among top-clicked elements on 16 or 17 August.
- A permanent redirect from `particleformen.com` to `www.particleformen.com` was enabled on **16 August ~16:27 Israel time**. Before that, the hosts were separate browser origins.

---

## 3. Exact surveys active on affected pages

Production site:

- Internal UUID: `5673cb20-1829-4c1d-bd61-b2173b7ca9ed`
- Public `site_id`: `site_5e62835ec4bea8e02361303e00f30eed`
- Name: Particle for Men
- Allowed domains: `{*.particleformen.com, particleformen.com}`
- `allow_any_domain`: false

There is **no homepage survey** and **no catch-all `/product/` survey**. There are **no start/end dates**, **no device targeting**, and **no configuration versioning**. Display type for all of these is admin type `popover` (fixed-position widget, not a dimmed modal). Current app version: **v1.3.3**, git **`bbdd890e1775e335bebe8612843aabc4947e5a23`**.

### 3.1 On the Face Cream PDP (including `?v=2`)

#### FC PDP - Time on Page - Objections

- **ID:** `4331061f-323c-4774-8424-ff8368acdf29`
- **Status:** active
- **Created:** 2026-08-12 08:51:45 UTC = **12 Aug 11:51 IDT**
- **Last saved:** 2026-08-18 09:05:23 UTC = **18 Aug 12:05:23 IDT**
- **Trigger:** `timing_mode = delay`, `show_delay_ms = 39000` (39 seconds after page load)
- **Frequency (configured):** `once`
- **Frequency (actual embed behavior):** **not honored** — see §7
- **Sample rate:** 100%
- **Device targeting:** none
- **Position:** `bottom-right`; on viewports `<768px` CSS forces full-width bottom sheet
- **Close button:** yes; **minimize:** no
- **Question:** “What's the one thing stopping you from trying Particle Face Cream today?” (required text)
- **Targeting (OR of contains rules):**
  - `contains "/product/particle-face-cream"`
  - `contains "gifts"`
- **First impression:** 2026-08-18 09:06:33 UTC = **18 Aug 12:06:33 IDT**
- **18 Aug totals:** 1,752 impressions · 677 dismissals · 157 answers

#### FC PDP - Exit Intent - Objections

- **ID:** `1e9e1ba5-0359-416f-90a7-1837debe40bc`
- **Status:** active
- **Created:** 2026-08-12 08:53:34 UTC = **12 Aug 11:53 IDT**
- **Last saved:** 2026-08-18 09:08:13 UTC = **18 Aug 12:08:13 IDT**
- **Trigger:** `timing_mode = exit_intent` (document `mouseout` toward browser chrome; desktop-oriented; armed after 1.5s)
- **Frequency (configured):** `once` (**not honored**)
- **Sample rate:** 100%
- **Targeting (OR):**
  - `contains "/product/particle-face-cream/"`
  - `contains "gifts"`
- **Question:** “Before you go, what would have made you feel confident enough to try it?”
- **Runtime note:** the embed shows **one survey at a time**. Time-on-Page is returned earlier in `GET /api/public/surveys` and occupies the slot with a 39s timer (`displayInProgress = true`). Exit Intent is only armed **after Time-on-Page is shown and closed**.
- **First impression:** 2026-08-18 09:12:51 UTC = **18 Aug 12:12:51 IDT**
- **18 Aug totals:** 134 impressions · 40 dismissals · 16 answers

### 3.2 Thank-you page only (cannot affect PDP ATC)

#### FC Post-Purchase - Objections

- **ID:** `8ba965e0-381c-47dd-86b4-ba57a5455ddf`
- **Status:** active
- **Trigger:** `timing_mode = custom_event`, event name `thankyou_new_customer_face_cream`, optional delay 3s
- **Targeting:** `contains "/thank-you-order/"`
- **Created:** 12 Aug 2026; targeting last written 16 Aug 08:07 UTC; survey last saved 18 Aug 09:07:07 UTC
- **First impression:** 16 Aug 08:03:33 UTC = **16 Aug 11:03 IDT** (one test/early event)
- **18 Aug totals:** 112 impressions · 66 dismissals · 10 answers

This fires after purchase. It cannot explain a PDP ATC drop. It does show Face Cream orders still occurred on the 18th.

### 3.3 Other active production surveys (not this PDP)

| Name | ID | Trigger | Targeting |
|---|---|---|---|
| AGS LP \| Worth It Multiple Choice Question \| 08/17/2026 | `24d0d121-9997-4f01-8e77-147bfa58bf81` | scroll 50% | `/lpage/particle-anti-gray-serum-el` |
| Face Shield LP \| Activity Single Choice Question \| 08/16/2026 | `252e30d4-4f76-4300-b621-c867e9780468` | scroll 50% | `/lpage/particle-performance-face-shield-el` |
| IM LP \| Gap Single Choice Question \| 07/28/2026 | `ad9c59c7-563e-4aaf-931f-9dfd82c3a657` | scroll 50% | `/lpage/particle-infinite-male` |

Staging site `Particle for Men Staging` has unrelated surveys (`Age`, etc.) and is not on www.particleformen.com.

Live confirmation (19 Aug ~12:20 IDT): `GET https://pfm-surveys.cloud/api/public/surveys?site_id=site_5e62835ec4bea8e02361303e00f30eed` returned the six active surveys above, with the same targeting/triggers as the database.

---

## 4. Configuration and deployment timeline

| Israel time | UTC | Event |
|---|---|---|
| 12 Aug 11:51–11:56 | 08:51–08:56 | Three FC surveys created. No impressions. |
| 16 Aug 10:46 | 07:46 | git commit `bbdd890` — v1.3.3 custom event trigger. |
| 16 Aug 10:48:42–10:49:25 | 07:48:42–07:49:25 | Production `api`, `admin`, `worker` containers created/started. Image api `sha256:b97fdcf61964b25a2a3670260116d4041b83f3569f6e5311fcae22becf68f69b`. |
| 16 Aug 10:48:55 | 07:48:55 | nginx: `recv() failed (104: Connection reset by peer)` on `OPTIONS /api/public/surveys` during bounce. One-off. |
| 16 Aug 11:03 | 08:03 | First Post-Purchase impression (thank-you / custom event). |
| 16 Aug ~16:27 | ~13:27 | Store enables apex → www 301. Not a PFM Surveys deploy. |
| 17 Aug 12:48–12:50 | 09:48–09:50 | AGS LP survey created/activated (unrelated landing page). |
| **18 Aug 12:05:16–12:05:23** | **09:05:16–09:05:23** | **Time-on-Page saved. Targeting rows rewritten to PDP + gifts. Redis cache `surveys:v1:5673cb20-…` invalidated.** |
| **18 Aug 12:06:33** | **09:06:33** | **First Time-on-Page impression (70 seconds after save).** |
| 18 Aug 12:07:07 | 09:07:07 | Post-Purchase saved again. |
| 18 Aug 12:08:08–12:08:13 | 09:08:08–09:08:13 | Exit Intent saved; targeting rewritten to PDP + gifts. |
| 18 Aug 12:12:51 | 09:12:51 | First Exit Intent impression. |
| 19 Aug ~12:20 | 09:20 | Both PDP surveys still **active**. Time-on-Page already had **940 impressions** that morning. |

Prior embed/API commits in window:

- `86704fec` 11 Aug 13:46 IDT — harden exit intent so it does not fire on page load
- `5f6e2937` 11 Aug 13:17 IDT — v1.3.2 exit intent trigger
- `bbdd890e` 16 Aug 10:46 IDT — v1.3.3 custom event

**No frontend bundle change on 18 August.** Last production recreate of api/admin/worker was 16 August 10:48 IDT.

There is **no automatic schedule** that activates surveys. Activation is the `surveys.active` boolean plus client-side targeting.

There is **no survey config audit log**. `PUT` survey deletes and re-inserts `targeting_rules`, so rule `created_at` is last-save time, not original targeting. Inference that 18 Aug ~12:05 is go-live rests on: `surveys.updated_at` + rewritten targeting + `survey_stats.first_impression_at` 70s later + `event_dedup` empty for those IDs before that instant.

---

## 5. Exposure counts

### 5.1 What is and is not measurable

| Data | Stored? | Where |
|---|---|---|
| Impression / dismiss / answer occurrence + time + survey_id | Yes | `event_dedup` (`event_type`, `processed_at`, `survey_id`, `event_uid`) |
| Lifetime counters | Yes | `survey_stats` |
| Page URL, device, hostname, `anonymous_user_id`, `session_id` | **Answers only** | `responses` |
| Eligible sessions / page loads / “shown vs not shown” | **No** | Embed decides client-side; no page-load event |
| Time from page load to display | **No** | Only configured delay (39,000 ms) |
| ATC / conversion | **No** | PFM Surveys does not record cart activity |
| Unique visitors shown the survey | **Not for impressions** | Dedup rows are events, not unique users. Unique users only exist on answer rows. |

Worker writes **answers** into `responses`. Impression and dismiss only increment `survey_stats` and insert `event_dedup`. The old `events` table was dropped (`20260209_drop_rollup_and_events.sql`).

### 5.2 Daily event_dedup for the three FC surveys (Israel calendar days)

| Day (Israel) | Time-on-Page impr / dismiss / answer | Exit Intent impr / dismiss / answer | Post-Purchase impr / dismiss / answer |
|---|---|---|---|
| 16 Aug | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 0 / 1 |
| 17 Aug | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| 18 Aug | **1,752 / 677 / 157** | **134 / 40 / 16** | 112 / 66 / 10 |
| 19 Aug (through ~12:20) | 940 / 347 / 68 | 36 / 9 / 4 | 64 / 31 / 4 |

Sitewide `event_dedup` impressions (all surveys, Israel): 16 Aug **110** · 17 Aug **121** · 18 Aug **2,265**.

18 Aug Time-on-Page residual: 1,752 − 677 − 157 = **918 impressions with no dismiss and no answer** (widget still on screen when the session ended, or beacon failed — still “exposed”).

Heatmap 632 close sessions ≈ **677** Time-on-Page dismissals.

### 5.3 Hourly Time-on-Page and Exit Intent on 18 August (Israel)

Counts start at 12:00 because that is when the surveys first appeared.

| Hour IDT | ToP impressions | ToP dismiss | ToP answers | Exit impressions | Exit dismiss |
|---|---|---|---|---|---|
| 12:00 (from 12:06) | 98 | 43 | 6 | 6 | 0 |
| 13:00 | 72 | 20 | 4 | 2 | 1 |
| 14:00 | 167 | 78 | 13 | 14 | 4 |
| 15:00 | **240** | **107** | 30 | 8 | 1 |
| 16:00 | 141 | 56 | 11 | 17 | 4 |
| 17:00 | 160 | 55 | 18 | 15 | 6 |
| 18:00 | 152 | 61 | 12 | 17 | 6 |
| 19:00 | 155 | 56 | 12 | 13 | 2 |
| 20:00 | 143 | 55 | 15 | 9 | 2 |
| 21:00 | 170 | 58 | 17 | 13 | 4 |
| 22:00 | 133 | 45 | 12 | 10 | 3 |
| 23:00 | 121 | 43 | 7 | 10 | 7 |

### 5.4 Answer-only URL / device / host (18 Aug)

Time-on-Page answers by class:

- Face Cream PDP path (`%/product/particle-face-cream%`): **188** lifetime in the query window; **171** on 18 Aug including locales
- `gifts` in URL but not Face Cream path: **37** (spillover from the OR rule)
- Devices on Face Cream PDP answers 18 Aug: **Mobile 118 · Desktop 48 · Tablet 4** (69% mobile)
- Hostname: **224 www** vs **1 apex** (`particleformen.com`) across Time-on-Page answers
- `?v=2` almost never stored on answer `page_url`; targeting still matches the path via `contains`

Top Time-on-Page answer paths on/after 18 Aug 00:00 UTC (no query string):

- `https://www.particleformen.com/product/particle-face-cream/` — 179
- `https://www.particleformen.com/product/particle-instant-eye-firming-cream/` — 12
- `https://www.particleformen.com/product/particle-hair-shampoo/` — 12
- locale Face Cream PDPs (`/gb/`, `/ca/`, `/au/`) — small counts
- those non-FC product paths matched because the URL contained `gifts` (query or path), not because `/product/` is a global target

Unique Time-on-Page **answer** users on Face Cream PDP, 18 Aug Israel: **132 unique users / 133 sessions / 135 answer rows**. One user had 2+ answer sessions. This is **completers**, not everyone shown the survey.

---

## 6. www redirect and visitor state

### 6.1 Storage (code: `apps/embed/src/utils.ts`)

```
localStorage  pfm_user_id:{siteId}
localStorage  pfm_shown_surveys:{siteId}          // { [surveyId]: timestamp }
sessionStorage pfm_session_id:{siteId}
sessionStorage pfm_sess_shown:{siteId}:{surveyId}
```

`siteId` is the public site id string, **not** the hostname. There are **no cookies** for this. There is **no server-side eligibility, dismissal, or completion store** used before display.

Because web storage is origin-scoped, `https://particleformen.com` and `https://www.particleformen.com` are **different stores** even with the same key names. A 301 to www **does** create a new user id and empty shown-map.

### 6.2 Did the 16 Aug redirect cause the 18 Aug spike?

**No.**

- These two PDP surveys had **never been shown** before 18 Aug 12:06 IDT, so there was no dismissal/frequency state to lose.
- Sitewide impression volume stayed low on 16–17 Aug (110 / 121) and exploded on 18 Aug (2,265) at the config-save timestamp, not at 16:27 IDT on the 16th.
- Allowlist already included both `particleformen.com` and `*.particleformen.com` (www matches the wildcard). `isOriginAllowed` in `apps/api/src/routes/embed.ts`.
- CORS is `origin: true` (allow all). Domain checks apply to **POST /api/public/events**, not GET surveys. Event 403s were flat: 22 / 18 / 26 on 16 / 17 / 18 Aug UTC log days.
- `?v=2` is not part of storage keys or frequency. Targeting uses `window.location.href` and `pathname` with `contains()` after lowercasing and stripping trailing slashes (`apps/embed/src/targeting.ts`). Path `/product/particle-face-cream/` matches with or without `?v=2`.

### 6.3 Frequency-cap bug (important, independent of redirect)

Admin / DB values: `until_submit` | `once` | `always`  
Embed `shouldShowSurvey()` only branches on `once_per_user` | `once_per_session`.

Configured `once` **never matches**, so the function always returns true (aside from `shownInThisCycle` on the same page load). Completing or closing does **not** suppress the next page load. Files: `apps/embed/src/targeting.ts`, `apps/admin/src/components/survey-editor/BehaviorSection.vue`, `apps/api/src/routes/surveys.ts`.

This inflates repeat impressions and means the overlay can return every visit after 39s. It does **not** by itself explain why 16–17 Aug were zero; go-live timing does.

---

## 7. Frontend interference

### 7.1 Survey widget

Files: `apps/embed/src/render.ts`, `apps/embed/src/display.ts`, `apps/embed/src/index.ts`.

- `position: fixed`
- `z-index: 999999`
- Desktop: `bottom: 20px; right: 20px; min-width: 300px; max-width: 420px`
- Mobile `@media (max-width: 767px)` and JS `innerWidth < 768`: `bottom: 0; left: 0; right: 0; max-width: none` (full-width bottom sheet)
- **No** full-screen backdrop, **no** `overflow: hidden` on `body`, **no** focus trap, **no** `pointer-events` leftover, **no** document-level `preventDefault` / `stopPropagation` on clicks
- Scroll listener is `{ passive: true }` (scroll surveys only)
- Close: `dismiss` event, 200ms animation, `surveyEl.remove()`, then `onClose` → `showNextSurvey()`
- These surveys have `show_minimize_button = false`

Approximate mobile box: ~250–320px tall full-width at the bottom of a ~390×844 viewport, covering the sticky ATC (110px) completely.

### 7.2 Theme sticky ATC

Loaded on the Face Cream PDP:  
`https://www.particleformen.com/wp-content/themes/particleformen/assets/css/th-products.css`

```css
.add-to-cart-fixed-bar {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 0;
  height: 80px;          /* 110px in the mobile breakpoint */
  z-index: 99;
}
```

Inner layout is `justify-content: space-between`: product info left, **`.wrapper-add-to-cart` on the right**. The survey is also bottom-right. Direct collision on desktop.

The PDP HTML also has two in-flow ATC buttons (`.single_add_to_cart_button`) — one in the 3-unit `th-products` block, one in `.product-cart-gifts .submit-block`. The sticky bar is the CTA that remains after scroll.

PDP also loads: PFM embed, VWO (`z-index: 999999` in skip-link/VWO CSS), Klaviyo onsite, custom-coupon JS, cart-sidebar, Clarity tag `v7efqhqjpu`. Embed tag:

```html
<script async src="https://pfm-surveys.cloud/embed/script.js?site_id=site_5e62835ec4bea8e02361303e00f30eed" id="survey-embed-js"></script>
```

### 7.3 Reproduction note

Live JS was **not** run against production so this investigation would not create extra impressions/events. Overlay conclusion is from production CSS + embed source + widget dimensions. Console of a live session was not captured.

---

## 8. Performance and errors (16–18 August)

Nginx access logs rotate at **midnight UTC** (VPS clock is UTC).

| UTC log day | embed.js | GET /api/public/surveys | POST /events | events 202 | events 403 | events 429 | 5xx |
|---|---|---|---|---|---|---|---|
| 16 Aug (`access.log.3.gz`) | 34,914 | 130,801 | 248 | 127 | 22 | 0 | 1 surveys 5xx |
| 17 Aug (`access.log.2.gz`) | 30,434 | 120,162 | 468 | 250 | 18 | 0 | 0 |
| 18 Aug (`access.log.1`) | 37,083 | 105,201 | **7,371** | **3,907** | 26 | 0 | 0 |

Page-load proxies (embed.js + GET surveys) did **not** spike on the 18th. Event posts jumped ~15×, matching widgets actually displaying.

- Worker 16 Aug: 175 success, avg 166ms, p95 362ms, 0 fail
- Worker 17 Aug: 190 success, avg 189ms, p95 363ms, 0 fail
- Worker 18 Aug: **3,400** success, avg 148ms, p95 358ms, max 492ms, **0 fail**
- API docker logs: `LOG_LEVEL=warn`, rotated files tiny; no error burst
- Redis: BullMQ `event-ingestion` keys present; live nonces/rate-limit keys normal
- Geo endpoint volume: 0 in nginx (these surveys have no geo rules)
- HMAC is not used on public embed GET/POST events (nonce replay only)

No evidence of JS asset 5xx, CORS storm, auth/HMAC failure, DB/Redis incident, or duplicate embed script versions. Duplicate initialization was not observed in code (`init()` once on DOMContentLoaded).

---

## 9. Causal hypothesis

PFM does **not** record ATC. There is **no** shared visitor id with Clarity or heatmap unless they later export `pfm_user_id`.

**Safe join key (do not dump raw values):**

- Browser: `localStorage["pfm_user_id:site_5e62835ec4bea8e02361303e00f30eed"]`
- DB on **answers only:** `responses.anonymous_user_id`
- Session: `sessionStorage["pfm_session_id:…"]` / `responses.session_id`
- Clarity project: `v7efqhqjpu` (separate cookie)
- Fuzzy join fallback: timestamp + URL + device — weak

| Hypothesis | Verdict |
|---|---|
| Survey **exposure** rose enough to matter on 18 Aug | **Supported.** 0 → 1,752 Time-on-Page impressions while embed/survey fetches did not increase. |
| Only **interaction** (click/close) correlates with lower ATC | **Incomplete.** Heatmap closes ≈ dismissals, but **918** impressions had no dismiss/answer — overlay left up. |
| Shown mainly to already **low-intent** visitors | **Contradicted for Time-on-Page** (39s dwell). Exit Intent is the low-intent cohort and is small (134). |
| Can explain a **meaningful** slice of 18.6% → 14.0% ATC | **Plausible, not proven.** Overlay hits high-intent + sticky ATC. Needs heatmap PDP session denominator. |

Post-purchase 112 impressions on 18 Aug are **after** ATC and do not explain the drop.

---

## 10. Estimated maximum plausible conversion impact

Given:

- ATC rate 21.1% → 18.6% → **14.0%** (−4.6pp vs 17 Aug; −7.1pp vs 16 Aug)
- 1,752 Time-on-Page exposures after 12:06 IDT on 18 Aug
- 677 explicit closes
- 918 abandoned with widget likely still visible
- 69% of PDP answers mobile
- Overlay covers sticky ATC by z-index, not by ATC API failure (matches New Relic: zero ATC errors, no latency regression)

**Upper bound (too high):** if all 1,752 exposed sessions would have converted at 18.6% and instead converted at 0% while blocked → ~326 lost ATCs. Unrealistic because many still bought (thank-you survey 112) and some closed then added to cart.

**More conservative:** if a quarter of the 918 abandoners would have clicked sticky ATC at ~18% → on the order of **~40 lost ATCs from abandoners alone**, before counting the 677 closers who may have clicked the survey instead of ATC. That can be a **material fraction** of a 4.6pp rate drop. It cannot be shown to be **all** of it without the heatmap session count for that PDP.

---

## 11. Confirmed facts vs hypotheses

### Confirmed

- PDP surveys: 0 impressions 16–17 Aug.
- Admin save Time-on-Page 18 Aug 12:05:23 IDT; first impression 12:06:33 IDT.
- 1,752 + 134 PDP impressions that day; dismissals 677 + 40.
- Widget `z-index: 999999` vs sticky ATC `z-index: 99`.
- Frequency value `once` is not implemented in embed.
- Last production code deploy 16 Aug 10:48 IDT, not 18 Aug.
- No API/worker/nginx 5xx incident on 18 Aug.
- Event POST volume exploded; page-load survey fetches did not.
- `gifts` contains-rule spilled onto other product URLs.
- Surveys still **active** on the morning of 19 Aug (940 more Time-on-Page impressions by ~12:20 IDT).

### Hypotheses / limits

- Exact targeting **before** the 18 Aug save is unknown (no audit table).
- Unique visitors **shown** (not just events / answerers) unknown.
- Cannot join exposed vs unexposed to ATC.
- Other 18 Aug store/VWO/Klaviyo/promo changes were out of PFM scope.
- Live DOM screenshots/console of production were not captured (to avoid extra impressions).

---

## 12. Mitigation (not implemented)

**Safe immediate:** set `active = false` on:

1. `4331061f-323c-4774-8424-ff8368acdf29` (Time-on-Page)
2. `1e9e1ba5-0359-416f-90a7-1837debe40bc` (Exit Intent)

Leave Post-Purchase (`8ba965e0-…`) if thank-you research should continue. Saving inactive in admin invalidates Redis `surveys:v1:5673cb20-1829-4c1d-bd61-b2173b7ca9ed`. No deploy required. Embed script cache is 5 minutes (`Cache-Control: max-age=300`) but survey **config** is fetched per page load (Redis TTL 300s, invalidated on save).

**Permanent fix (product/eng):**

1. Map `until_submit` / `once` / `always` to embed logic (`once_per_user` / `once_per_session`) and honor completion.
2. Do not cover sticky ATC: bottom offset ≥ 80–110px, or lower z-index, or disable full-width mobile sheet on PDPs.
3. Tighten targeting: Face Cream path only; remove `gifts` OR.
4. Add survey config audit (who, when, before/after targeting and active flag).
5. Persist impression `page_url`, `device`, `anonymous_user_id` — not counters only.

---

## 13. Code, commits, queries, logs

### Git / deploy

- HEAD production and local main: `bbdd890e1775e335bebe8612843aabc4947e5a23`
- Message: `v1.3.3: Add custom event survey trigger`
- Author time: 2026-08-16 10:46:13 +0300
- VPS path: `/var/www/pfm-surveys.cloud`
- Compose: `docker compose -f docker-compose.yml -f docker-compose.prod.yml`
- Containers: `pfm-surveys-prod-api-1`, `pfm-surveys-prod-admin-1`, `pfm-surveys-prod-worker-1`, `surveys-postgres`, `surveys-redis`

### Key files

- Embed init / queue / custom events: `apps/embed/src/index.ts`
- Frequency + URL targeting: `apps/embed/src/targeting.ts`
- Storage keys: `apps/embed/src/utils.ts`
- Widget HTML/CSS: `apps/embed/src/render.ts`
- Show/close/impression: `apps/embed/src/display.ts`
- Public API + origin check: `apps/api/src/routes/embed.ts`
- Admin save / targeting rewrite / cache bust: `apps/api/src/routes/surveys.ts`
- Redis TTL 300s: `apps/api/src/redis.ts`
- Event persistence: `apps/worker/src/ingestion/processor.ts`

### Useful read-only SQL (already run)

```sql
-- Active production surveys
SELECT s.id, s.name, s.active, s.created_at, s.updated_at
FROM surveys s
JOIN sites st ON st.id = s.site_id
WHERE st.site_id = 'site_5e62835ec4bea8e02361303e00f30eed'
  AND s.active = true;

-- Hourly events Israel time
SELECT date_trunc('hour', processed_at AT TIME ZONE 'Asia/Jerusalem') AS hour_israel,
       s.name, e.event_type, COUNT(*) AS n
FROM event_dedup e
JOIN surveys s ON s.id = e.survey_id
WHERE e.survey_id IN (
  '4331061f-323c-4774-8424-ff8368acdf29',
  '1e9e1ba5-0359-416f-90a7-1837debe40bc',
  '8ba965e0-381c-47dd-86b4-ba57a5455ddf'
)
AND processed_at >= '2026-08-15 21:00:00+00'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

Do not output raw `anonymous_user_id`, IPs, or answer text when sharing further.

---

## 14. Direct answer

**Did PFM Surveys begin appearing more frequently or interfere with the product-page CTA on 18 August, causing visitors to attempt Add to Cart less often?**

**Yes, they began appearing more frequently — from none to ~1,752 Time-on-Page impressions after 12:06 Israel time — and the widget sits on top of the sticky ATC.** That is a credible cause of fewer ATC attempts. The www redirect is a side story. Causation vs 100% of the 4.6pp heatmap drop is not proven without joining heatmap/Clarity session volume to survey exposure.
