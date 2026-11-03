const express = require('express');
const {
  getActiveMovies,
  getActiveMovieById,
  getFutureShowtimesForMovie,
} = require('../services/movies');

const router = express.Router();

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

function groupByDate(rows) {
  const map = new Map();
  for (const r of rows) {
    const date = r.start_date;
    const time = r.start_time;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push({
      id: String(r.id),
      time,
      hall: r.hall_name,
      hallId: r.hall_id,
      price: Number(r.price),
    });
  }
  return Array.from(map.entries()).map(([date, showtimes]) => ({ date, showtimes }));
}

router.get('/', async (req, res, next) => {
  try {
    const movies = await getActiveMovies();
    res.json(movies.map(formatMovie));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const movie = await getActiveMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }

    const showtimes = await getFutureShowtimesForMovie(req.params.id);

    res.json({
      ...formatMovie(movie),
      showtimesByDate: groupByDate(showtimes),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
