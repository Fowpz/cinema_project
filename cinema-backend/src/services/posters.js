const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { httpError } = require('../utils/http');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const POSTERS_DIR = path.join(UPLOADS_DIR, 'posters');
const MAX_POSTER_BYTES = 10 * 1024 * 1024;

// Формат определяется по содержимому файла, а не по тому, что заявил клиент.
function detectExtension(buffer) {
  if (buffer.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpg';
  if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (buffer.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF'
    && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

// Принимает картинку в виде data URL, сохраняет файл и возвращает его адрес.
async function savePoster(dataUrl) {
  const match = /^data:image\/[\w.+-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw httpError(400, 'Не удалось прочитать картинку постера');

  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length > MAX_POSTER_BYTES) {
    throw httpError(413, 'Постер слишком большой, максимум 10 МБ');
  }
  const extension = detectExtension(buffer);
  if (!extension) throw httpError(400, 'Постер должен быть в формате JPG, PNG, WEBP или GIF');

  const fileName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  await fs.mkdir(POSTERS_DIR, { recursive: true });
  await fs.writeFile(path.join(POSTERS_DIR, fileName), buffer);
  return `/uploads/posters/${fileName}`;
}

async function removePoster(posterUrl) {
  await fs.rm(path.join(POSTERS_DIR, path.basename(posterUrl)), { force: true });
}

module.exports = { UPLOADS_DIR, savePoster, removePoster };
