const pool = require('../config/database');
const { addShowtime, isValidDate, isValidTime } = require('./showtimes');

async function getHalls() {
  const { rows } = await pool.query('SELECT id, name FROM halls ORDER BY name');
  return rows;
}

async function getActiveMovies() {
  const { rows } = await pool.query(
    'SELECT id, title FROM movies WHERE is_active = true ORDER BY title'
  );
  return rows;
}

async function createMovieWithShowtimes(movieInput) {
  const {
    title, ageRating, description, posterUrl, durationMin,
    genres, isActive, showtimes,
  } = movieInput;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const movieResult = await client.query(
      `INSERT INTO movies (title, age_rating, description, poster_url, duration_min, genres, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title`,
      [title, ageRating, description, posterUrl, durationMin, genres, isActive]
    );
    const movie = movieResult.rows[0];

    for (const item of showtimes) {
      const hallId = Number(item.hallId);
      const price = Number(item.price);
      if (!Number.isInteger(hallId) || hallId <= 0 || !isValidDate(item.date)
        || !isValidTime(item.time) || !Number.isFinite(price) || price <= 0) {
        const error = new Error('Проверьте дату, время, зал и цену каждого сеанса');
        error.status = 400;
        throw error;
      }
      await addShowtime(client, {
        movieId: movie.id,
        hallId,
        date: item.date,
        time: item.time,
        price,
      });
    }

    await client.query('COMMIT');
    return movie;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getHalls, getActiveMovies, createMovieWithShowtimes };
