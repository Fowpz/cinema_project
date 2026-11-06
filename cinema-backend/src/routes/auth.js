const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { signAccessToken } = require('../config/jwt');
const { requireAuth } = require('../middleware/auth');
const {
  REFRESH_TOKEN_TTL_MS,
  createUser,
  getUserByLogin,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
} = require('../services/auth');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

const REFRESH_COOKIE = 'refresh_token';
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
};

// Защита от перебора паролей.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много попыток, повторите позже' },
});

function toUser(row) {
  return { login: row.login, name: row.name, role: row.role };
}

// В браузере refresh-токен живёт в httpOnly-cookie, недоступной для JS.
// В мобильном приложении cookie нет, там он хранится в защищённом хранилище устройства.
function isMobileClient(req) {
  return req.get('x-client-type') === 'mobile';
}

async function sendSession(req, res, row, status = 200) {
  const refreshToken = await issueRefreshToken(row.id);
  const session = { user: toUser(row), accessToken: signAccessToken(row.public_id) };
  if (isMobileClient(req)) {
    session.refreshToken = refreshToken;
  } else {
    res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookieOptions, maxAge: REFRESH_TOKEN_TTL_MS });
  }
  res.status(status).json(session);
}

function readRefreshToken(req) {
  const token = isMobileClient(req) ? req.body.refreshToken : req.cookies[REFRESH_COOKIE];
  return typeof token === 'string' ? token : null;
}

router.post('/register', credentialsLimiter, asyncHandler(async (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim() || login;
  if (login.length < 3 || login.length > 100 || name.length > 100) {
    return res.status(400).json({ error: 'Логин должен содержать от 3 до 100 символов' });
  }
  // bcrypt учитывает только первые 72 байта пароля.
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Пароль должен содержать от 8 до 72 символов' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const row = await createUser({ login, passwordHash, name });
    return await sendSession(req, res, row, 201);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Такой логин уже занят' });
    throw error;
  }
}));

router.post('/login', credentialsLimiter, asyncHandler(async (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const row = await getUserByLogin(login);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  return sendSession(req, res, row);
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const token = readRefreshToken(req);
  const row = token && (await consumeRefreshToken(token));
  if (!row) return res.status(401).json({ error: 'Сессия истекла, войдите снова' });
  return sendSession(req, res, row);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const token = readRefreshToken(req);
  if (token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(204).end();
}));

router.get('/me', requireAuth, (req, res) => {
  res.json(toUser(req.user));
});

module.exports = router;
