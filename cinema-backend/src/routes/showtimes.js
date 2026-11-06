const express = require('express');
const { getShowtimeById, getSeatsForShowtime } = require('../services/showtimes');
const { asyncHandler } = require('../utils/http');
const { parseId } = require('../utils/validation');

const router = express.Router();

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const showtime = id && (await getShowtimeById(id));
  if (!showtime) return res.status(404).json({ error: 'Сеанс не найден' });

  return res.json({
    id: String(showtime.id),
    movieId: String(showtime.movie_id),
    movieTitle: showtime.movie_title,
    hall: showtime.hall_name,
    date: showtime.start_date,
    time: showtime.start_time,
    isPast: showtime.is_past,
    price: Number(showtime.price),
  });
}));

router.get('/:id/seats', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const seats = id ? await getSeatsForShowtime(id) : [];
  if (!seats.length) return res.status(404).json({ error: 'Сеанс не найден' });

  return res.json(seats.map((seat) => ({
    id: seat.id,
    row: seat.row_number,
    seat: seat.seat_number,
    occupied: seat.occupied,
  })));
}));

module.exports = router;
