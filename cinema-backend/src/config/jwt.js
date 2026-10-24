const JWT_ALGORITHM = 'HS256';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET должен быть задан и содержать не менее 32 байт');
  }
  return secret;
}

module.exports = { JWT_ALGORITHM, getJwtSecret };
