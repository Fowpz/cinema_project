// Список сеансов на выбранную дату с возможностью удалить сеанс.
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SelectField from '../../../components/SelectField';
import { api } from '../../../services/api';
import { confirmAction } from '../confirm';
import { buildDateOptions } from '../options';

// Сеансы выбранного дня с возможностью удаления.
export default function ShowtimeList({ onChanged }) {
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [date, setDate] = useState(dateOptions[0].value);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;
    api
      .getAdminShowtimes(date)
      .then((data) => {
        // Фильм, начавшийся накануне вечером, относится к предыдущему дню.
        if (isActive) {
          setShowtimes(data.filter((item) => item.startsAt.startsWith(date)));
        }
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [date]);

  const remove = async (showtime) => {
    const confirmed = await confirmAction(
      'Удалить сеанс?',
      `«${showtime.movieTitle}», ${showtime.startsAt.slice(11)}, ${showtime.hall}`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await api.deleteShowtime(showtime.id);
      setShowtimes((current) =>
        current.filter((item) => item.id !== showtime.id),
      );
      onChanged();
    } catch (requestError) {
      setError(requestError.message || 'Не удалось удалить сеанс');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Все сеансы</Text>
      <SelectField
        label="Дата"
        value={date}
        options={dateOptions}
        onChange={(nextDate) => {
          setLoading(true);
          setError(null);
          setDate(nextDate);
        }}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator color="#4fc3f7" />
      ) : showtimes.length === 0 ? (
        <Text style={styles.empty}>На эту дату сеансов нет.</Text>
      ) : (
        showtimes.map((showtime) => (
          <View key={showtime.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.movie}>{showtime.movieTitle}</Text>
              <Text style={styles.meta}>
                {showtime.startsAt.slice(11)}–{showtime.endsAt.slice(11)} ·{' '}
                {showtime.hall} · {showtime.price} ₽
              </Text>
              {showtime.sold > 0 && (
                <Text style={styles.meta}>Продано билетов: {showtime.sold}</Text>
              )}
            </View>
            {showtime.sold === 0 && (
              <Pressable style={styles.remove} onPress={() => remove(showtime)}>
                <Text style={styles.removeText}>Удалить</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce6f1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  error: { color: '#d95c5c', marginBottom: 10 },
  empty: { color: '#61758a' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e4edf4',
    paddingVertical: 10,
  },
  info: { flex: 1 },
  movie: { color: '#17324d', fontWeight: '700', fontSize: 15 },
  meta: { color: '#61758a', fontSize: 13, marginTop: 2 },
  remove: {
    borderWidth: 1,
    borderColor: '#efc4c4',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  removeText: { color: '#d95c5c', fontWeight: '600', fontSize: 13 },
});
