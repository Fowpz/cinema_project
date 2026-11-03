const pool = require('../config/database');

const MOVIE_COLUMNS = `
  id, title, age_rating, description, poster_url, genres, duration_min
`;

async function getActiveMovies() {
  const { rows } = await pool.query(
    `SELECT ${MOVIE_COLUMNS}
     FROM movies
     WHERE is_active = true
     ORDER BY id`
  );
  return rows;
}

async function getActiveMovieById(id) {
  const { rows } = await pool.query(
    `SELECT ${MOVIE_COLUMNS}
     FROM movies
     WHERE id = $1 AND is_active = true`,
    [id]
  );
  return rows[0] || null;
}

async function getFutureShowtimesForMovie(movieId) {
  const { rows } = await pool.query(
    `SELECT st.id,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.price, h.id AS hall_id, h.name AS hall_name
     FROM showtimes st
     JOIN halls h ON h.id = st.hall_id
     WHERE st.movie_id = $1 AND st.start_time > clock_timestamp()::timestamp
       AND NOT EXISTS (
         SELECT 1
         FROM showtimes duplicate
         WHERE duplicate.id < st.id
           AND duplicate.movie_id = st.movie_id
           AND duplicate.hall_id = st.hall_id
           AND duplicate.start_time = st.start_time
       )
     ORDER BY st.start_time`,
    [movieId]
  );
  return rows;
}

module.exports = { getActiveMovies, getActiveMovieById, getFutureShowtimesForMovie };
