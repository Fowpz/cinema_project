import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useKeyboardLift } from '../src/hooks/useKeyboardLift';
import ShowtimeFields from '../src/features/admin/components/ShowtimeFields';
import { api } from '../src/services/api';
import { loadSession } from '../src/services/auth';
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createDefaultShowtime(hallId) {
  return {
    hallId,
    date: today(),
    time: '18:00',
    price: 300,
  };
}

export default function AdminScreen() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [halls, setHalls] = useState([]);
  const [movies, setMovies] = useState([]);
  const [mode, setMode] = useState('showtime');
  const [movieId, setMovieId] = useState(null);
  const [newShowtime, setNewShowtime] = useState({
    hallId: 0,
    date: today(),
    time: '18:00',
    price: 300,
  });
  const [title, setTitle] = useState('');
  const [ageRating, setAgeRating] = useState('12+');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [duration, setDuration] = useState('120');
  const [genres, setGenres] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const scrollRef = useRef(null);
  const { keyboardOpen, onScroll } = useKeyboardLift(scrollRef);

  useEffect(() => {
    let isActive = true;

    async function loadAdminData() {
      try {
        const session = await loadSession();
        if (!session || session.user.role !== 'admin') return;

        setToken(session.token);
        const [hallData, movieData] = await Promise.all([
          api.getAdminHalls(session.token),
          api.getAdminMovies(session.token),
        ]);

        if (!isActive) return;

        setHalls(hallData);
        setMovies(movieData);
        if (hallData[0]) {
          setShowtimes([createDefaultShowtime(hallData[0].id)]);
          setNewShowtime((current) => ({ ...current, hallId: hallData[0].id }));
        }
        if (movieData[0]) setMovieId(movieData[0].id);
      } catch (error) {
        if (isActive) {
          setMessage(error.message || 'Не удалось загрузить данные афиши');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadAdminData();

    return () => {
      isActive = false;
    };
  }, []);

  const movieOptions = movies.map((movie) => {
    const sameTitle = movies.filter((item) => item.title === movie.title);
    return {
      value: movie.id,
      label:
        sameTitle.length > 1 ? `${movie.title} (№${movie.id})` : movie.title,
    };
  });
  const updateShowtime = (index, patch) => {
    setShowtimes((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };
  const submit = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.createMovie(token, {
        title,
        ageRating,
        description,
        posterUrl,
        durationMin: Number(duration),
        genres,
        isActive: true,
        showtimes,
      });
      setMessage(`«${result.movie.title}» добавлен в афишу`);
      setMovies((current) =>
        [...current, result.movie].sort((a, b) =>
          a.title.localeCompare(b.title, 'ru'),
        ),
      );
      setTitle('');
      setDescription('');
      setPosterUrl('');
      setGenres('');
      setDuration('120');
      if (halls[0]) setShowtimes([createDefaultShowtime(halls[0].id)]);
    } catch (error) {
      setMessage(error.message || 'Не удалось сохранить фильм');
    } finally {
      setSaving(false);
    }
  };
  const submitShowtime = async () => {
    if (!token || !movieId) {
      setMessage('Выберите фильм для сеанса');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.createShowtime(token, movieId, newShowtime);
      const movie = movies.find((item) => item.id === movieId);
      setMessage(`Сеанс фильма «${movie?.title}» добавлен`);
    } catch (error) {
      setMessage(error.message || 'Не удалось создать сеанс');
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4fc3f7" />
      </View>
    );
  if (!token)
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>
          Этот раздел доступен только администратору.
        </Text>
        <Pressable onPress={() => router.replace('/profile')}>
          <Text style={styles.link}>Перейти в личный кабинет</Text>
        </Pressable>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      enabled={Platform.OS !== 'web'}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          keyboardOpen && styles.contentKeyboard,
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.navigation}>
          <Pressable style={styles.navButton} onPress={() => router.push('/')}>
            <Text style={styles.link}>Сеансы</Text>
          </Pressable>
          <Pressable
            style={styles.navButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.link}>Личный кабинет</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Управление афишей</Text>
        <Text style={styles.subtitle}>
          Добавляйте фильмы и планируйте для них сеансы.
        </Text>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'showtime' && styles.tabActive]}
            onPress={() => {
              setMode('showtime');
              setMessage(null);
            }}
          >
            <Text
              style={[
                styles.tabText,
                mode === 'showtime' && styles.tabTextActive,
              ]}
            >
              Создать сеанс
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'movie' && styles.tabActive]}
            onPress={() => {
              setMode('movie');
              setMessage(null);
            }}
          >
            <Text
              style={[styles.tabText, mode === 'movie' && styles.tabTextActive]}
            >
              Добавить фильм
            </Text>
          </Pressable>
        </View>

        {mode === 'movie' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Фильм</Text>
              <TextInput
                style={styles.inputPlain}
                placeholder="Название фильма"
                placeholderTextColor="#7890a4"
                value={title}
                onChangeText={setTitle}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.inputPlain, styles.half]}
                  placeholder="Возраст, например 12+"
                  placeholderTextColor="#7890a4"
                  value={ageRating}
                  onChangeText={setAgeRating}
                />
                <TextInput
                  style={[styles.inputPlain, styles.half]}
                  placeholder="Длительность, мин"
                  placeholderTextColor="#7890a4"
                  keyboardType="number-pad"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
              <TextInput
                style={styles.inputPlain}
                placeholder="Жанры через запятую"
                placeholderTextColor="#7890a4"
                value={genres}
                onChangeText={setGenres}
              />
              <TextInput
                style={styles.inputPlain}
                placeholder="Ссылка на изображение постера"
                placeholderTextColor="#7890a4"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={posterUrl}
                onChangeText={setPosterUrl}
              />
              <TextInput
                style={[styles.inputPlain, styles.description]}
                placeholder="Описание фильма"
                placeholderTextColor="#7890a4"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Сеансы</Text>
                <Pressable
                  onPress={() =>
                    halls[0] &&
                    setShowtimes((items) => [
                      ...items,
                      createDefaultShowtime(halls[0].id),
                    ])
                  }
                >
                  <Text style={styles.add}>+ Добавить</Text>
                </Pressable>
              </View>
              {showtimes.map((showtime, index) => (
                <View key={index} style={styles.showtime}>
                  <ShowtimeFields
                    value={showtime}
                    halls={halls}
                    onChange={(patch) => updateShowtime(index, patch)}
                  />
                  {showtimes.length > 1 && (
                    <Pressable
                      onPress={() =>
                        setShowtimes((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Text style={styles.remove}>Удалить сеанс</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            {message && <Text style={styles.message}>{message}</Text>}
            <Pressable
              style={[
                styles.save,
                (saving || halls.length === 0) && styles.saveDisabled,
              ]}
              disabled={saving || halls.length === 0}
              onPress={submit}
            >
              <Text style={styles.saveText}>
                {saving ? 'Сохраняем…' : 'Добавить фильм в афишу'}
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Новый сеанс</Text>
            {movies.length === 0 ? (
              <Text style={styles.empty}>Сначала добавьте фильм в афишу.</Text>
            ) : (
              <>
                <Text style={styles.label}>Фильм</Text>
                <View style={styles.halls}>
                  {movieOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.hallChip,
                        option.value === movieId && styles.hallChipActive,
                      ]}
                      onPress={() => {
                        setMovieId(option.value);
                        setMessage(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.hallText,
                          option.value === movieId && styles.hallTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <ShowtimeFields
              value={newShowtime}
              halls={halls}
              onChange={(patch) =>
                setNewShowtime((current) => ({ ...current, ...patch }))
              }
            />
            {message && <Text style={styles.message}>{message}</Text>}
            <Pressable
              style={[
                styles.save,
                (saving || movies.length === 0) && styles.saveDisabled,
              ]}
              disabled={saving || movies.length === 0}
              onPress={submitShowtime}
            >
              <Text style={styles.saveText}>
                {saving ? 'Сохраняем…' : 'Создать сеанс'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  contentKeyboard: { paddingBottom: 260 },
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f5f8fc' },
  content: {
    padding: 16,
    paddingBottom: 48,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#f5f8fc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  navigation: { flexDirection: 'row', gap: 10 },
  navButton: {
    backgroundColor: '#e8f4fc',
    borderWidth: 1,
    borderColor: '#b8d9ed',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  title: { color: '#17324d', fontWeight: '800', fontSize: 26, marginTop: 18 },
  subtitle: { color: '#61758a', fontSize: 14, marginTop: 6, marginBottom: 20 },
  link: { color: '#2589bd', fontWeight: '700' },
  denied: {
    color: '#17324d',
    textAlign: 'center',
    marginBottom: 14,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dce6f1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#90a8bd',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#17324d',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  add: { color: '#2589bd', fontWeight: '700', marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#eaf0f5',
    padding: 12,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#d8effb' },
  tabText: { color: '#61758a', fontWeight: '700' },
  tabTextActive: { color: '#2589bd' },
  empty: { color: '#61758a', marginBottom: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cddce8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#17324d',
    marginBottom: 10,
    fontSize: 14,
  },
  inputPlain: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cddce8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#17324d',
    fontSize: 15,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  third: { flex: 1 },
  description: { minHeight: 100, textAlignVertical: 'top' },
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  halls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  hallChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  hallChipActive: { backgroundColor: '#e3f2fd', borderColor: '#9dcbe6' },
  hallText: { color: '#61758a', fontSize: 13 },
  hallTextActive: { color: '#2589bd', fontWeight: '700' },
  showtime: {
    borderTopWidth: 1,
    borderTopColor: '#e4edf4',
    paddingTop: 14,
    marginTop: 4,
  },
  remove: {
    color: '#d95c5c',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    color: '#2589bd',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  save: {
    backgroundColor: '#4fc3f7',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: '#17324d', fontWeight: '800', fontSize: 16 },
});
