CREATE TABLE IF NOT EXISTS meeting_types (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 540)
);
