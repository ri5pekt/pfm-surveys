# Survey Deletion Handling

## Problem
When a survey is deleted while events are still pending in the Redis queue, the worker would fail to process those events due to foreign key constraint violations (`events.survey_id` references `surveys.id`).

This typically happens when:
1. User changes website domain/configuration and deletes old surveys
2. Events were already captured and queued before the deletion
3. Worker tries to process these orphaned events and fails

## Solution

We implemented a two-layer defense strategy:

### 1. Worker Graceful Handling (Primary Defense)
**File**: `apps/worker/src/ingestion/processor.ts`

The worker now catches foreign key constraint violations when inserting events and handles them gracefully:

- **Before**: Job would fail and retry 5 times, then move to failed queue
- **After**: Event is logged as a warning and skipped, job continues processing other events

```typescript
try {
    inserted = await db.insertInto("events").values({...}).executeTakeFirst();
} catch (insertErr) {
    // Handle foreign key constraint violations gracefully
    const errMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
    if (errMsg.includes("foreign key constraint") || errMsg.includes("violates")) {
        console.warn(`[Worker] Skipping event for deleted survey_id=${ev.survey_id}`);
        validationRejects += 1;
        continue; // Skip this event, don't fail the entire job
    }
    throw insertErr; // Re-throw other errors to trigger retry
}
```

**Benefits**:
- No job failures for deleted surveys
- Other events in the same batch are still processed
- Resilient to race conditions
- No data loss for valid events

### 2. Queue Cleanup on Deletion (Preventive Defense)
**Files**: 
- `apps/api/src/queues/eventIngestion.ts` (new function: `cleanupSurveyEvents`)
- `apps/api/src/routes/surveys.ts` (DELETE endpoint)

When a survey is deleted via the API, we now:
1. First clean up pending jobs in the Redis queue that contain events for that survey
2. Then delete the database records (as before)

```typescript
// In DELETE /api/surveys/:id
try {
    const removedJobs = await cleanupSurveyEvents(id);
    fastify.log.info(`Removed ${removedJobs} pending queue jobs for survey ${id}`);
} catch (queueErr) {
    // Log but don't fail - worker will handle orphaned events gracefully
    fastify.log.warn(`Failed to clean queue for survey ${id}:`, queueErr);
}
```

**Benefits**:
- Prevents orphaned events from entering the queue in the first place
- Reduces unnecessary worker processing
- Cleaner logs (fewer warnings)

**Limitations**:
- Only cleans "waiting" and "delayed" jobs
- Active/processing jobs are not affected (handled by layer 1)
- Queue cleanup failure doesn't block survey deletion (fail-safe design)

## Testing

To verify the fixes work:

1. Create a survey and generate some events
2. Delete the survey
3. Check logs - should see: `Removed N pending queue jobs for survey <id>`
4. If there were orphaned events, worker logs should show: `Skipping event for deleted survey_id=...`
5. No jobs should appear in the failed queue

## Foreign Key Constraints

The relevant foreign key constraints that are now handled gracefully:
- `events.survey_id` → `surveys.id`
- `events.site_id` → `sites.id`
- `answers.survey_id` → `surveys.id`
- `answers.question_id` → `questions.id`

All of these will now be caught and handled by the worker's graceful error handling.

## Future Considerations

### Alternative: Soft Delete Surveys
Instead of hard deleting surveys, we could add a `deleted_at` column and soft-delete:
- **Pros**: No orphaned events, full data retention, audit trail
- **Cons**: More complex queries, larger database

This could be implemented later if needed, but the current solution handles the problem effectively.

### Alternative: Cascade Delete on Foreign Keys
We could add `ON DELETE CASCADE` to foreign key constraints:
- **Pros**: Database automatically handles cleanup
- **Cons**: 
  - Doesn't help with Redis queue events (not in DB yet)
  - Loss of flexibility (can't recover deleted surveys)
  - Can accidentally delete more data than intended

The current solution is more flexible and resilient.
