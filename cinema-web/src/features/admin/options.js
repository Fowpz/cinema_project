// Справочные варианты рейтингов и дат для форм администрирования.
import { toDateId } from '../../utils/format';

export const AGE_RATINGS = ['0+', '6+', '12+', '16+', '18+'].map((value) => ({
  value,
  label: value,
}));

export const HOURS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, '0')}:00`,
);

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
});

export function buildDateOptions(days = 14) {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const value = toDateId(date);
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
