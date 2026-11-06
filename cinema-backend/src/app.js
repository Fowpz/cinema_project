const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const moviesRouter = require('./routes/movies');
const scheduleRouter = require('./routes/schedule');
const showtimesRouter = require('./routes/showtimes');
const ticketsRouter = require('./routes/tickets');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const { UPLOADS_DIR } = require('./services/posters');

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081')
  .split(',')
  .map((origin) => origin.trim());

// При разработке Expo может занять другой порт, если 8081 уже занят.
function isAllowedOrigin(origin, callback) {
  const isLocalDev = process.env.NODE_ENV !== 'production'
    && /^http:\/\/localhost(:\d+)?$/.test(origin);
  callback(null, !origin || corsOrigins.includes(origin) || isLocalDev);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: isAllowedOrigin, credentials: true }));
app.use(cookieParser());

// Постеры показываются на странице клиента, а она работает на другом порту.
app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true })
);

// Админка подключена раньше общего парсера: у неё свой лимит из-за картинок постеров.
app.use('/api/admin', adminRouter);

app.use(express.json({ limit: '100kb' }));

app.use('/api/movies', moviesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/showtimes', showtimesRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/auth', authRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Слишком большой запрос или файл' });
  }
  // Текст внутренних ошибок (например, из БД) клиенту не показываем.
  return res.status(status).json({ error: status < 500 ? err.message : 'Внутренняя ошибка сервера' });
});

module.exports = app;
