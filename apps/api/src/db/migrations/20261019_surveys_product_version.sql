-- Product line and the earlier survey this one continues.
-- previous_version_id is set from name pairs only: re-runs, revised copies, and same-name repeats.
-- Series (#1/#2/#3) and translations are different questions, so they are not linked.

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES surveys(id) ON DELETE SET NULL;

UPDATE surveys
SET product = CASE
    WHEN name ILIKE 'FC LP%' OR name ILIKE 'FC YNG LP%' OR name ILIKE 'FC PDP%' OR name ILIKE 'FC Post-Purchase%' THEN 'Face Cream'
    WHEN name ILIKE 'AGS LP%' THEN 'Anti-Gray Serum'
    WHEN name ILIKE 'IEFC LP%' THEN 'Instant Eye Firming Cream'
    WHEN name ILIKE 'Shampoo%' THEN 'Shampoo'
    WHEN name ILIKE 'Eyebag Killer Set LP%' THEN 'Eyebag Killer Set'
    WHEN name ILIKE 'HC LP%' OR name ILIKE 'Pre Purchase- HC%' THEN 'Hand Cream'
    WHEN name ILIKE 'SHG LP%' OR name ILIKE 'Pre Purchase- SHG%' THEN 'Shaving Gel'
    WHEN name ILIKE 'Face Shield LP%' THEN 'Face Shield'
    WHEN name ILIKE 'IM LP%' THEN 'Infinite Male'
    WHEN name ILIKE 'NeoRoot LP%' THEN 'NeoRoot'
    WHEN name ILIKE 'DEO LP%' THEN 'Deodorant'
    WHEN name ILIKE 'AFC LP%' THEN 'Ab Cream'
    WHEN name ILIKE 'Groin Wash%' THEN 'Groin Wash'
    ELSE NULL
END
WHERE product IS NULL;

DO $$
DECLARE
    row record;
BEGIN
    FOR row IN SELECT name, product FROM surveys ORDER BY name LOOP
        RAISE NOTICE '% → %', row.name, COALESCE(row.product, '(none)');
    END LOOP;
END $$;

-- Later run points at the earlier run, ordered by first impression.
WITH ordered AS (
    SELECT s.id,
           row_number() OVER (ORDER BY ss.first_impression_at NULLS LAST, s.created_at, s.id) AS n
    FROM surveys s
    LEFT JOIN survey_stats ss ON ss.survey_id = s.id
    WHERE s.name ILIKE 'SHG LP | Competitors%'
)
UPDATE surveys AS later
SET previous_version_id = earlier.id
FROM ordered earlier
JOIN ordered later_row ON later_row.n = earlier.n + 1
WHERE later.id = later_row.id
  AND earlier.n = 1
  AND later.previous_version_id IS NULL;

WITH ordered AS (
    SELECT s.id,
           row_number() OVER (ORDER BY ss.first_impression_at NULLS LAST, s.created_at, s.id) AS n
    FROM surveys s
    LEFT JOIN survey_stats ss ON ss.survey_id = s.id
    WHERE s.name ILIKE 'FC LP | Supplements Category%'
)
UPDATE surveys AS later
SET previous_version_id = earlier.id
FROM ordered earlier
JOIN ordered later_row ON later_row.n = 2 AND earlier.n = 1
WHERE later.id = later_row.id
  AND later.previous_version_id IS NULL;

WITH ordered AS (
    SELECT s.id,
           row_number() OVER (ORDER BY ss.first_impression_at NULLS LAST, s.created_at, s.id) AS n
    FROM surveys s
    LEFT JOIN survey_stats ss ON ss.survey_id = s.id
    WHERE s.name ILIKE 'Face Shield LP | Activity%'
)
UPDATE surveys AS later
SET previous_version_id = earlier.id
FROM ordered earlier
JOIN ordered later_row ON later_row.n = 2 AND earlier.n = 1
WHERE later.id = later_row.id
  AND later.previous_version_id IS NULL;

UPDATE surveys AS revised
SET previous_version_id = original.id
FROM surveys original
WHERE revised.name ILIKE '%Brand Familiarity%(Revised)%'
  AND original.name ILIKE 'FC LP | Brand Familiarity%'
  AND original.name NOT ILIKE '%Revised%'
  AND revised.previous_version_id IS NULL;

WITH ordered AS (
    SELECT s.id,
           row_number() OVER (ORDER BY ss.first_impression_at NULLS LAST, s.created_at, s.id) AS n
    FROM surveys s
    LEFT JOIN survey_stats ss ON ss.survey_id = s.id
    WHERE s.name ILIKE 'FC LP Italy | Age Bracket%'
)
UPDATE surveys AS later
SET previous_version_id = earlier.id
FROM ordered earlier
JOIN ordered later_row ON later_row.n = 2 AND earlier.n = 1
WHERE later.id = later_row.id
  AND later.previous_version_id IS NULL;

UPDATE surveys AS rerun
SET previous_version_id = original.id
FROM surveys original
WHERE rerun.name ILIKE '%(Re-run)%HSA/FSA #1%'
  AND original.name ILIKE 'FC LP | FC HSA/FSA #1%'
  AND original.name NOT ILIKE '%Re-run%'
  AND rerun.previous_version_id IS NULL;
