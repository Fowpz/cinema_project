const pool = require('../config/database');

const ADVISORY_LOCK_NAMESPACE = 84721;

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isValidTime(time) {
  return typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function addShowtime(client, { movieId, hallId, date, time, price }) {
  await client.query('SELECT pg_advisory_xact_lock($1, $2)', [ADVISORY_LOCK_NAMESPACE, hallId]);

  const movieResult = await client.query(
    'SELECT id, duration_min FROM movies WHERE id = $1 AND is_active = true',
    [movieId]
  );
  if (!movieResult.rows.length) throw httpError(404, 'Фильм не найден или неактивен');

  const hallResult = await client.query('SELECT id FROM halls WHERE id = $1', [hallId]);
  if (!hallResult.rows.length) throw httpError(404, 'Зал не найден');

  const duration = Number(movieResult.rows[0].duration_min);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw httpError(400, 'Для фильма не указана корректная длительность');
  }

  const startResult = await client.query(
    'SELECT ($1::date + $2::time) > clock_timestamp()::timestamp AS is_future',
    [date, time]
  );
  if (!startResult.rows[0].is_future) {
    throw httpError(400, 'Нельзя создать сеанс, который уже начался');
  }

  const conflictResult = await client.query(
    `SELECT st.id, m.title
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     WHERE st.hall_id = $1
       AND st.start_time < ($2::date + $3::time) + ($4::int * INTERVAL '1 minute')
       AND st.start_time + (COALESCE(m.duration_min, 0) * INTERVAL '1 minute')
           > ($2::date + $3::time)
     LIMIT 1`,
    [hallId, date, time, duration]
  );
  if (conflictResult.rows.length) {
    throw httpError(409, `В это время зал занят сеансом «${conflictResult.rows[0].title}»`);
  }

  const { rows } = await client.query(
    `INSERT INTO showtimes (movie_id, hall_id, start_time, price)
     VALUES ($1, $2, $3::date + $4::time, $5)
     RETURNING id`,
    [movieId, hallId, date, time, price]
  );
  return rows[0].id;
}

async function createShowtime(input) {
  const { movieId, hallId, date, time, price } = input;
  if (!Number.isInteger(movieId) || movieId <= 0
    || !Number.isInteger(hallId) || hallId <= 0
    || !isValidDate(date) || !isValidTime(time)
    || !Number.isFinite(price) || price <= 0) {
    throw httpError(400, 'Проверьте фильм, дату, время, зал и цену сеанса');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const showtimeId = await addShowtime(client, input);
    await client.query('COMMIT');
    return showtimeId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getShowtimeById(id) {
  const { rows } = await pool.query(
    `SELECT st.id,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.start_time <= clock_timestamp()::timestamp AS is_past,
            EXISTS (
              SELECT 1
              FROM showtimes duplicate
              WHERE duplicate.id < st.id
                AND duplicate.movie_id = st.movie_id
                AND duplicate.hall_id = st.hall_id
                AND duplicate.start_time = st.start_time
            ) AS is_duplicate,
            st.price,
            m.id AS movie_id, m.title AS movie_title,
            h.name AS hall_name
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     WHERE st.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function getSeatsForShowtime(id) {
  const showtimeResult = await pool.query(
    'SELECT hall_id FROM showtimes WHERE id = $1',
    [id]
  );
  if (!showtimeResult.rows.length) return null;

  const { rows } = await pool.query(
    `SELECT s.id, s.row_number, s.seat_number,
            EXISTS (
              SELECT 1
              FROM tickets t
              WHERE t.showtime_id = $1
                AND t.seat_id = s.id
                AND t.status IN ('booked', 'paid', 'used')
            ) AS occupied
     FROM seats s
     WHERE s.hall_id = $2
     ORDER BY s.row_number, s.seat_number`,
    [id, showtimeResult.rows[0].hall_id]
  );
  return rows;
}

module.exports = {
  addShowtime,
  createShowtime,
  getShowtimeById,
  getSeatsForShowtime,
  httpError,
  isValidDate,
  isValidTime,
};
