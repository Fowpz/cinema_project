const db = require('../db');

// Колонки фильма для запросов, где таблица movies подключена под псевдонимом m.
const MOVIE_COLUMNS = `
  m.id, m.title, m.age_rating, m.description, m.poster_url, m.duration_min,
  (SELECT string_agg(g.name, ', ' ORDER BY g.name)
   FROM movie_genres mg
   JOIN genres g ON g.id = mg.genre_id
   WHERE mg.movie_id = m.id) AS genres
`;

function formatMovie(row) {
  return {
    id: String(row.id),
    title: row.title,
    ageRating: row.age_rating,
    description: row.description,
    posterUrl: row.poster_url,
    genres: row.genres,
    durationMin: row.duration_min,
  };
}

function getActiveMovies() {
  return db.query(`SELECT ${MOVIE_COLUMNS} FROM movies m WHERE m.is_active ORDER BY m.id`);
}

function getActiveMovieById(id) {
  return db.queryOne(
    `SELECT ${MOVIE_COLUMNS} FROM movies m WHERE m.id = $1 AND m.is_active`,
    [id]
  );
}

function getFutureShowtimesForMovie(movieId) {
  return db.query(
    `SELECT st.id,
            to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
            to_char(st.start_time, 'HH24:MI') AS start_time,
            st.price, h.id AS hall_id, h.name AS hall_name
     FROM showtimes st
     JOIN halls h ON h.id = st.hall_id
     WHERE st.movie_id = $1 AND st.start_time > LOCALTIMESTAMP
     ORDER BY st.start_time`,
    [movieId]
  );
}

module.exports = {
  MOVIE_COLUMNS,
  formatMovie,
  getActiveMovies,
  getActiveMovieById,
  getFutureShowtimesForMovie,
};
