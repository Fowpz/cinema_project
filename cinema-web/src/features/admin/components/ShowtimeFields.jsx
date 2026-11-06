// Поля сеанса: зал, дата, время и цена; показывает занятость зала.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SelectField from '../../../components/SelectField';
import { api } from '../../../services/api';
import { buildDateOptions, HOURS } from '../options';

// Час недоступен, если он уже прошёл или новый сеанс не успеет закончиться
// до начала следующего, либо начнётся раньше, чем закончится предыдущий.
function isHourAvailable(date, time, durationMin, hallShowtimes) {
  const start = new Date(`${date}T${time}:00`);
  if (start <= new Date()) return false;
  const end = new Date(start.getTime() + Math.max(durationMin, 1) * 60000);
  return !hallShowtimes.some(
    (showtime) =>
      new Date(showtime.startsAt) < end && new Date(showtime.endsAt) > start,
  );
}

// Поля одного сеанса: зал, дата, час начала и цена.
export default function ShowtimeFields({
  value,
  halls,
  durationMin,
  refreshKey,
  onChange,
}) {
  const dateOptions = useMemo(() => buildDateOptions(), []);
  const [showtimes, setShowtimes] = useState([]);

  useEffect(() => {
    let isActive = true;
    api
      .getAdminShowtimes(value.date)
      .then((data) => {
        if (isActive) setShowtimes(data);
      })
      .catch(() => {
        if (isActive) setShowtimes([]);
      });
    return () => {
      isActive = false;
    };
  }, [value.date, refreshKey]);

  const hallShowtimes = showtimes.filter(
    (showtime) => showtime.hallId === value.hallId,
  );
  const selectedAvailable = isHourAvailable(
    value.date,
    value.time,
    durationMin,
    hallShowtimes,
  );

  return (
    <View>
      <Text style={styles.label}>Зал</Text>
      <View style={styles.chips}>
        {halls.map((hall) => (
          <Pressable
            key={hall.id}
            style={[
              styles.chip,
              hall.id === value.hallId && styles.chipActive,
            ]}
            onPress={() => onChange({ hallId: hall.id })}
          >
            <Text
              style={[
                styles.chipText,
                hall.id === value.hallId && styles.chipTextActive,
              ]}
            >
              {hall.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <SelectField
        label="Дата сеанса"
        value={value.date}
        options={dateOptions}
        onChange={(date) => onChange({ date })}
      />

      <Text style={styles.label}>Час начала</Text>
      <View style={styles.chips}>
        {HOURS.map((time) => {
          const available = isHourAvailable(
            value.date,
            time,
            durationMin,
            hallShowtimes,
          );
          const selected = time === value.time;
          return (
            <Pressable
              key={time}
              disabled={!available}
              style={[
                styles.hour,
                selected && styles.chipActive,
                !available && styles.hourBusy,
              ]}
              onPress={() => onChange({ time })}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextActive,
                  !available && styles.hourBusyText,
                ]}
              >
                {time}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!selectedAvailable && (
        <Text style={styles.warning}>
          {value.time} недоступно: время прошло или фильм пересекается с другим
          сеансом. Дополнительный час до или после не резервируется.
        </Text>
      )}

      {hallShowtimes.length > 0 && (
        <View style={styles.busyList}>
          <Text style={styles.label}>
            Занято только на время показа:
          </Text>
          {hallShowtimes.map((showtime) => (
            <Text key={showtime.id} style={styles.busyItem}>
              {showtime.startsAt.slice(11)}–{showtime.endsAt.slice(11)} «
              {showtime.movieTitle}»
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.label}>Цена, ₽</Text>
      <TextInput
        style={styles.input}
        value={String(value.price)}
        onChangeText={(price) => onChange({ price: Number(price) || 0 })}
        keyboardType="number-pad"
        placeholder="Цена, ₽"
        placeholderTextColor="#7890a4"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#61758a', fontSize: 13, marginBottom: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  hour: {
    width: 62,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f3f7fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e4ec',
  },
  chipActive: { backgroundColor: '#e3f2fd', borderColor: '#9dcbe6' },
  chipText: { color: '#61758a', fontSize: 13 },
  chipTextActive: { color: '#2589bd', fontWeight: '700' },
  hourBusy: { backgroundColor: '#eceff2', borderColor: '#eceff2' },
  hourBusyText: { color: '#b4bfc9', textDecorationLine: 'line-through' },
  warning: { color: '#d95c5c', fontSize: 13, marginBottom: 12 },
  busyList: { marginBottom: 12 },
  busyItem: { color: '#526b82', fontSize: 13, marginBottom: 3 },
  input: {
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
});
