CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  age_rating VARCHAR(10) NOT NULL,
  description TEXT,
  poster_url VARCHAR(500),
  duration_min INTEGER,
  genres VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS halls (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  rows_count INTEGER NOT NULL,
  seats_per_row INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  hall_id INTEGER NOT NULL,
  row_number INTEGER NOT NULL,
  seat_number INTEGER NOT NULL,
  CONSTRAINT seats_hall_id_row_number_seat_number_key
    UNIQUE (hall_id, row_number, seat_number)
);

CREATE TABLE IF NOT EXISTS showtimes (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL,
  hall_id INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  price NUMERIC(8, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  guest_email VARCHAR(100) NOT NULL,
  guest_name VARCHAR(100),
  user_id INTEGER,
  showtime_id INTEGER NOT NULL,
  seat_id INTEGER NOT NULL,
  price NUMERIC(8, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'paid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tickets_status_check
    CHECK (status IN ('booked', 'paid', 'cancelled', 'used')),
  CONSTRAINT tickets_showtime_id_seat_id_key UNIQUE (showtime_id, seat_id)
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_id INTEGER;

UPDATE tickets t
SET user_id = u.id
FROM (
  SELECT LOWER(email) AS normalized_email, MIN(id) AS id
  FROM users
  GROUP BY LOWER(email)
  HAVING COUNT(*) = 1
) u
WHERE t.user_id IS NULL
  AND LOWER(t.guest_email) = u.normalized_email;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seats_hall_id_fkey'
      AND conrelid = 'public.seats'::regclass
  ) THEN
    ALTER TABLE seats
      ADD CONSTRAINT seats_hall_id_fkey
      FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'showtimes_movie_id_fkey'
      AND conrelid = 'public.showtimes'::regclass
  ) THEN
    ALTER TABLE showtimes
      ADD CONSTRAINT showtimes_movie_id_fkey
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'showtimes_hall_id_fkey'
      AND conrelid = 'public.showtimes'::regclass
  ) THEN
    ALTER TABLE showtimes
      ADD CONSTRAINT showtimes_hall_id_fkey
      FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_showtime_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_showtime_id_fkey
      FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_seat_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_seat_id_fkey
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tickets_user_id_fkey'
      AND conrelid = 'public.tickets'::regclass
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON tickets (user_id);
