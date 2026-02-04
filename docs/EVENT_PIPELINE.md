# Event pipeline: from embed to DB and rollups

This document describes how survey events (impression, answer, dismiss) flow from the browser into the database and rollup tables, and how we avoid losing data.

## Overview

```
Embed (browser)  →  API POST /api/public/events  →  Redis (BullMQ)  →  Worker  →  DB (events + answers)
                                                                              →  Rollup worker  →  rollups_daily, daily_unique_users
```

## 1. Embed sends events

-   **Location:** `apps/embed/src/events.ts`
-   Events are queued in memory and sent in batches to `POST {apiUrl}/api/public/events` (with 1s debounce).
-   **Retries:** On 5xx or 503 (queue unavailable), the embed retries up to 3 times with backoff (2s, 6s, 15s). On final failure, events are pushed back onto the in-memory queue so the next flush or page unload can try again.
-   **Replay protection:** Each request includes a `nonce`; the API stores it in Redis and rejects duplicates (409).

## 2. API receives and enqueues

-   **Location:** `apps/api/src/routes/embed.ts`
-   Validates `site_id` and `events`, resolves site to internal UUID, normalizes events.
-   Enqueues batches to BullMQ queue `event-ingestion` (chunk size 50). **No direct DB write**; all persistence is via the worker.
-   If Redis or the queue is unavailable, the API returns **503** so the client can retry (embed retries automatically).
-   Response **202** with `accepted: N` means events are queued; they are not yet in the DB until the worker runs.

## 3. Redis / BullMQ

-   **Queue:** `event-ingestion`
-   **Job options:** 5 attempts, exponential backoff, `removeOnComplete: true`, `removeOnFail: false` (failed jobs kept for inspection).
-   **Data loss prevention:** Redis should run with **`maxmemory-policy noeviction`** (see `docker-compose.yml`) so queue keys are never evicted when memory is full. If the policy is `allkeys-lru`, jobs can be evicted and events lost before the worker processes them.

## 4. Ingestion worker

-   **Location:** `apps/worker/src/ingestion/processor.ts`
-   Consumes jobs from `event-ingestion`, inserts into `events` and (for `answer` events) into `answers`.
-   **Idempotency:**
    -   `events`: unique on `client_event_id`; conflict → do nothing.
    -   `answers`: unique on `(event_id, answer_index)`; conflict → do nothing.
-   **Retry safety:** If a job fails partway (e.g. after inserting some events) and BullMQ retries, events that were already inserted are skipped (conflict). For those duplicate events we **look up the existing `event.id`** and still insert answers. This avoids losing answers on retry when the event row already existed.
-   **Activity logging:** Each job start/success/failure is written to `worker_activity_logs` for observability.

## 5. Rollup worker

-   **Location:** `apps/worker/src/rollup/`
-   **rollup_tick:** Runs periodically (e.g. every 5 min), finds sites with new events (by comparing `max(events.id)` to `rollup_state.last_processed_event_id`), enqueues one `rollup_site` job per site.
-   **rollup_site:** In a transaction:
    -   Reads the next chunk of events (by `id > watermark`), inserts their ids into `processed_events` (on conflict do nothing).
    -   Aggregates by (site, survey, date) and updates `daily_unique_users` (one row per user per day per survey; conflict do nothing).
    -   **unique_users:** Only the count of **new** inserts into `daily_unique_users` is added to `rollups_daily.unique_users`, so we never double-count when the same user appears in multiple batches.
    -   Upserts `rollups_daily` (impressions, responses, dismissals, unique_users).
    -   Advances `rollup_state.last_processed_event_id` to the max event id in the chunk.

Rollup jobs use the same retry and fail-retention options as ingestion.

## What must run for no data loss

1. **API** – receives events and enqueues to Redis.
2. **Redis** – with `noeviction` (or at least no eviction of queue keys).
3. **Ingestion worker** – must run continuously so queued jobs are processed into `events` and `answers`. If the worker is down, events stay in Redis; if Redis restarts or evicts, they can be lost (hence noeviction + worker always on in production).
4. **Rollup worker** – optional for real-time answers (Survey Responses screen reads from `answers`), but required for `rollups_daily` and response counts on the surveys list.

## Quick checklist

-   [ ] Redis `maxmemory-policy noeviction` in production.
-   [ ] Ingestion worker running whenever the API is accepting events.
-   [ ] No date filter or limit that would drop old events (API and admin only filter when the client sends filters).
-   [ ] Embed retries on 5xx/503; API returns 503 when queue is down.
