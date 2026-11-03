const express = require('express');
const { getShowtimeById, getSeatsForShowtime } = require('../services/showtimes');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const showtime = await getShowtimeById(req.params.id);
    if (!showtime) {
      return res.status(404).json({ error: 'Сеанс не найден' });
    }
    res.json({
      id: String(showtime.id),
      movieId: String(showtime.movie_id),
      movieTitle: showtime.movie_title,
      hall: showtime.hall_name,
      date: showtime.start_date,
      time: showtime.start_time,
      isPast: showtime.is_past,
      isDuplicate: showtime.is_duplicate,
      price: Number(showtime.price),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/seats', async (req, res, next) => {
  try {
    const seats = await getSeatsForShowtime(req.params.id);
    if (seats === null) {
      return res.status(404).json({ error: 'Сеанс не найден' });
    }
    res.json(seats.map((seat) => ({
      id: seat.id,
      row: seat.row_number,
      seat: seat.seat_number,
      occupied: seat.occupied,
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
