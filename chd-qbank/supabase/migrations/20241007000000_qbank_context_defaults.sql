-- Ensure context-related panel arrays default to empty arrays
-- This avoids null values when rows are inserted without explicit data.

DO $$
DECLARE
  col text;
  target record;
  columns constant text[] := ARRAY['context_panels', 'lab_panels', 'formula_panels'];
BEGIN
  FOREACH col IN ARRAY columns LOOP
    FOR target IN
      SELECT table_schema, table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = col
    LOOP
      EXECUTE format(
        'UPDATE %I.%I SET %I = ''[]''::jsonb WHERE %I IS NULL',
        target.table_schema,
        target.table_name,
        col,
        col
      );
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb',
        target.table_schema,
        target.table_name,
        col
      );
    END LOOP;
  END LOOP;
END
$$;
