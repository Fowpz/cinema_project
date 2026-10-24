import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../src/services/api';
import { loadSession } from '../../src/services/auth';
export default function SeatsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const showtimeId = Array.isArray(id) ? id[0] : id;
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [session, setSession] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (!showtimeId) return;

    let isActive = true;

    async function loadShowtime() {
      try {
        const [showtimeDetails, seatList] = await Promise.all([
          api.getShowtime(showtimeId),
          api.getSeats(showtimeId),
        ]);

        if (isActive) {
          setShowtime(showtimeDetails);
          setSeats(seatList);
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message || 'Не удалось загрузить сеанс');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadShowtime();

    return () => {
      isActive = false;
    };
  }, [showtimeId]);

  useEffect(() => {
    loadSession().then((session) => {
      setSession(session);
    });
  }, []);

  if (!showtimeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Сеанс не найден</Text>
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
  if (error || !showtime) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{error || 'Сеанс не найден'}</Text>
      </View>
    );
  }
  const total = selected.length * showtime.price;
  const rowsCount = seats.reduce((max, s) => Math.max(max, s.row), 0);
  const seatsPerRow = seats.reduce((max, s) => Math.max(max, s.seat), 0);
  const seatAt = (row, seat) =>
    seats.find((s) => s.row === row && s.seat === seat);
  const toggleSeat = (seat) => {
    if (seat.occupied || showtime?.isPast || showtime?.isDuplicate) return;
    setSelected((prev) =>
      prev.includes(seat.id)
        ? prev.filter((sid) => sid !== seat.id)
        : [...prev, seat.id],
    );
  };
  const openCheckout = () => {
    if (showtime.isPast || showtime.isDuplicate) {
      setFormError(
        showtime.isPast
          ? 'Этот сеанс уже начался, купить билет нельзя.'
          : 'Этот сеанс уже есть в расписании. Выберите показанное время из афиши.',
      );
      return;
    }
    if (selected.length === 0) return;
    if (!session) {
      alert('Для покупки билета войдите в личный кабинет');
      router.push('/profile');
      return;
    }
    setFormError(null);
    setModalVisible(true);
  };
  const confirmPurchase = async () => {
    setPaying(true);
    setFormError(null);
    try {
      const booking = await api.bookTickets(session.token, {
        showtimeId: showtimeId,
        seatIds: selected,
      });
      setModalVisible(false);
      alert(
        `Билет оформлен!\n\n${showtime.movieTitle}\n${showtime.date} ${showtime.time}\nМест: ${selected.length}\nСумма: ${booking.total}₽\n\nБилет сохранён в личном кабинете.`,
      );
      router.replace('/profile');
    } catch (requestError) {
      const bookingError =
        requestError.message ||
        'Не удалось оформить покупку — возможно, места уже заняты';

      try {
        const updatedSeats = await api.getSeats(showtimeId);
        setSeats(updatedSeats);
        setSelected((previousSelection) =>
          previousSelection.filter(
            (seatId) =>
              !updatedSeats.find((seat) => seat.id === seatId)?.occupied,
          ),
        );
        setFormError(bookingError);
      } catch (refreshError) {
        setFormError(
          `${bookingError}. Не удалось обновить список мест: ${
            refreshError.message || 'ошибка запроса'
          }`,
        );
      }
    } finally {
      setPaying(false);
    }
  };
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.movieTitle}>{showtime.movieTitle}</Text>
        <Text style={styles.meta}>
          {showtime.date} · {showtime.time} · {showtime.hall}
        </Text>
        {showtime.isPast && (
          <Text style={styles.formError}>
            Сеанс уже начался. Покупка билетов недоступна.
          </Text>
        )}
        {showtime.isDuplicate && (
          <Text style={styles.formError}>
            Этот сеанс дублируется. Вернитесь в афишу и выберите показанное
            время.
          </Text>
        )}

        <View style={styles.screen}>
          <Text style={styles.screenText}>ЭКРАН</Text>
        </View>

        <View style={styles.hall}>
          {Array.from({ length: rowsCount }, (_, rowIdx) => {
            const row = rowIdx + 1;
            return (
              <View key={row} style={styles.row}>
                <Text style={styles.rowNum}>{row}</Text>
                {Array.from({ length: seatsPerRow }, (_, seatIdx) => {
                  const seatNum = seatIdx + 1;
                  const seat = seatAt(row, seatNum);
                  if (!seat) return <View key={seatNum} style={styles.seat} />;
                  const isSelected = selected.includes(seat.id);
                  return (
                    <Pressable
                      key={seatNum}
                      style={[
                        styles.seat,
                        seat.occupied && styles.seatOccupied,
                        isSelected && styles.seatSelected,
                      ]}
                      onPress={() => toggleSeat(seat)}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#dce6ef' }]} />
            <Text style={styles.legendText}>Свободно</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4fc3f7' }]} />
            <Text style={styles.legendText}>Выбрано</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#a9b7c4' }]} />
            <Text style={styles.legendText}>Занято</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>
            {selected.length > 0
              ? `Выбрано мест: ${selected.length}`
              : 'Выберите места'}
          </Text>
          <Text style={styles.footerPrice}>{total} ₽</Text>
        </View>
        <Pressable
          style={[
            styles.payBtn,
            (selected.length === 0 ||
              showtime.isPast ||
              showtime.isDuplicate) &&
              styles.payBtnDisabled,
          ]}
          onPress={openCheckout}
          disabled={
            selected.length === 0 || showtime.isPast || showtime.isDuplicate
          }
        >
          <Text style={styles.payBtnText}>Оплатить</Text>
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !paying && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Подтвердите покупку</Text>
            <Text style={styles.modalSubtitle}>
              Билет будет сохранён в вашем личном кабинете.
            </Text>

            {formError && <Text style={styles.formError}>{formError}</Text>}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={paying}
              >
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, paying && styles.payBtnDisabled]}
                onPress={confirmPurchase}
                disabled={paying}
              >
                <Text style={styles.payBtnText}>
                  {paying ? 'Оформляем…' : `Оплатить ${total} ₽`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8fc' },
  content: { padding: 16, paddingBottom: 120 },
  center: {
    flex: 1,
    backgroundColor: '#f5f8fc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFound: { color: '#17324d' },
  movieTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17324d',
    marginBottom: 4,
  },
  meta: { color: '#61758a', marginBottom: 24 },
  screen: {
    height: 28,
    backgroundColor: '#e8f4fc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c8e1f0',
  },
  screenText: { color: '#4fc3f7', fontSize: 11, letterSpacing: 4 },
  hall: { alignItems: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowNum: {
    width: 20,
    color: '#7890a4',
    fontSize: 11,
    textAlign: 'right',
    marginRight: 6,
  },
  seat: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#dce6ef',
    marginHorizontal: 3,
  },
  seatOccupied: { backgroundColor: '#a9b7c4' },
  seatSelected: { backgroundColor: '#4fc3f7' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: '#61758a', fontSize: 12 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#dce6f1',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: { color: '#61758a', fontSize: 13 },
  footerPrice: {
    color: '#17324d',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  payBtn: {
    backgroundColor: '#4fc3f7',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  payBtnDisabled: { backgroundColor: '#c8d4df' },
  payBtnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23,50,77,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#dce6f1',
  },
  modalTitle: {
    color: '#17324d',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#61758a',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 18,
  },
  formError: { color: '#ff6b6b', fontSize: 13, marginTop: 10 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cddce8',
  },
  cancelBtnText: { color: '#526b82', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: '#4fc3f7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
