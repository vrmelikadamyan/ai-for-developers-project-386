CREATE TABLE IF NOT EXISTS meeting_types (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 540)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  meeting_type_id UUID NOT NULL REFERENCES meeting_types(id),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  guest_name VARCHAR NOT NULL,
  guest_email VARCHAR NOT NULL,
  created_at TIMESTAMP(9) WITH TIME ZONE NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS bookings_starts_at ON bookings(starts_at);

-- All meeting types share this owner's calendar. Confirmations lock its only row.
CREATE TABLE IF NOT EXISTS owner_calendar (
  id INTEGER PRIMARY KEY CHECK (id = 1)
);
MERGE INTO owner_calendar (id) KEY(id) VALUES (1);
