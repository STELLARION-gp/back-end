-- Recommended contents (mentor resources: YouTube links and PDFs)
-- Apply this SQL to create the table.

CREATE TABLE IF NOT EXISTS recommended_contents (
  id SERIAL PRIMARY KEY,
  mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('youtube','pdf')),
  url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommended_contents_mentor ON recommended_contents(mentor_id);
CREATE INDEX IF NOT EXISTS idx_recommended_contents_type ON recommended_contents(source_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recommended_contents_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_recommended_contents() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;$$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_recommended_contents_updated_at
      BEFORE UPDATE ON recommended_contents
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at_recommended_contents();
  END IF;
END$$;