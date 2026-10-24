const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  const { showtimeId, seatIds } = req.body;

  if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Не указан сеанс или места' });
  }
  if (seatIds.some((seatId) => !Number.isInteger(seatId) || seatId <= 0)
    || new Set(seatIds).size !== seatIds.length) {
    return res.status(400).json({ error: 'Выбраны некорректные или повторяющиеся места' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stRes = await client.query(
      `SELECT st.price, st.hall_id,
              st.start_time <= clock_timestamp()::timestamp AS is_past,
              EXISTS (
                SELECT 1
                FROM showtimes duplicate
                WHERE duplicate.id < st.id
                  AND duplicate.movie_id = st.movie_id
                  AND duplicate.hall_id = st.hall_id
                  AND duplicate.start_time = st.start_time
              ) AS is_duplicate
       FROM showtimes st
       WHERE st.id = $1
       FOR UPDATE`,
      [showtimeId]
    );
    if (stRes.rows.length === 0) {
      const notFound = new Error('Сеанс не найден');
      notFound.status = 404;
      throw notFound;
    }
    if (stRes.rows[0].is_past) {
      const pastShowtime = new Error('Нельзя купить билет на прошедший сеанс');
      pastShowtime.status = 400;
      throw pastShowtime;
    }
    if (stRes.rows[0].is_duplicate) {
      const duplicateShowtime = new Error('Этот сеанс уже есть в расписании. Выберите показанное время из афиши.');
      duplicateShowtime.status = 409;
      throw duplicateShowtime;
    }
    const seatResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM seats WHERE hall_id = $1 AND id = ANY($2::int[])',
      [stRes.rows[0].hall_id, seatIds]
    );
    if (seatResult.rows[0].count !== seatIds.length) {
      const invalidSeats = new Error('Одно или несколько выбранных мест не принадлежат этому залу');
      invalidSeats.status = 400;
      throw invalidSeats;
    }
    const price = stRes.rows[0].price;

    const ticketIds = [];
    for (const seatId of seatIds) {
      const result = await client.query(
        `INSERT INTO tickets (guest_email, guest_name, showtime_id, seat_id, price, status)
         VALUES ($1, $2, $3, $4, $5, 'paid')
         RETURNING id`,
        [req.user.email, req.user.name, showtimeId, seatId, price]
      );
      ticketIds.push(result.rows[0].id);
    }

    await client.query('COMMIT');
    const total = ticketIds.length * Number(price);
    res.status(201).json({ ticketIds, total });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Одно из выбранных мест уже занято' });
    }
    next(err);
  } finally {
    client.release();
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.price, t.status, t.created_at, t.guest_email,
              st.id AS showtime_id,
              m.id AS movie_id, m.title AS movie_title, m.age_rating,
              m.poster_url, m.genres, m.duration_min,
              to_char(st.start_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS start_time,
              h.name AS hall_name,
              s.row_number, s.seat_number
       FROM tickets t
       JOIN showtimes st ON st.id = t.showtime_id
       JOIN movies m ON m.id = st.movie_id
       JOIN halls h ON h.id = st.hall_id
       JOIN seats s ON s.id = t.seat_id
       WHERE LOWER(t.guest_email) = LOWER($1)
       ORDER BY st.start_time DESC`,
      [req.user.email]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
