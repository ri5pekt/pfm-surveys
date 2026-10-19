-- Test surveys are excluded from benchmarks, summary numbers, and attention cards.
-- Backfill runs only when the column is added, so a later manual uncheck survives the next deploy.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'surveys'
          AND column_name = 'is_test'
    ) THEN
        ALTER TABLE surveys ADD COLUMN is_test boolean NOT NULL DEFAULT false;
        UPDATE surveys
        SET is_test = true
        WHERE name ~* '\ytest\y';
        RAISE NOTICE 'Marked test surveys: %', (
            SELECT string_agg(name, ', ' ORDER BY name)
            FROM surveys
            WHERE is_test
        );
    END IF;
END $$;
