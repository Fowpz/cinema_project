const crypto = require('crypto');
const db = require('../db');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USER_COLUMNS = 'id, public_id, login, name, role';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createUser({ login, passwordHash, name }) {
  return db.queryOne(
    `INSERT INTO users (login, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING ${USER_COLUMNS}`,
    [login, passwordHash, name]
  );
}

function getUserByLogin(login) {
  return db.queryOne(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE login = $1`,
    [login]
  );
}

function getUserByPublicId(publicId) {
  return db.queryOne(`SELECT ${USER_COLUMNS} FROM users WHERE public_id = $1`, [publicId]);
}

// Выдаёт новый refresh-токен. В БД попадает только его хеш.
async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at <= now()', [userId]);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 * INTERVAL '1 millisecond'))`,
    [userId, hashToken(token), REFRESH_TOKEN_TTL_MS]
  );
  return token;
}

// Погашает refresh-токен (он одноразовый) и возвращает его владельца или null.
function consumeRefreshToken(token) {
  return db.queryOne(
    `WITH used AS (
       DELETE FROM refresh_tokens
       WHERE token_hash = $1 AND expires_at > now()
       RETURNING user_id
     )
     SELECT ${USER_COLUMNS.split(', ').map((column) => `u.${column}`).join(', ')}
     FROM used
     JOIN users u ON u.id = used.user_id`,
    [hashToken(token)]
  );
}

async function revokeRefreshToken(token) {
  await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)]);
}

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  createUser,
  getUserByLogin,
  getUserByPublicId,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
};
