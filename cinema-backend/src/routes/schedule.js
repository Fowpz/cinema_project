const express = require('express');
const pool = require('../config/database');
const { isValidDate } = require('../services/showtimes');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || null;
    if (date !== null && !isValidDate(date)) {
      return res.status(400).json({ error: 'Укажите дату в формате ГГГГ-ММ-ДД' });
    }

    const { rows } = await pool.query(
      `SELECT m.id AS movie_id, m.title, m.age_rating, m.description,
              m.poster_url, m.genres, m.duration_min,
              st.id AS showtime_id,
              to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
              to_char(st.start_time, 'HH24:MI') AS start_time,
              st.price,
              h.name AS hall_name
       FROM movies m
       JOIN showtimes st ON st.movie_id = m.id
       JOIN halls h ON h.id = st.hall_id
       WHERE m.is_active = true
         AND st.start_time::date = COALESCE($1::date, CURRENT_DATE)
         AND st.start_time > clock_timestamp()::timestamp
         AND NOT EXISTS (
           SELECT 1
           FROM showtimes duplicate
           WHERE duplicate.id < st.id
             AND duplicate.movie_id = st.movie_id
             AND duplicate.hall_id = st.hall_id
             AND duplicate.start_time = st.start_time
         )
       ORDER BY m.id, h.name, st.start_time`,
      [date]
    );

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
