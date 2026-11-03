const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});

export function buildDateOptions(days = 14) {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const relativeLabel =
      offset === 0 ? 'Сегодня' : offset === 1 ? 'Завтра' : null;

    return {
      value,
      label: [relativeLabel, dateFormatter.format(date)]
        .filter(Boolean)
        .join(' · '),
    };
  });
}
