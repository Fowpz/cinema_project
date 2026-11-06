const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createOrder, getOrdersForUser } = require('../services/tickets');
const { asyncHandler } = require('../utils/http');
const { parseId } = require('../utils/validation');

const router = express.Router();

function formatOrder(row) {
  return {
    id: row.id,
    code: String(row.id).padStart(6, '0'),
    movieTitle: row.movie_title,
    ageRating: row.age_rating,
    posterUrl: row.poster_url,
    durationMin: row.duration_min,
    genres: row.genres,
    hall: row.hall_name,
    date: row.start_date,
    time: row.start_time,
    status: row.status,
    total: Number(row.total),
    seats: row.seats.map((seat) => ({ ...seat, price: Number(seat.price) })),
  };
}

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const showtimeId = parseId(req.body.showtimeId);
  const { seatIds } = req.body;

  if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Не указан сеанс или места' });
  }
  if (seatIds.some((seatId) => !Number.isInteger(seatId) || !parseId(seatId))
    || new Set(seatIds).size !== seatIds.length) {
    return res.status(400).json({ error: 'Выбраны некорректные или повторяющиеся места' });
  }

  try {
    const result = await createOrder({ showtimeId, seatIds, userId: req.user.id });
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Одно из выбранных мест уже занято' });
    }
    throw error;
  }
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const orders = await getOrdersForUser(req.user.id);
  res.json(orders.map(formatOrder));
}));

module.exports = router;
