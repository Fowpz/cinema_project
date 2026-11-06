// Форма добавления фильма и связанных с ним сеансов.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SelectField from '../../../components/SelectField';
import PosterPicker from './PosterPicker';
import ShowtimeFields from './ShowtimeFields';
import { AGE_RATINGS } from '../options';
import { toDateId } from '../../../utils/format';

function createDefaultShowtime(hallId) {
  return { hallId, date: toDateId(new Date()), time: '18:00', price: 300 };
}

export default function MovieForm({ halls, refreshKey, saving, message, onSubmit }) {
  const [title, setTitle] = useState('');
  const [ageRating, setAgeRating] = useState('12+');
  const [description, setDescription] = useState('');
  const [posterImage, setPosterImage] = useState(null);
  const [duration, setDuration] = useState('120');
  const [genres, setGenres] = useState('');
  const [showtimes, setShowtimes] = useState(() =>
    halls[0] ? [createDefaultShowtime(halls[0].id)] : [],
  );

  const updateShowtime = (index, patch) => {
    setShowtimes((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };
  const submit = async () => {
    const saved = await onSubmit({
      title, ageRating, description, posterImage,
      durationMin: Number(duration), genres, showtimes,
    });
    if (!saved) return;
    setTitle('');
    setAgeRating('12+');
    setDescription('');
    setPosterImage(null);
    setDuration('120');
    setGenres('');
    if (halls[0]) setShowtimes([createDefaultShowtime(halls[0].id)]);
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Фильм</Text>
        <TextInput style={styles.input} placeholder="Название фильма" placeholderTextColor="#7890a4" value={title} onChangeText={setTitle} />
        <SelectField label="Возрастной рейтинг" value={ageRating} options={AGE_RATINGS} onChange={setAgeRating} />
        <TextInput style={styles.input} placeholder="Длительность, мин" placeholderTextColor="#7890a4" keyboardType="number-pad" value={duration} onChangeText={setDuration} />
        <TextInput style={styles.input} placeholder="Жанры через запятую" placeholderTextColor="#7890a4" value={genres} onChangeText={setGenres} />
        <PosterPicker value={posterImage} onChange={setPosterImage} />
        <TextInput style={[styles.input, styles.description]} placeholder="Описание фильма" placeholderTextColor="#7890a4" multiline value={description} onChangeText={setDescription} />
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Сеансы</Text>
          <Pressable onPress={() => halls[0] && setShowtimes((items) => [...items, createDefaultShowtime(halls[0].id)])}>
            <Text style={styles.add}>+ Добавить</Text>
          </Pressable>
        </View>
        {showtimes.map((showtime, index) => (
          <View key={index} style={styles.showtime}>
            <ShowtimeFields value={showtime} halls={halls} durationMin={Number(duration) || 0} refreshKey={refreshKey} onChange={(patch) => updateShowtime(index, patch)} />
            {showtimes.length > 1 && (
              <Pressable onPress={() => setShowtimes((items) => items.filter((_, i) => i !== index))}>
                <Text style={styles.remove}>Удалить сеанс</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
      <Pressable style={[styles.save, (saving || !halls.length) && styles.disabled]} disabled={saving || !halls.length} onPress={submit}>
        <Text style={styles.saveText}>{saving ? 'Сохраняем…' : 'Добавить фильм в афишу'}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce6f1', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#90a8bd', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#17324d', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  add: { color: '#2589bd', fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cddce8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#17324d', fontSize: 15, marginBottom: 10 },
  description: { minHeight: 100, textAlignVertical: 'top' },
  showtime: { borderTopWidth: 1, borderTopColor: '#e4edf4', paddingTop: 14, marginTop: 4 },
  remove: { color: '#d95c5c', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  message: { color: '#2589bd', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  save: { backgroundColor: '#4fc3f7', borderRadius: 12, padding: 15, alignItems: 'center' },
  disabled: { opacity: 0.55 },
  saveText: { color: '#17324d', fontWeight: '800', fontSize: 16 },
});
