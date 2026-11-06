const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  createShowtime,
  deleteShowtime,
  getShowtimesForDate,
} = require('../services/showtimes');
const { savePoster, removePoster } = require('../services/posters');
const { getHalls, getMovieOptions, createMovieWithShowtimes } = require('../services/admin');
const { asyncHandler, httpError } = require('../utils/http');
const { parseId, isValidDate, isWholeHour } = require('../utils/validation');

const router = express.Router();
router.use(requireAuth, requireAdmin);
// Картинка постера приходит в теле запроса, поэтому лимит больше обычного.
router.use(express.json({ limit: '15mb' }));

// Нарушение внешнего ключа: PostgreSQL 18 для RESTRICT отдаёт 23001, версии до него — 23503.
const SHOWTIME_HAS_TICKETS_CODES = ['23001', '23503'];
const AGE_RATINGS = ['0+', '6+', '12+', '16+', '18+'];

// Приводит данные сеанса к нужным типам или возвращает null, если они некорректны.
function parseShowtime({ hallId, date, time, price }) {
  const parsedHallId = parseId(hallId);
  const parsedPrice = Number(price);
  if (!parsedHallId || !isValidDate(date) || !isWholeHour(time)
    || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice >= 1000000) {
    return null;
  }
  return { hallId: parsedHallId, date, time, price: parsedPrice };
}

function parseGenres(genres) {
  if (typeof genres !== 'string') return [];
  return genres
    .split(',')
    .map((genre) => genre.trim().replace(/^./, (letter) => letter.toUpperCase()))
    .filter(Boolean);
}

router.get('/halls', asyncHandler(async (req, res) => {
  res.json(await getHalls());
}));

router.get('/movies', asyncHandler(async (req, res) => {
  res.json(await getMovieOptions());
}));

router.get('/showtimes', asyncHandler(async (req, res) => {
  if (!isValidDate(req.query.date)) throw httpError(400, 'Укажите дату в формате ГГГГ-ММ-ДД');

  const rows = await getShowtimesForDate(req.query.date);
  res.json(rows.map((row) => ({
    id: row.id,
    hallId: row.hall_id,
    hall: row.hall_name,
    movieTitle: row.movie_title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    price: Number(row.price),
    sold: row.sold,
  })));
}));

router.post('/showtimes', asyncHandler(async (req, res) => {
  const movieId = parseId(req.body.movieId);
  const showtime = parseShowtime(req.body);
  if (!movieId || !showtime) {
    throw httpError(400, 'Проверьте фильм, дату, час начала, зал и цену сеанса');
  }
  const showtimeId = await createShowtime({ ...showtime, movieId });
  res.status(201).json({ showtimeId });
}));

router.delete('/showtimes/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  try {
    if (!id || !(await deleteShowtime(id))) throw httpError(404, 'Сеанс не найден');
  } catch (error) {
    if (SHOWTIME_HAS_TICKETS_CODES.includes(error.code)) {
      throw httpError(409, 'На этот сеанс уже есть билеты, удалить его нельзя');
    }
    throw error;
  }
  res.status(204).end();
}));

router.post('/movies', asyncHandler(async (req, res) => {
  const { title, ageRating, description, posterImage, durationMin, genres, showtimes } = req.body;
  const duration = Number(durationMin);
  if (typeof title !== 'string' || !title.trim() || title.length > 200
    || !AGE_RATINGS.includes(ageRating)
    || typeof description !== 'string' || !description.trim()
    || !Number.isInteger(duration) || duration <= 0 || duration > 1000) {
    throw httpError(400, 'Заполните название, возрастной рейтинг, описание и длительность');
  }
  if (!Array.isArray(showtimes) || !showtimes.length) {
    throw httpError(400, 'Добавьте хотя бы один сеанс');
  }
  const parsedShowtimes = showtimes.map(parseShowtime);
  if (parsedShowtimes.includes(null)) {
    throw httpError(400, 'Проверьте дату, час начала, зал и цену каждого сеанса');
  }
  const posterUrl = typeof posterImage === 'string' && posterImage
    ? await savePoster(posterImage)
    : null;
  try {
    const movie = await createMovieWithShowtimes({
      title: title.trim(),
      ageRating,
      description: description.trim(),
      posterUrl,
      durationMin: duration,
      genres: parseGenres(genres),
      showtimes: parsedShowtimes,
    });
    res.status(201).json({ movie });
  } catch (error) {
    // Фильм не сохранился, файл постера больше не нужен.
    if (posterUrl) await removePoster(posterUrl);
    throw error;
  }
}));

module.exports = router;
