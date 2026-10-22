import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TicketCard } from '../src/features/tickets/components/TicketCard';
import { api } from '../src/services/api';
import { clearSession, loadSession, saveSession } from '../src/services/auth';
function groupTickets(tickets) {
  const grouped = new Map();
  for (const ticket of tickets) {
    const key = `${ticket.showtime_id}-${ticket.created_at}`;
    const date = new Date(ticket.start_time);
    if (!grouped.has(key))
      grouped.set(key, {
        key,
        movieTitle: ticket.movie_title,
        ageRating: ticket.age_rating,
        posterUrl: ticket.poster_url,
        durationMin: ticket.duration_min,
        genres: ticket.genres,
        hall: ticket.hall_name,
        date,
        time: ticket.start_time.slice(11, 16),
        seats: [],
        total: 0,
        status: ticket.status,
        ticketCode: String(ticket.id).padStart(6, '0'),
      });
    const group = grouped.get(key);
    group.seats.push({
      row: ticket.row_number,
      seat: ticket.seat_number,
      price: Number(ticket.price),
    });
    group.total += Number(ticket.price);
  }
  return [...grouped.values()].sort(
    (firstGroup, secondGroup) =>
      secondGroup.date.getTime() - firstGroup.date.getTime(),
  );
}
export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fetchTickets = async (value) => {
    setLoading(true);
    try {
      setTickets(await api.getGuestTickets(value));
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить билеты');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      try {
        const session = await loadSession();

        if (!isActive) return;
        if (!session) {
          setLoading(false);
          return;
        }

        setUser(session.user);
        setLogin(session.user.login);
        fetchTickets(session.user.login);
      } catch (requestError) {
        if (!isActive) return;
        setError(requestError.message || 'Не удалось восстановить сессию');
        setLoading(false);
      }
    }

    restoreSession();

    return () => {
      isActive = false;
    };
  }, []);
  const submit = async () => {
    const cleanLogin = login.trim().toLowerCase();
    if (!cleanLogin || !password || (mode === 'register' && !name.trim())) {
      setError('Заполните все поля');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session =
        mode === 'login'
          ? await api.login(cleanLogin, password)
          : await api.register(name.trim(), cleanLogin, password);
      await saveSession(session);
      setUser(session.user);
      setPassword('');
      fetchTickets(session.user.login);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось выполнить вход');
    } finally {
      setSubmitting(false);
    }
  };
  const logout = async () => {
    await clearSession();
    setUser(null);
    setTickets([]);
    setError(null);
    setLoading(false);
  };
  const groups = groupTickets(tickets);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>← Афиша</Text>
        </Pressable>
        {user && (
          <Pressable onPress={logout}>
            <Text style={styles.logout}>Выйти</Text>
          </Pressable>
        )}
      </View>
      {!user ? (
        <View style={styles.card}>
          <Text style={styles.title}>Личный кабинет</Text>
          <Text style={styles.subtitle}>
            Войдите по логину и паролю, чтобы покупать билеты и видеть свои
            заказы.
          </Text>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => {
                setMode('login');
                setError(null);
              }}
            >
              <Text style={styles.tabText}>Вход</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => {
                setMode('register');
                setError(null);
              }}
            >
              <Text style={styles.tabText}>Регистрация</Text>
            </Pressable>
          </View>
          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Ваше имя"
              placeholderTextColor="#7890a4"
              value={name}
              onChangeText={setName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Логин"
            placeholderTextColor="#7890a4"
            autoCapitalize="none"
            value={login}
            onChangeText={setLogin}
          />
          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor="#7890a4"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.action, submitting && styles.actionDisabled]}
            disabled={submitting}
            onPress={submit}
          >
            <Text style={styles.actionText}>
              {submitting
                ? 'Подождите…'
                : mode === 'login'
                  ? 'Войти'
                  : 'Создать аккаунт'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Здравствуйте, {user.name}</Text>
            <Text style={styles.subtitle}>Логин: {user.login}</Text>
          </View>
          {user.role === 'admin' && (
            <Pressable
              style={styles.adminButton}
              onPress={() => router.push('/admin')}
            >
              <Text style={styles.adminButtonText}>Управление афишей</Text>
            </Pressable>
          )}
          <Text style={styles.ordersTitle}>Мои билеты</Text>
          {loading ? (
            <ActivityIndicator color="#4fc3f7" />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : groups.length === 0 ? (
            <Text style={styles.empty}>Купленных билетов пока нет</Text>
          ) : (
            groups.map(({ key, ...group }) => (
              <TicketCard key={key} {...group} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8fc' },
  content: { padding: 16, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  back: { color: '#4fc3f7', fontWeight: '700' },
  logout: { color: '#ff8a80', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dce6f1',
  },
  title: { color: '#17324d', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#61758a', fontSize: 14, lineHeight: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 9,
    alignItems: 'center',
    backgroundColor: '#f3f7fa',
  },
  tabActive: { backgroundColor: '#e3f2fd' },
  tabText: { color: '#2589bd', fontWeight: '700' },
  input: {
    backgroundColor: '#fff',
    color: '#17324d',
    borderWidth: 1,
    borderColor: '#cddce8',
    borderRadius: 10,
    padding: 13,
    marginTop: 10,
    fontSize: 15,
  },
  error: { color: '#d95c5c', marginTop: 12 },
  action: {
    backgroundColor: '#4fc3f7',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: '#17324d', fontWeight: '800', fontSize: 15 },
  ordersTitle: {
    color: '#17324d',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 14,
  },
  empty: { color: '#61758a', textAlign: 'center', marginTop: 16 },
  adminButton: {
    backgroundColor: '#e8f4fc',
    borderColor: '#b8d9ed',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  adminButtonText: { color: '#2589bd', fontWeight: '800' },
});
