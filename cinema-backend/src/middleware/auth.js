const { verifyAccessToken } = require('../config/jwt');
const { getUserByPublicId } = require('../services/auth');
const { asyncHandler } = require('../utils/http');

const requireAuth = asyncHandler(async (req, res, next) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  if (!match) return res.status(401).json({ error: 'Не авторизован' });

  const publicId = verifyAccessToken(match[1]);
  if (!publicId) return res.status(401).json({ error: 'Неверная или истёкшая сессия' });

  const user = await getUserByPublicId(publicId);
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

  req.user = user;
  return next();
});

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
