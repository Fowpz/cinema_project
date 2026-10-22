function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
export function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ${pluralize(h, 'час', 'часа', 'часов')}`);
  if (m > 0) parts.push(`${m} ${pluralize(m, 'минута', 'минуты', 'минут')}`);
  return parts.join(' ');
}
export function formatDateLong(date) {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
export function formatRelative(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 0) return 'скоро';
  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'вчера';
  if (diffDays < 30)
    return `${diffDays} ${pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')} назад`;
  }
  return 'больше 1 года назад';
}
