const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_ALGORITHM, getJwtSecret } = require('../config/jwt');
const { requireAuth } = require('../middleware/auth');

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
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [login, passwordHash, name || login]
    );
    const user = toUser(rows[0]);
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
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [login]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    const storedPassword = rows[0].password_hash;
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
    const passwordMatches = isBcryptHash
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;
    if (!passwordMatches) return res.status(401).json({ error: 'Неверный логин или пароль' });
    if (!isBcryptHash) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].id]);
    }
    const user = toUser(rows[0]);
    const token = createToken(user.id);
    res.json({ user, token });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json(toUser(req.user));
});

module.exports = router;
