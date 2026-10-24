const express = require('express');
const pool = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addShowtime, createShowtime, isValidDate, isValidTime } = require('../services/showtimes');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/halls', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM halls ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/movies', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title FROM movies WHERE is_active = true ORDER BY title'
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/showtimes', async (req, res, next) => {
  const movieId = Number(req.body.movieId);
  const hallId = Number(req.body.hallId);
  const { date, time } = req.body;
  const price = Number(req.body.price);

  try {
    const showtimeId = await createShowtime({ movieId, hallId, date, time, price });
    res.status(201).json({ showtimeId });
  } catch (error) { next(error); }
});

router.post('/movies', async (req, res, next) => {
  const { title, ageRating, description, posterUrl, durationMin, genres, isActive = true, showtimes = [] } = req.body;
  const duration = Number(durationMin);
  if (typeof title !== 'string' || !title.trim()
    || typeof ageRating !== 'string' || !ageRating.trim()
    || typeof description !== 'string' || !description.trim()
    || !Number.isInteger(duration) || duration <= 0) {
    return res.status(400).json({ error: 'Заполните название, возрастной рейтинг, описание и длительность' });
  }
  if (!Array.isArray(showtimes) || !showtimes.length) {
    return res.status(400).json({ error: 'Добавьте хотя бы один сеанс' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const movieResult = await client.query(
      `INSERT INTO movies (title, age_rating, description, poster_url, duration_min, genres, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title`,
      [title.trim(), ageRating.trim(), description.trim(), typeof posterUrl === 'string' ? posterUrl.trim() || null : null, duration, typeof genres === 'string' ? genres.trim() || null : null, Boolean(isActive)]
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
      await addShowtime(client, { movieId: movie.id, hallId, date: item.date, time: item.time, price });
    }
    await client.query('COMMIT');
    res.status(201).json({ movie });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
