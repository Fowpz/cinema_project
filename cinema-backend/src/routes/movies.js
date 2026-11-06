const express = require('express');
const {
  formatMovie,
  getActiveMovies,
  getActiveMovieById,
  getFutureShowtimesForMovie,
} = require('../services/movies');
const { asyncHandler } = require('../utils/http');
const { parseId } = require('../utils/validation');

const router = express.Router();

function groupByDate(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.start_date)) map.set(r.start_date, []);
    map.get(r.start_date).push({
      id: String(r.id),
      time: r.start_time,
      hall: r.hall_name,
      hallId: r.hall_id,
      price: Number(r.price),
    });
  }
  return Array.from(map.entries()).map(([date, showtimes]) => ({ date, showtimes }));
}

router.get('/', asyncHandler(async (req, res) => {
  const movies = await getActiveMovies();
  res.json(movies.map(formatMovie));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const movie = id && (await getActiveMovieById(id));
  if (!movie) return res.status(404).json({ error: 'Фильм не найден' });

  const showtimes = await getFutureShowtimesForMovie(id);
  return res.json({ ...formatMovie(movie), showtimesByDate: groupByDate(showtimes) });
}));

module.exports = router;
