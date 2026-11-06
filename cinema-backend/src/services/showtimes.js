const db = require('../db');
const { httpError } = require('../utils/http');

// Добавляет сеанс внутри уже открытой транзакции tx.
async function addShowtime(tx, { movieId, hallId, date, time, price }) {
  // Блокировка зала: два параллельных запроса не займут одно и то же время.
  const hall = await tx.queryOne('SELECT id FROM halls WHERE id = $1 FOR UPDATE', [hallId]);
  if (!hall) throw httpError(404, 'Зал не найден');

  const movie = await tx.queryOne(
    'SELECT duration_min FROM movies WHERE id = $1 AND is_active',
    [movieId]
  );
  if (!movie) throw httpError(404, 'Фильм не найден или неактивен');

  const { is_future: isFuture } = await tx.queryOne(
    'SELECT ($1::date + $2::time) > LOCALTIMESTAMP AS is_future',
    [date, time]
  );
  if (!isFuture) throw httpError(400, 'Нельзя создать сеанс, который уже начался');

  // Новый сеанс не должен пересекаться с другими: зал освобождается, когда фильм закончился.
  const conflict = await tx.queryOne(
    `SELECT m.title,
            to_char(st.start_time, 'HH24:MI') AS starts_at,
            to_char(st.start_time + (m.duration_min * INTERVAL '1 minute'), 'HH24:MI') AS ends_at
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     WHERE st.hall_id = $1
       AND st.start_time < ($2::date + $3::time) + ($4 * INTERVAL '1 minute')
       AND st.start_time + (m.duration_min * INTERVAL '1 minute') > ($2::date + $3::time)
     LIMIT 1`,
    [hallId, date, time, movie.duration_min]
  );
  if (conflict) {
    throw httpError(
      409,
      `Зал занят: «${conflict.title}» идёт с ${conflict.starts_at} до ${conflict.ends_at}`
    );
  }

  const { id } = await tx.queryOne(
    `INSERT INTO showtimes (movie_id, hall_id, start_time, price)
     VALUES ($1, $2, $3::date + $4::time, $5)
     RETURNING id`,
    [movieId, hallId, date, time, price]
  );
  return id;
}

function createShowtime(input) {
  return db.transaction((tx) => addShowtime(tx, input));
}

// Сеансы, которые идут в указанный день, включая начавшиеся накануне вечером.
function getShowtimesForDate(date) {
  return db.query(
    `SELECT st.id, st.hall_id, st.price,
            h.name AS hall_name,
            m.title AS movie_title,
            to_char(st.start_time, 'YYYY-MM-DD"T"HH24:MI') AS starts_at,
            to_char(st.start_time + (m.duration_min * INTERVAL '1 minute'), 'YYYY-MM-DD"T"HH24:MI') AS ends_at,
            (SELECT COUNT(*)::int
             FROM tickets t
             WHERE t.showtime_id = st.id AND t.status <> 'cancelled') AS sold
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     WHERE st.start_time < $1::date + 1
       AND st.start_time + (m.duration_min * INTERVAL '1 minute') > $1::date
     ORDER BY st.start_time, h.name`,
    [date]
  );
}

// Возвращает false, если такого сеанса нет. Сеанс с билетами удалить не даст внешний ключ.
async function deleteShowtime(id) {
  const rows = await db.query('DELETE FROM showtimes WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

function getShowtimeById(id) {
  return db.queryOne(
    `SELECT st.id,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.start_time <= LOCALTIMESTAMP AS is_past,
            st.price,
            m.id AS movie_id, m.title AS movie_title,
            h.name AS hall_name
     FROM showtimes st
     JOIN movies m ON m.id = st.movie_id
     JOIN halls h ON h.id = st.hall_id
     WHERE st.id = $1`,
    [id]
  );
}

function getSeatsForShowtime(id) {
  return db.query(
    `SELECT s.id, s.row_number, s.seat_number, t.id IS NOT NULL AS occupied
     FROM showtimes st
     JOIN seats s ON s.hall_id = st.hall_id
     LEFT JOIN tickets t
       ON t.showtime_id = st.id AND t.seat_id = s.id AND t.status <> 'cancelled'
     WHERE st.id = $1
     ORDER BY s.row_number, s.seat_number`,
    [id]
  );
}

module.exports = {
  addShowtime,
  createShowtime,
  deleteShowtime,
  getShowtimesForDate,
  getShowtimeById,
  getSeatsForShowtime,
};
