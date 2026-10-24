const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_ALGORITHM, getJwtSecret } = require('../config/jwt');

async function requireAuth(req, res, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  if (!match) return res.status(401).json({ error: 'Не авторизован' });

  let secret;
  try {
    secret = getJwtSecret();
  } catch (error) {
    return next(error);
  }

  let payload;
  try {
    payload = jwt.verify(match[1], secret, {
      algorithms: [JWT_ALGORITHM],
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof SyntaxError) {
      return res.status(401).json({ error: 'Неверная или истёкшая сессия' });
    }
    return next(error);
  }

  if (!payload || typeof payload !== 'object'
    || !Number.isInteger(payload.userId) || payload.userId <= 0) {
    return res.status(401).json({ error: 'Неверная или истёкшая сессия' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [payload.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'Пользователь не найден' });
    req.user = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
