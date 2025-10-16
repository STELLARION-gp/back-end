-- Mentee Requests Table
-- Run this SQL against your PostgreSQL database to create the mentee_requests table.
-- You can apply it manually (psql) or integrate it into your migration process.

CREATE TABLE IF NOT EXISTS mentee_requests (
  id SERIAL PRIMARY KEY,
  mentor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT NOW()
);

-- Avoid duplicate requests between the same mentor and mentee
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentee_requests_pair ON mentee_requests(mentor_id, mentee_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_mentee_requests_mentor ON mentee_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentee_requests_mentee ON mentee_requests(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentee_requests_status ON mentee_requests(status);

-- Optional: simple ON UPDATE trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mentee_requests_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION set_updated_at_mentee_requests() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;$$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_mentee_requests_updated_at
      BEFORE UPDATE ON mentee_requests
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at_mentee_requests();
  END IF;
END$$;