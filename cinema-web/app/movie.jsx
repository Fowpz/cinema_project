import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Poster from '../src/components/Poster';
import { api } from '../src/services/api';
import { formatDateLong } from '../src/utils/format';
export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const posterWidth = isWide
    ? Math.min(260, width * 0.28)
    : Math.min(220, width * 0.55);
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let isActive = true;
    const movieId = Array.isArray(id) ? id[0] : id;

    async function loadMovie() {
      try {
        const movieDetails = await api.getMovie(movieId);
        if (isActive) setMovie(movieDetails);
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message || 'Не удалось загрузить фильм');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadMovie();

    return () => {
      isActive = false;
    };
  }, [id]);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Фильм не найден</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4fc3f7" />
      </View>
    );
  }
  if (error || !movie) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{error || 'Фильм не найден'}</Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
        <Text style={styles.backButtonText}>← Афиша</Text>
      </Pressable>

      <View style={[styles.movieDetails, isWide && styles.movieDetailsWide]}>
        <Poster
          uri={movie.posterUrl}
          title={movie.title}
          movieId={movie.id}
          width={posterWidth}
          style={styles.poster}
        />

        <View style={styles.info}>
          <Text style={styles.title}>
            {movie.title} <Text style={styles.age}>({movie.ageRating})</Text>
          </Text>

          <View style={styles.descriptionBox}>
            <Text style={styles.description}>{movie.description}</Text>
          </View>

          <Text style={styles.showtimesTitle}>Сеансы</Text>
          {movie.showtimesByDate.length === 0 ? (
            <Text style={styles.notFound}>Нет доступных сеансов</Text>
          ) : (
            movie.showtimesByDate.map((group) => (
              <View key={group.date} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>
                  {formatDateLong(new Date(`${group.date}T00:00:00`))}
                </Text>
                <View style={styles.grid}>
                  {group.showtimes.map((showtime) => (
                    <Pressable
                      key={showtime.id}
                      style={styles.chip}
                      onPress={() =>
                        router.push({
                          pathname: '/seats',
                          params: { id: showtime.id },
                        })
                      }
                    >
                      <Text style={styles.chipTime}>{showtime.time}</Text>
                      <Text style={styles.chipMeta}>
                        {showtime.hall} · {showtime.price}₽
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8fc' },
  content: {
    padding: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
  },
  backButtonText: { color: '#4fc3f7', fontWeight: '700' },
  center: {
    flex: 1,
    backgroundColor: '#f5f8fc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: { color: '#17324d', fontSize: 16 },
  movieDetails: {
    alignItems: 'center',
    gap: 24,
  },
  movieDetailsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  poster: {
    borderRadius: 16,
  },
  info: {
    flex: 1,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#17324d',
    marginBottom: 12,
  },
  age: { fontSize: 16, fontWeight: '500', color: '#4fc3f7' },
  descriptionBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dce6f1',
  },
  description: { color: '#526b82', fontSize: 14, lineHeight: 22 },
  showtimesTitle: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateGroup: { marginBottom: 16 },
  dateLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17324d',
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#edf6fc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#c8e1f0',
    minWidth: 90,
    alignItems: 'center',
  },
  chipTime: { color: '#4fc3f7', fontWeight: '700', fontSize: 15 },
  chipMeta: { color: '#61758a', fontSize: 11, marginTop: 2 },
});
