const express = require('express');
const { formatMovie } = require('../services/movies');
const { getScheduleForDate } = require('../services/schedule');
const { asyncHandler } = require('../utils/http');
const { isValidDate } = require('../utils/validation');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const date = req.query.date || null;
  if (date !== null && !isValidDate(date)) {
    return res.status(400).json({ error: 'Укажите дату в формате ГГГГ-ММ-ДД' });
  }

  const rows = await getScheduleForDate(date);

  const movies = new Map();
  for (const r of rows) {
    if (!movies.has(r.id)) {
      movies.set(r.id, { ...formatMovie(r), hallsShowtimes: new Map() });
    }
    const { hallsShowtimes } = movies.get(r.id);
    if (!hallsShowtimes.has(r.hall_name)) hallsShowtimes.set(r.hall_name, []);
    hallsShowtimes.get(r.hall_name).push({
      id: String(r.showtime_id),
      time: r.start_time,
      price: Number(r.price),
    });
  }

  return res.json(Array.from(movies.values()).map((m) => ({
    ...m,
    hallsShowtimes: Array.from(m.hallsShowtimes.entries()).map(([hall, showtimes]) => ({
      hall,
      showtimes,
    })),
  })));
}));

module.exports = router;
