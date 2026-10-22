const express = require('express');
const cors = require('cors');

const moviesRouter = require('./routes/movies');
const scheduleRouter = require('./routes/schedule');
const showtimesRouter = require('./routes/showtimes');
const ticketsRouter = require('./routes/tickets');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/movies', moviesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/showtimes', showtimesRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

module.exports = app;
