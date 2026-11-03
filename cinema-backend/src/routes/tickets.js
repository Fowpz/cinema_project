const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createTickets, getTicketsForUser } = require('../services/tickets');

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

  try {
    const result = await createTickets({ showtimeId, seatIds, user: req.user });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Одно из выбранных мест уже занято' });
    }
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(await getTicketsForUser(req.user.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
