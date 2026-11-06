const db = require('../db');
const { addShowtime } = require('./showtimes');

function getHalls() {
  return db.query('SELECT id, name FROM halls ORDER BY name');
}

function getMovieOptions() {
  return db.query('SELECT id, title, duration_min FROM movies WHERE is_active ORDER BY title');
}

function createMovieWithShowtimes({ title, ageRating, description, posterUrl, durationMin, genres, showtimes }) {
  return db.transaction(async (tx) => {
    const movie = await tx.queryOne(
      `INSERT INTO movies (title, age_rating, description, poster_url, duration_min)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, duration_min`,
      [title, ageRating, description, posterUrl, durationMin]
    );

    // Новые жанры добавляются в справочник, существующие используются повторно.
    await tx.query(
      `WITH saved AS (
         INSERT INTO genres (name)
         SELECT DISTINCT name FROM UNNEST($2::text[]) AS input (name)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id
       )
       INSERT INTO movie_genres (movie_id, genre_id)
       SELECT $1, id FROM saved`,
      [movie.id, genres]
    );

    for (const showtime of showtimes) {
      await addShowtime(tx, { ...showtime, movieId: movie.id });
    }
    return movie;
  });
}

module.exports = { getHalls, getMovieOptions, createMovieWithShowtimes };
