const MAX_INT = 2147483647;

// Возвращает id как число или null, если значение не подходит для колонки SERIAL.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= MAX_INT ? id : null;
}

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

// Сеансы начинаются только в начале часа: 09:00, 18:00 и так далее.
function isWholeHour(time) {
  return typeof time === 'string' && /^(?:[01]\d|2[0-3]):00$/.test(time);
}

module.exports = { parseId, isValidDate, isWholeHour };
