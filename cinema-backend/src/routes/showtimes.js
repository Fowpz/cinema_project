const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT st.id,
              to_char(st.start_time, 'YYYY-MM-DD') AS start_date,
              to_char(st.start_time, 'HH24:MI') AS start_time,
              st.start_time <= clock_timestamp()::timestamp AS is_past,
              EXISTS (
                SELECT 1
                FROM showtimes duplicate
                WHERE duplicate.id < st.id
                  AND duplicate.movie_id = st.movie_id
                  AND duplicate.hall_id = st.hall_id
                  AND duplicate.start_time = st.start_time
              ) AS is_duplicate,
              st.price,
              m.id AS movie_id, m.title AS movie_title,
              h.name AS hall_name
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN halls h ON h.id = st.hall_id
       WHERE st.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Сеанс не найден' });
    }

    const r = rows[0];
    res.json({
      id: String(r.id),
      movieId: String(r.movie_id),
      movieTitle: r.movie_title,
      hall: r.hall_name,
      date: r.start_date,
      time: r.start_time,
      isPast: r.is_past,
      isDuplicate: r.is_duplicate,
      price: Number(r.price),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/seats', async (req, res, next) => {
  try {
    const stRes = await pool.query(`SELECT hall_id FROM showtimes WHERE id = $1`, [
      req.params.id,
    ]);
    if (stRes.rows.length === 0) {
      return res.status(404).json({ error: 'Сеанс не найден' });
    }
    const hallId = stRes.rows[0].hall_id;

    const seatsRes = await pool.query(
      `SELECT id, row_number, seat_number
       FROM seats
       WHERE hall_id = $1
       ORDER BY row_number, seat_number`,
      [hallId]
    );

    const occupiedRes = await pool.query(
      `SELECT seat_id FROM tickets
       WHERE showtime_id = $1 AND status IN ('booked', 'paid', 'used')`,
      [req.params.id]
    );
    const occupiedIds = new Set(occupiedRes.rows.map((r) => r.seat_id));

    res.json(
      seatsRes.rows.map((s) => ({
        id: s.id,
        row: s.row_number,
        seat: s.seat_number,
        occupied: occupiedIds.has(s.id),
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
