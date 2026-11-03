const pool = require('../config/database');

async function getScheduleForDate(date) {
  const { rows } = await pool.query(
    `SELECT m.id AS movie_id, m.title, m.age_rating, m.description,
            m.poster_url, m.genres, m.duration_min,
            st.id AS showtime_id,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.price,
            h.name AS hall_name
     FROM movies m
     JOIN showtimes st ON st.movie_id = m.id
     JOIN halls h ON h.id = st.hall_id
     WHERE m.is_active = true
       AND st.start_time::date = COALESCE($1::date, CURRENT_DATE)
       AND st.start_time > clock_timestamp()::timestamp
       AND NOT EXISTS (
         SELECT 1
         FROM showtimes duplicate
         WHERE duplicate.id < st.id
           AND duplicate.movie_id = st.movie_id
           AND duplicate.hall_id = st.hall_id
           AND duplicate.start_time = st.start_time
       )
     ORDER BY m.id, h.name, st.start_time`,
    [date]
  );
  return rows;
}

module.exports = { getScheduleForDate };
