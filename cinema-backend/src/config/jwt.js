const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL = '15m';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET должен быть задан и содержать не менее 32 байт');
  }
  return secret;
}

// Содержимое JWT может прочитать любой, подпись защищает только от подделки.
// Поэтому в токене лежит лишь случайный идентификатор, остальное берётся из БД.
function signAccessToken(publicId) {
  return jwt.sign({}, getJwtSecret(), {
    algorithm: ALGORITHM,
    subject: publicId,
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

// Возвращает public_id пользователя или null, если токен неверный или истёк.
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: [ALGORITHM] }).sub || null;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null;
    throw error;
  }
}

module.exports = { getJwtSecret, signAccessToken, verifyAccessToken };
