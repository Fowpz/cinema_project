// Экран администрирования: проверка роли, загрузка справочников и переключение вкладок.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import CreateShowtimeForm from '../src/features/admin/components/CreateShowtimeForm';
import MovieForm from '../src/features/admin/components/MovieForm';
import ShowtimeList from '../src/features/admin/components/ShowtimeList';
import { api } from '../src/services/api';
import { getCurrentUser } from '../src/services/auth';

export default function AdminScreen() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [halls, setHalls] = useState([]);
  const [movies, setMovies] = useState([]);
  const [mode, setMode] = useState('showtime');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshShowtimes = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    let isActive = true;
    async function loadAdminData() {
      try {
        const user = await getCurrentUser();
        if (!isActive || user?.role !== 'admin') return;
        const [hallData, movieData] = await Promise.all([
          api.getAdminHalls(),
          api.getAdminMovies(),
        ]);
        if (!isActive) return;
        setIsAdmin(true);
        setHalls(hallData);
        setMovies(movieData);
      } catch (error) {
        if (isActive) setMessage(error.message || 'Не удалось загрузить данные афиши');
      } finally {
        if (isActive) setLoading(false);
      }
    }
    loadAdminData();
    return () => { isActive = false; };
  }, []);

  const createMovie = async (movieData) => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await api.createMovie(movieData);
      setMovies((current) => [...current, result.movie].sort((a, b) => a.title.localeCompare(b.title, 'ru')));
      setMessage('«' + result.movie.title + '» добавлен в афишу');
      refreshShowtimes();
      return true;
    } catch (error) {
      setMessage(error.message || 'Не удалось сохранить фильм');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createShowtime = async (movieId, showtime) => {
    setSaving(true);
    setMessage(null);
    try {
      await api.createShowtime(movieId, showtime);
      const movie = movies.find((item) => item.id === movieId);
      setMessage('Сеанс фильма «' + (movie?.title || '') + '» добавлен');
      refreshShowtimes();
    } catch (error) {
      setMessage(error.message || 'Не удалось создать сеанс');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4fc3f7" /></View>;
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Этот раздел доступен только администратору.</Text>
        <Pressable onPress={() => router.replace('/profile')}><Text style={styles.link}>Перейти в личный кабинет</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.navigation}>
          <Pressable style={styles.navButton} onPress={() => router.push('/')}><Text style={styles.link}>Сеансы</Text></Pressable>
          <Pressable style={styles.navButton} onPress={() => router.push('/profile')}><Text style={styles.link}>Личный кабинет</Text></Pressable>
        </View>
        <Text style={styles.title}>Управление афишей</Text>
        <Text style={styles.subtitle}>Добавляйте фильмы, планируйте и удаляйте сеансы.</Text>
        <View style={styles.tabs}>
          {[
            ['showtime', 'Создать сеанс'],
            ['movie', 'Добавить фильм'],
            ['list', 'Все сеансы'],
          ].map(([value, label]) => (
            <Pressable key={value} style={[styles.tab, mode === value && styles.tabActive]} onPress={() => { setMode(value); setMessage(null); }}>
              <Text style={[styles.tabText, mode === value && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'list' && <ShowtimeList onChanged={refreshShowtimes} />}
        <View style={mode === 'movie' ? undefined : styles.hidden}>
          <MovieForm halls={halls} refreshKey={refreshKey} saving={saving} message={message} onSubmit={createMovie} />
        </View>
        <View style={mode === 'showtime' ? undefined : styles.hidden}>
          <CreateShowtimeForm halls={halls} movies={movies} refreshKey={refreshKey} saving={saving} message={message} onSubmit={createShowtime} onMessageClear={() => setMessage(null)} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8fc' },
  content: { padding: 16, paddingBottom: 48, maxWidth: 820, width: '100%', alignSelf: 'center' },
  center: { flex: 1, backgroundColor: '#f5f8fc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  navigation: { flexDirection: 'row', gap: 10 },
  navButton: { backgroundColor: '#e8f4fc', borderWidth: 1, borderColor: '#b8d9ed', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  title: { color: '#17324d', fontWeight: '800', fontSize: 26, marginTop: 18 },
  subtitle: { color: '#61758a', fontSize: 14, marginTop: 6, marginBottom: 20 },
  link: { color: '#2589bd', fontWeight: '700' },
  denied: { color: '#17324d', textAlign: 'center', marginBottom: 14, fontSize: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, borderRadius: 10, backgroundColor: '#eaf0f5', padding: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#d8effb' },
  tabText: { color: '#61758a', fontWeight: '700' },
  tabTextActive: { color: '#2589bd' },
  hidden: { display: 'none' },
});
