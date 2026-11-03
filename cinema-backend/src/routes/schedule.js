const express = require('express');
const { isValidDate } = require('../services/showtimes');
const { getScheduleForDate } = require('../services/schedule');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || null;
    if (date !== null && !isValidDate(date)) {
      return res.status(400).json({ error: 'Укажите дату в формате ГГГГ-ММ-ДД' });
    }

    const rows = await getScheduleForDate(date);

    const movies = new Map();
    for (const r of rows) {
      if (!movies.has(r.movie_id)) {
        movies.set(r.movie_id, {
          id: String(r.movie_id),
          title: r.title,
          ageRating: r.age_rating,
          description: r.description,
          posterUrl: r.poster_url,
          genres: r.genres,
          durationMin: r.duration_min,
          hallsShowtimes: new Map(),
        });
      }
      const movie = movies.get(r.movie_id);
      if (!movie.hallsShowtimes.has(r.hall_name)) {
        movie.hallsShowtimes.set(r.hall_name, []);
      }
      movie.hallsShowtimes.get(r.hall_name).push({
        id: String(r.showtime_id),
        time: r.start_time,
        price: Number(r.price),
      });
    }

    const result = Array.from(movies.values()).map((m) => ({
      ...m,
      hallsShowtimes: Array.from(m.hallsShowtimes.entries()).map(([hall, showtimes]) => ({
        hall,
        showtimes,
      })),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
