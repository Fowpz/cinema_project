const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_ALGORITHM, getJwtSecret } = require('../config/jwt');
const { requireAuth } = require('../middleware/auth');
const {
  createUser,
  getUserByEmail,
  updateUserPasswordHash,
} = require('../services/auth');

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: '30d',
  });
}

function toUser(row) {
  return { id: row.id, login: row.email, name: row.name, role: row.role };
}

router.post('/register', async (req, res, next) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const name = String(req.body.name || login).trim();
  if (login.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Логин должен содержать минимум 3 символа, пароль — минимум 4' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const row = await createUser({ email: login, passwordHash, name: name || login });
    const user = toUser(row);
    const token = createToken(user.id);
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Такой логин уже занят' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  try {
    const row = await getUserByEmail(login);
    if (!row) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const storedPassword = row.password_hash;
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
    const passwordMatches = isBcryptHash
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;
    if (!passwordMatches) return res.status(401).json({ error: 'Неверный логин или пароль' });
    if (!isBcryptHash) {
      const passwordHash = await bcrypt.hash(password, 10);
      await updateUserPasswordHash(row.id, passwordHash);
    }
    const user = toUser(row);
    const token = createToken(user.id);
    res.json({ user, token });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json(toUser(req.user));
});

module.exports = router;
