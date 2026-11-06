// Форма выбора фильма и создания для него отдельного сеанса.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ShowtimeFields from './ShowtimeFields';
import { toDateId } from '../../../utils/format';

function createDefaultShowtime(hallId) {
  return { hallId, date: toDateId(new Date()), time: '18:00', price: 300 };
}

export default function CreateShowtimeForm({ halls, movies, refreshKey, saving, message, onSubmit, onMessageClear }) {
  const [movieId, setMovieId] = useState(movies[0]?.id ?? null);
  const [showtime, setShowtime] = useState(() => createDefaultShowtime(halls[0]?.id ?? 0));
  const movieCounts = useMemo(() => movies.reduce((counts, movie) => {
    counts[movie.title] = (counts[movie.title] || 0) + 1;
    return counts;
  }, {}), [movies]);
  const selectedMovie = movies.find((movie) => movie.id === movieId);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Новый сеанс</Text>
      {movies.length === 0 ? (
        <Text style={styles.empty}>Сначала добавьте фильм в афишу.</Text>
      ) : (
        <>
          <Text style={styles.label}>Фильм</Text>
          <View style={styles.choices}>
            {movies.map((movie) => (
              <Pressable key={movie.id} style={[styles.choice, movie.id === movieId && styles.choiceActive]} onPress={() => { setMovieId(movie.id); onMessageClear(); }}>
                <Text style={[styles.choiceText, movie.id === movieId && styles.choiceTextActive]}>
                  {movie.title}{movieCounts[movie.title] > 1 ? ' (№' + movie.id + ')' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <ShowtimeFields value={showtime} halls={halls} durationMin={selectedMovie?.duration_min || 0} refreshKey={refreshKey} onChange={(patch) => setShowtime((current) => ({ ...current, ...patch }))} />
      {message && <Text style={styles.message}>{message}</Text>}
      <Pressable style={[styles.save, (!movies.length || saving) && styles.disabled]} disabled={!movies.length || saving} onPress={() => onSubmit(movieId, showtime)}>
        <Text style={styles.saveText}>{saving ? 'Сохраняем…' : 'Создать сеанс'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce6f1', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#90a8bd', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { color: '#17324d', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  choice: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#f3f7fa', borderRadius: 8, borderWidth: 1, borderColor: '#d9e4ec' },
  choiceActive: { backgroundColor: '#e3f2fd', borderColor: '#9dcbe6' },
  choiceText: { color: '#61758a', fontSize: 13 },
  choiceTextActive: { color: '#2589bd', fontWeight: '700' },
  empty: { color: '#61758a', marginBottom: 14 },
  message: { color: '#2589bd', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  save: { backgroundColor: '#4fc3f7', borderRadius: 12, padding: 15, alignItems: 'center' },
  disabled: { opacity: 0.55 },
  saveText: { color: '#17324d', fontWeight: '800', fontSize: 16 },
});
