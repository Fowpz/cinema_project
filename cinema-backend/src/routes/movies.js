const express = require('express');
const pool = require('../config/database');

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
    const { rows } = await pool.query(
      `SELECT id, title, age_rating, description, poster_url, genres, duration_min
       FROM movies
       WHERE is_active = true
       ORDER BY id`
    );
    res.json(rows.map(formatMovie));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const movieRes = await pool.query(
      `SELECT id, title, age_rating, description, poster_url, genres, duration_min
       FROM movies
       WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (movieRes.rows.length === 0) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }

    const showtimesRes = await pool.query(
      `SELECT st.id,
              to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
              to_char(st.start_time, 'HH24:MI') AS start_time,
              st.price, h.id AS hall_id, h.name AS hall_name
       FROM showtimes st
       JOIN halls h ON h.id = st.hall_id
       WHERE st.movie_id = $1 AND st.start_time > clock_timestamp()::timestamp
         AND NOT EXISTS (
           SELECT 1
           FROM showtimes duplicate
           WHERE duplicate.id < st.id
             AND duplicate.movie_id = st.movie_id
             AND duplicate.hall_id = st.hall_id
             AND duplicate.start_time = st.start_time
         )
       ORDER BY st.start_time`,
      [req.params.id]
    );

    res.json({
      ...formatMovie(movieRes.rows[0]),
      showtimesByDate: groupByDate(showtimesRes.rows),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
