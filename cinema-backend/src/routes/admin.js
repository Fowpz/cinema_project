const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createShowtime } = require('../services/showtimes');
const {
  getHalls,
  getActiveMovies,
  createMovieWithShowtimes,
} = require('../services/admin');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/halls', async (req, res, next) => {
  try {
    res.json(await getHalls());
  } catch (error) { next(error); }
});

router.get('/movies', async (req, res, next) => {
  try {
    res.json(await getActiveMovies());
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
  try {
    const movie = await createMovieWithShowtimes({
      title: title.trim(),
      ageRating: ageRating.trim(),
      description: description.trim(),
      posterUrl: typeof posterUrl === 'string' ? posterUrl.trim() || null : null,
      durationMin: duration,
      genres: typeof genres === 'string' ? genres.trim() || null : null,
      isActive: Boolean(isActive),
      showtimes,
    });
    res.status(201).json({ movie });
  } catch (error) { next(error); }
});

module.exports = router;
