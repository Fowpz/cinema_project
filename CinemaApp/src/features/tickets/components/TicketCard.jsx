import { Image, StyleSheet, Text, View } from 'react-native';
import {
  formatDateLong,
  formatDuration,
  formatRelative,
} from '../../../utils/format';
const STATUS_LABELS = {
  paid: 'Оплачено',
  booked: 'Забронировано',
  cancelled: 'Отменено',
  used: 'Использовано',
};
export function TicketCard({
  movieTitle,
  ageRating,
  posterUrl,
  durationMin,
  genres,
  hall,
  date,
  time,
  seats,
  total,
  status,
  ticketCode,
}) {
  const tags = (genres || '')
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]} />
        )}
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {movieTitle}
            </Text>
            <View style={styles.ageBadge}>
              <Text style={styles.ageText}>{ageRating}</Text>
            </View>
          </View>
          {!!durationMin && (
            <Text style={styles.duration}>{formatDuration(durationMin)}</Text>
          )}
          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.dateRow}>
        <Text style={styles.time}>{time}</Text>
        <View>
          <Text style={styles.date}>{formatDateLong(date)}</Text>
          <Text style={styles.relative}>{formatRelative(date)}</Text>
        </View>
      </View>

      <Text style={styles.hall}>{hall}</Text>
      {seats.map((seat) => (
        <View key={`${seat.row}-${seat.seat}`} style={styles.seatRow}>
          <Text style={styles.seatLabel}>
            {seat.row} ряд: {seat.seat} место
          </Text>
          <Text style={styles.seatPrice}>{seat.price} ₽</Text>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Итого</Text>
        <Text style={styles.totalPrice}>{total} ₽</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerInfo}>
          <Text style={styles.status}>{STATUS_LABELS[status] || status}</Text>
        </View>
        <View style={styles.qrBlock}>
          <Text style={styles.ticketCode}>{ticketCode}</Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dce6f1',
  },
  headerRow: { flexDirection: 'row', gap: 12 },
  poster: { width: 56, height: 56, borderRadius: 10 },
  posterFallback: { backgroundColor: '#1e3a5f' },
  headerInfo: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: { color: '#17324d', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  ageBadge: {
    backgroundColor: 'rgba(255,90,90,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ageText: { color: '#ff6b6b', fontSize: 11, fontWeight: '700' },
  duration: { color: '#61758a', fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: {
    backgroundColor: '#f3f7fa',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  tagText: { color: '#61758a', fontSize: 11 },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#dce6f1',
    marginVertical: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  time: { color: '#17324d', fontSize: 28, fontWeight: '800' },
  date: { color: '#17324d', fontSize: 14, fontWeight: '600' },
  relative: { color: '#61758a', fontSize: 12, marginTop: 2 },
  hall: { color: '#61758a', fontSize: 13, marginBottom: 6 },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  seatLabel: { color: '#526b82', fontSize: 14 },
  seatPrice: { color: '#526b82', fontSize: 14 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#dce6f1',
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: { color: '#17324d', fontSize: 15, fontWeight: '600' },
  totalPrice: { color: '#17324d', fontSize: 15, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#dce6f1',
    paddingTop: 14,
  },
  footerInfo: { flex: 1, paddingRight: 12 },
  status: { color: '#4caf50', fontSize: 13, fontWeight: '600', marginTop: 8 },
  qrBlock: { alignItems: 'center' },
  ticketCode: {
    color: '#61758a',
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 2,
  },
});
